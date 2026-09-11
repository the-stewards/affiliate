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
    select r.first_name, r.last_name, r.email, r.phone, r.sms_consent, r.created_at,
      a.slug as affiliate_slug, a.display_name as affiliate_name
    from rsvps r
    join affiliates a on a.id = r.affiliate_id
    order by r.created_at desc
  `;

  const header = ["First Name", "Last Name", "Email", "Phone", "SMS Consent", "Affiliate", "Affiliate Name", "RSVP Date"];
  const lines = [header.map(csvField).join(",")];

  for (const r of rows as any[]) {
    lines.push(
      [
        csvField(r.first_name),
        csvField(r.last_name),
        csvField(r.email),
        csvField(r.phone),
        csvField(r.sms_consent ? "Yes" : "No"),
        csvField(r.affiliate_slug),
        csvField(r.affiliate_name),
        csvField(new Date(r.created_at).toISOString().slice(0, 10)),
      ].join(",")
    );
  }

  const csv = lines.join("\r\n");
  const filename = `rebel-rsvps-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
