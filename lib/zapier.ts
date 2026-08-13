import { sql } from "@/lib/db";

// Queues a notification instead of calling Zapier inline. The RSVP/signup
// response must never wait on a third party's latency or uptime — this is
// a single fast local insert, nothing more. Delivery happens out-of-band
// via the scheduled function at netlify/functions/send-notifications.js,
// which runs on its own cadence regardless of request traffic.
export async function queueNotification(event: string, payload: Record<string, unknown>) {
  await sql`
    insert into notifications (event, payload)
    values (${event}, ${JSON.stringify(payload)}::jsonb)
  `;
}
