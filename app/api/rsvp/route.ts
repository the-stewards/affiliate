import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { isRateLimited } from "@/lib/rateLimit";
import { isValidEmail } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

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

  if (!isValidEmail(email.trim())) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  // The checkbox is only required client-side by HTML form validation, which
  // a direct API call can skip - this is the compliance backstop that
  // actually matters, since providing a phone number without consent isn't
  // something that should be storable at all.
  if (phone?.trim() && !smsConsent) {
    return NextResponse.json(
      { error: "Please check the box to consent to texts, or leave the phone number blank." },
      { status: 400 }
    );
  }

  const emailNormalized = email.trim().toLowerCase();

  // Rate-limit check and affiliate lookup don't depend on each other, so run
  // them concurrently instead of one after another - this and the combined
  // insert below are what actually cut the perceived "did my phone freeze"
  // lag on submit, since Neon's HTTP driver pays a real network round trip
  // for every separate query.
  const [limited, affiliateRows] = await Promise.all([
    // Generous enough that a group RSVPing from the same venue/office wifi
    // (shared IP) won't trip it, while still stopping a scripted flood.
    isRateLimited(`rsvp:${ip}`, 20, 60 * 60 * 1000),
    sql`
      select id, slug, display_name, email,
        (select count(*)::int from rsvps r where r.affiliate_id = a.id) as current_count
      from affiliates a
      where lower(a.slug) = ${affiliateSlug.toLowerCase()}
    `,
  ]);

  if (limited) {
    return NextResponse.json(
      { error: "Too many submissions from this connection. Try again later." },
      { status: 429 }
    );
  }

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
    // Single round trip: insert the RSVP, then queue its Zapier notification
    // in the same statement via a CTE. Field names in the payload match the
    // Google Sheet columns this feeds into: First Name, Last Name, Email,
    // Phone, RSVP date, Affiliate ref code.
    const result = await sql`
      with new_rsvp as (
        insert into rsvps (affiliate_id, first_name, last_name, email, phone, sms_consent)
        values (${affiliate.id}, ${firstName.trim()}, ${lastName.trim()}, ${emailNormalized}, ${phone?.trim() || null}, ${!!smsConsent})
        returning id, created_at
      )
      insert into notifications (event, payload)
      select 'new_rsvp', jsonb_build_object(
        'affiliate_name', ${affiliate.display_name}::text,
        'affiliate_slug', ${affiliate.slug}::text,
        'rsvp_first_name', ${firstName.trim()}::text,
        'rsvp_last_name', ${lastName.trim()}::text,
        'rsvp_email', ${emailNormalized}::text,
        'rsvp_phone', ${phone?.trim() || null}::text,
        'rsvp_date', new_rsvp.created_at,
        'affiliate_total_count', ${affiliate.current_count + 1}::int,
        'save_calendar_link', 'https://join.therebelevent.com/save'
      )
      from new_rsvp
      returning (select id from new_rsvp) as rsvp_id
    `;

    return NextResponse.json({ ok: true, rsvpId: result[0]?.rsvp_id });
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
