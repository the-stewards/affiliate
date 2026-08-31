import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

// Sits under /admin so the existing Basic Auth middleware (matcher:
// "/admin/:path*") gates this without any separate auth logic.

function csvField(value: string | number | boolean | null): string {
  const s = value === null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET() {
  const rows = await sql`
    select a.slug, a.display_name, a.email, a.phone, a.created_at, a.hidden_from_leaderboard,
      ref.slug as referred_by_slug,
      (select count(*)::int from rsvps r where r.affiliate_id = a.id) as rsvp_count
    from affiliates a
    left join affiliates ref on ref.id = a.referred_by_id
    order by rsvp_count desc, a.created_at asc
  `;

  const header = ["Name", "Email", "Phone", "Slug", "RSVPs", "Referred By", "On Leaderboard", "Joined"];
  const lines = [header.map(csvField).join(",")];

  for (const r of rows as any[]) {
    lines.push(
      [
        csvField(r.display_name),
        csvField(r.email),
        csvField(r.phone),
        csvField(r.slug),
        csvField(r.rsvp_count),
        csvField(r.referred_by_slug),
        csvField(r.hidden_from_leaderboard ? "No" : "Yes"),
        csvField(new Date(r.created_at).toISOString().slice(0, 10)),
      ].join(",")
    );
  }

  const csv = lines.join("\r\n");
  const filename = `rebel-ambassadors-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
