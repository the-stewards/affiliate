import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { isRateLimited } from "@/lib/rateLimit";
import { isValidEmail } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  // Tighter than signup/RSVP — this is a lookup, not something a real user
  // needs to hit often, so a low cap makes email-guessing impractical
  // without affecting anyone legitimately looking for their own link.
  if (await isRateLimited(`link-lookup:${ip}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const { email, website } = body as { email?: string; website?: string };

  // Honeypot — pretend not-found instead of success here, since a bot that
  // gets back a fake link on every request learns nothing either way.
  if (website) {
    return NextResponse.json({ error: "No ambassador found with that email." }, { status: 404 });
  }

  if (!email?.trim() || !isValidEmail(email.trim())) {
    return NextResponse.json({ error: "Enter the email you signed up with." }, { status: 400 });
  }

  const rows = await sql`
    select slug, display_name from affiliates where lower(email) = ${email.trim().toLowerCase()}
  `;

  const affiliate = rows[0];
  if (!affiliate) {
    return NextResponse.json({ error: "No ambassador found with that email." }, { status: 404 });
  }

  // Name + date only, never email/phone - this lookup is authenticated by
  // knowing the affiliate's own signup email, not by anything tying the
  // requester to the RSVPs themselves, so it shouldn't expose contact info
  // that let someone reach an attendee directly.
  const signups = await sql`
    select r.first_name, r.last_name, r.created_at
    from rsvps r
    join affiliates a on a.id = r.affiliate_id
    where lower(a.slug) = ${affiliate.slug.toLowerCase()}
    order by r.created_at desc
  `;

  return NextResponse.json({
    ok: true,
    slug: affiliate.slug,
    displayName: affiliate.display_name,
    signups: signups.map((s) => ({
      firstName: s.first_name,
      lastName: s.last_name,
      createdAt: s.created_at,
    })),
  });
}
