import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { RESERVED_SLUGS, isValidSlugFormat } from "@/lib/slug";
import { isRateLimited } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  // Generous limit — legit typing can fire this many times in one signup
  // (debounced per keystroke), but this still stops scripted enumeration.
  if (isRateLimited(`check-slug:${ip}`, 30, 5 * 60 * 1000)) {
    return NextResponse.json({ available: false, reason: "rate_limited" }, { status: 429 });
  }

  const slug = (req.nextUrl.searchParams.get("slug") || "").toLowerCase().trim();

  if (!isValidSlugFormat(slug)) {
    return NextResponse.json({ available: false, reason: "invalid_format" });
  }
  if (RESERVED_SLUGS.has(slug)) {
    return NextResponse.json({ available: false, reason: "reserved" });
  }

  const rows = await sql`select 1 from affiliates where lower(slug) = ${slug} limit 1`;
  return NextResponse.json({ available: rows.length === 0, reason: rows.length ? "taken" : null });
}
