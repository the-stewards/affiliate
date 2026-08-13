// Scheduled function (see netlify.toml) — flushes the notifications queue
// to Zapier on its own cadence, completely decoupled from RSVP/signup
// request latency. Safe to run concurrently with itself: each row is only
// marked sent after a successful POST, and failed rows just get retried
// (up to a cap) on the next run.
const { neon } = require("@neondatabase/serverless");

exports.handler = async () => {
  const zapierUrl = process.env.ZAPIER_WEBHOOK_URL;
  if (!zapierUrl) {
    return { statusCode: 200, body: "No ZAPIER_WEBHOOK_URL set, nothing to flush." };
  }

  const sql = neon(process.env.DATABASE_URL);

  const pending = await sql`
    select id, event, payload
    from notifications
    where sent_at is null and attempts < 5
    order by created_at asc
    limit 25
  `;

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
      } else {
        await sql`update notifications set attempts = attempts + 1 where id = ${row.id}`;
      }
    } catch (err) {
      console.error("Notification send failed:", row.id, err);
      await sql`update notifications set attempts = attempts + 1 where id = ${row.id}`;
    } finally {
      clearTimeout(timeout);
    }
  }

  return { statusCode: 200, body: `Sent ${sent}/${pending.length} queued notification(s).` };
};
