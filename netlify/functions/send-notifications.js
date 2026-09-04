// Scheduled function (see netlify.toml) — flushes the notifications queue
// to Zapier and/or GHL on its own cadence, completely decoupled from
// RSVP/signup request latency.
//
// Safe to run concurrently with itself: the claim below is a single atomic
// UPDATE with FOR UPDATE SKIP LOCKED, so if two runs ever overlap (e.g. a
// backlog makes one run take longer than the 1-minute schedule), the second
// run skips any row the first has already claimed instead of grabbing the
// same row and double-posting it.
//
// The two targets are delivered and retried independently (sent_at for
// Zapier, ghl_sent_at for GHL) - a row is reselected as long as EITHER
// configured target hasn't received it yet, and each target is only
// POSTed to if its own column is still null. This means a slow/down target
// never causes a duplicate re-send to a target that already succeeded. If
// a target's env var isn't set, its column just never gets populated -
// harmless, the row stops being retried once `attempts` hits 5 either way.
const { neon } = require("@neondatabase/serverless");

async function postJson(url, body, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

exports.handler = async () => {
  const zapierUrl = process.env.ZAPIER_WEBHOOK_URL;
  const ghlUrl = process.env.GHL_WEBHOOK_URL;
  if (!zapierUrl && !ghlUrl) {
    return { statusCode: 200, body: "No webhook URLs set, nothing to flush." };
  }

  const sql = neon(process.env.DATABASE_URL);

  const pending = await sql`
    update notifications
    set attempts = attempts + 1
    where id in (
      select id
      from notifications
      where attempts < 5
        and (sent_at is null or ghl_sent_at is null)
      order by created_at asc
      limit 25
      for update skip locked
    )
    returning id, event, payload, sent_at, ghl_sent_at
  `;

  let zapierSent = 0;
  let ghlSent = 0;

  for (const row of pending) {
    const body = { event: row.event, ...row.payload, timestamp: new Date().toISOString() };

    if (zapierUrl && !row.sent_at) {
      try {
        const res = await postJson(zapierUrl, body);
        if (res.ok) {
          await sql`update notifications set sent_at = now() where id = ${row.id}`;
          zapierSent++;
        } else {
          console.error("Zapier send rejected:", row.id, res.status, await res.text().catch(() => ""));
        }
      } catch (err) {
        console.error("Zapier send failed:", row.id, err);
      }
    }

    if (ghlUrl && !row.ghl_sent_at) {
      try {
        const res = await postJson(ghlUrl, body);
        if (res.ok) {
          await sql`update notifications set ghl_sent_at = now() where id = ${row.id}`;
          ghlSent++;
        } else {
          console.error("GHL send rejected:", row.id, res.status, await res.text().catch(() => ""));
        }
      } catch (err) {
        console.error("GHL send failed:", row.id, err);
      }
    }
  }

  return {
    statusCode: 200,
    body: `Processed ${pending.length} queued notification(s) — Zapier: ${zapierSent}, GHL: ${ghlSent}.`,
  };
};
