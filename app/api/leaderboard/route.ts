import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await sql`
    select
      a.slug,
      a.display_name,
      count(r.id)::int as rsvp_count
    from affiliates a
    left join rsvps r on r.affiliate_id = a.id
    where not a.hidden_from_leaderboard
    group by a.id, a.slug, a.display_name
    order by rsvp_count desc, a.created_at asc
  `;

  return NextResponse.json({ affiliates: rows });
}
