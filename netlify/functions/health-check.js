// Scheduled function (see netlify.toml) — pings the live site on its own
// cadence and queues an alert (through the same notifications queue and
// Zap/GHL as RSVP/signup events) only when health CHANGES: once when it
// goes down, once when it recovers. Never re-alerts for an ongoing outage.
//
// Also checks for a stuck notification-delivery backlog on the same
// cadence, using the identical before/after state-change pattern - this is
// the exact failure mode that already happened once (Zapier silently
// disconnected, 18 RSVPs sat unsent with nobody noticing).
const { neon } = require("@neondatabase/serverless");

const CHECK_URL = "https://rebel-affiliate.netlify.app/api/leaderboard";

async function checkSiteHealth(sql) {
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
    return "Site down, alert queued.";
  }

  if (healthy && wasDown) {
    await sql`update health_state set is_down = false, updated_at = now() where id = 1`;
    await sql`
      insert into notifications (event, payload)
      values ('site_recovered', ${JSON.stringify({ checked_url: CHECK_URL })}::jsonb)
    `;
    return "Site recovered, alert queued.";
  }

  return healthy ? "Site healthy, no change." : "Site still down, no new alert.";
}

async function checkNotificationBacklog(sql) {
  // "Stuck" = exhausted all 5 retry attempts and still hasn't delivered to
  // at least one configured target - a row still mid-retry (attempts < 5)
  // isn't a backlog yet, just normal in-flight delivery.
  const [counts] = await sql`
    select
      count(*) filter (where sent_at is null)::int as zapier_stuck,
      count(*) filter (where ghl_sent_at is null)::int as ghl_stuck,
      count(*)::int as total_stuck
    from notifications
    where attempts >= 5 and (sent_at is null or ghl_sent_at is null)
  `;

  const isBacklogged = counts.total_stuck > 0;
  const stateRows = await sql`select notifications_backlogged from health_state where id = 1`;
  const wasBacklogged = stateRows[0]?.notifications_backlogged ?? false;

  if (isBacklogged && !wasBacklogged) {
    await sql`update health_state set notifications_backlogged = true, updated_at = now() where id = 1`;
    await sql`
      insert into notifications (event, payload)
      values ('notification_backlog', ${JSON.stringify({
        total_stuck: counts.total_stuck,
        zapier_stuck: counts.zapier_stuck,
        ghl_stuck: counts.ghl_stuck,
      })}::jsonb)
    `;
    return `Notification backlog detected (${counts.total_stuck}), alert queued.`;
  }

  if (!isBacklogged && wasBacklogged) {
    await sql`update health_state set notifications_backlogged = false, updated_at = now() where id = 1`;
    await sql`
      insert into notifications (event, payload)
      values ('notification_backlog_cleared', '{}'::jsonb)
    `;
    return "Notification backlog cleared, alert queued.";
  }

  return isBacklogged ? "Notification backlog still ongoing, no new alert." : "No notification backlog.";
}

exports.handler = async () => {
  const sql = neon(process.env.DATABASE_URL);

  const siteResult = await checkSiteHealth(sql);
  const backlogResult = await checkNotificationBacklog(sql);

  return { statusCode: 200, body: `${siteResult} ${backlogResult}` };
};
