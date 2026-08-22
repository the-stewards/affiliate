import { sql } from "@/lib/db";

// Postgres-backed rate limit, so the cap actually holds across Netlify's
// multiple concurrent function instances - an in-memory counter resets per
// instance and per cold start, so a request spread across instances could
// otherwise blow past the intended limit unnoticed. The upsert is atomic
// (single statement, ON CONFLICT), so concurrent hits on the same key can't
// race each other into under-counting.
export async function isRateLimited(key: string, max: number, windowMs: number): Promise<boolean> {
  const rows = await sql`
    insert into rate_limits (key, count, window_start)
    values (${key}, 1, now())
    on conflict (key) do update set
      count = case
        when now() - rate_limits.window_start > (${windowMs} * interval '1 millisecond')
        then 1
        else rate_limits.count + 1
      end,
      window_start = case
        when now() - rate_limits.window_start > (${windowMs} * interval '1 millisecond')
        then now()
        else rate_limits.window_start
      end
    returning count
  `;
  return rows[0].count > max;
}
