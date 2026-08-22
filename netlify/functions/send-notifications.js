// Scheduled function (see netlify.toml) — flushes the notifications queue
// to Zapier on its own cadence, completely decoupled from RSVP/signup
// request latency.
//
// Safe to run concurrently with itself: the claim below is a single atomic
// UPDATE with FOR UPDATE SKIP LOCKED, so if two runs ever overlap (e.g. a
// backlog makes one run take longer than the 1-minute schedule), the second
// run skips any row the first has already claimed instead of grabbing the
// same row and double-posting it to Zapier.
const { neon } = require("@neondatabase/serverless");

exports.handler = async () => {
  const zapierUrl = process.env.ZAPIER_WEBHOOK_URL;
  if (!zapierUrl) {
    return { statusCode: 200, body: "No ZAPIER_WEBHOOK_URL set, nothing to flush." };
  }

  const sql = neon(process.env.DATABASE_URL);

  const pending = await sql`
    update notifications
    set attempts = attempts + 1
    where id in (
      select id
      from notifications
      where sent_at is null and attempts < 5
      order by created_at asc
      limit 25
      for update skip locked
    )
    returning id, event, payload
  `;

  // attempts was already incremented as part of the claim above, so the
  // only thing left to do on success is mark it sent - a failure just
  // leaves it as-is (already counted) for the next run to retry.
  let sent = 0;
  for (const row of pending) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(zapierUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: row.event, ...row.payload, timestamp: new Date().toISOString() }),
        signal: controller.signal,
      });
      if (res.ok) {
        await sql`update notifications set sent_at = now() where id = ${row.id}`;
        sent++;
      }
    } catch (err) {
      console.error("Notification send failed:", row.id, err);
    } finally {
      clearTimeout(timeout);
    }
  }

  return { statusCode: 200, body: `Sent ${sent}/${pending.length} queued notification(s).` };
};
