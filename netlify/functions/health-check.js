// Scheduled function (see netlify.toml) — pings the live site on its own
// cadence and queues an alert (through the same notifications queue and
// Zap as RSVP/signup events) only when health CHANGES: once when it goes
// down, once when it recovers. Never re-alerts for an ongoing outage.
const { neon } = require("@neondatabase/serverless");

const CHECK_URL = "https://rebel-affiliate.netlify.app/api/leaderboard";

exports.handler = async () => {
  const sql = neon(process.env.DATABASE_URL);

  let healthy = false;
  let errorDetail = "";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(CHECK_URL, { signal: controller.signal });
    healthy = res.ok;
    if (!res.ok) errorDetail = `HTTP ${res.status}`;
  } catch (err) {
    errorDetail = String(err?.message || err);
  } finally {
    clearTimeout(timeout);
  }

  const stateRows = await sql`select is_down from health_state where id = 1`;
  const wasDown = stateRows[0]?.is_down ?? false;

  if (!healthy && !wasDown) {
    await sql`update health_state set is_down = true, updated_at = now() where id = 1`;
    await sql`
      insert into notifications (event, payload)
      values ('site_down', ${JSON.stringify({ error: errorDetail, checked_url: CHECK_URL })}::jsonb)
    `;
    return { statusCode: 200, body: "Site down, alert queued." };
  }

  if (healthy && wasDown) {
    await sql`update health_state set is_down = false, updated_at = now() where id = 1`;
    await sql`
      insert into notifications (event, payload)
      values ('site_recovered', ${JSON.stringify({ checked_url: CHECK_URL })}::jsonb)
    `;
    return { statusCode: 200, body: "Site recovered, alert queued." };
  }

  return { statusCode: 200, body: healthy ? "Healthy, no change." : "Still down, no new alert." };
};
