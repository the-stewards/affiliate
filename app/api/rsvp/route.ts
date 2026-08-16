import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { queueNotification } from "@/lib/zapier";
import { isRateLimited } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  // Generous enough that a group RSVPing from the same venue/office wifi
  // (shared IP) won't trip it, while still stopping a scripted flood.
  if (isRateLimited(`rsvp:${ip}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many submissions from this connection. Try again later." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { firstName, lastName, email, phone, smsConsent, affiliateSlug, website } = body as {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    smsConsent?: boolean;
    affiliateSlug?: string;
    website?: string; // honeypot field — real users never fill this in
  };

  // Honeypot: bots that fill every field will populate this hidden input.
  // Pretend success so the bot doesn't learn to avoid it.
  if (website) {
    return NextResponse.json({ ok: true });
  }

  if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !affiliateSlug?.trim()) {
    return NextResponse.json(
      { error: "First name, last name, email, and affiliate are required." },
      { status: 400 }
    );
  }

  const emailNormalized = email.trim().toLowerCase();

  const affiliateRows = await sql`
    select id, slug, display_name, email from affiliates where lower(slug) = ${affiliateSlug.toLowerCase()}
  `;
  const affiliate = affiliateRows[0];
  if (!affiliate) {
    return NextResponse.json({ error: "This affiliate link isn't valid." }, { status: 404 });
  }

  // Self-RSVP guard: an affiliate can't RSVP themselves on their own page.
  if (String(affiliate.email).toLowerCase() === emailNormalized) {
    return NextResponse.json(
      { error: "You can't RSVP yourself — invite someone else, or have them use your link." },
      { status: 400 }
    );
  }

  try {
    const inserted = await sql`
      insert into rsvps (affiliate_id, first_name, last_name, email, phone, sms_consent)
      values (${affiliate.id}, ${firstName.trim()}, ${lastName.trim()}, ${emailNormalized}, ${phone?.trim() || null}, ${!!smsConsent})
      returning id, created_at
    `;

    const countRows = await sql`
      select count(*)::int as count from rsvps where affiliate_id = ${affiliate.id}
    `;

    // Field names match the Google Sheet columns this feeds into via
    // Zapier: First Name, Last Name, Email, Phone, RSVP date, Affiliate ref code.
    await queueNotification("new_rsvp", {
      affiliate_name: affiliate.display_name,
      affiliate_slug: affiliate.slug,
      rsvp_first_name: firstName.trim(),
      rsvp_last_name: lastName.trim(),
      rsvp_email: emailNormalized,
      rsvp_phone: phone?.trim() || null,
      rsvp_date: inserted[0]?.created_at ?? new Date().toISOString(),
      affiliate_total_count: countRows[0]?.count ?? null,
    });

    return NextResponse.json({ ok: true, rsvpId: inserted[0]?.id });
  } catch (err: any) {
    // Unique constraint on lower(email) — this person already RSVP'd
    // (possibly under a different affiliate). First one in wins.
    if (String(err?.message || "").includes("rsvps_email_lower_idx")) {
      return NextResponse.json(
        { error: "This email has already RSVP'd through another link." },
        { status: 409 }
      );
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
