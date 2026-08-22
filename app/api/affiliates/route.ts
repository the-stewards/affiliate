import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { queueNotification } from "@/lib/zapier";
import { isRateLimited } from "@/lib/rateLimit";
import { isValidEmail } from "@/lib/validate";
import { RESERVED_SLUGS, baseSlugFromName, isValidSlugFormat } from "@/lib/slug";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  // Same generous cap as /api/rsvp — see comment there.
  if (await isRateLimited(`affiliate-signup:${ip}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const { name, email, phone, requestedSlug, referredBySlug, website } = body as {
    name?: string;
    email?: string;
    phone?: string;
    requestedSlug?: string;
    referredBySlug?: string;
    website?: string; // honeypot
  };

  if (website) return NextResponse.json({ ok: true }); // silently drop bots

  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  }

  if (!isValidEmail(email.trim())) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const emailNormalized = email.trim().toLowerCase();

  let referredById: number | null = null;
  if (referredBySlug) {
    const rows = await sql`select id from affiliates where lower(slug) = ${referredBySlug.toLowerCase()}`;
    referredById = rows[0]?.id ?? null;
  }

  // Build the candidate slug list: user's own choice first (if valid & not
  // reserved), then the auto-generated firstname+lastinitial, then that with
  // an incrementing number.
  const candidates: string[] = [];
  if (requestedSlug && isValidSlugFormat(requestedSlug.toLowerCase())) {
    candidates.push(requestedSlug.toLowerCase());
  }
  const base = baseSlugFromName(name);
  candidates.push(base);
  for (let i = 2; i <= 20; i++) candidates.push(`${base}${i}`);

  for (const candidate of candidates) {
    if (RESERVED_SLUGS.has(candidate)) continue;

    try {
      const inserted = await sql`
        insert into affiliates (slug, display_name, email, phone, referred_by_id)
        values (${candidate}, ${name.trim()}, ${emailNormalized}, ${phone?.trim() || null}, ${referredById})
        returning id, slug
      `;

      await queueNotification("new_affiliate", {
        affiliate_name: name.trim(),
        affiliate_slug: inserted[0].slug,
        affiliate_email: emailNormalized,
        referred_by_slug: referredBySlug || null,
      });

      return NextResponse.json({ ok: true, slug: inserted[0].slug });
    } catch (err: any) {
      const msg = String(err?.message || "");
      // Slug taken — try the next candidate (handles the race-condition case
      // where two people grab the same slug at the same instant).
      if (msg.includes("affiliates_slug_lower_idx")) continue;
      // Email already an affiliate.
      if (msg.includes("affiliates_email_lower_idx")) {
        return NextResponse.json({ error: "This email is already registered as an affiliate." }, { status: 409 });
      }
      console.error(err);
      return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Couldn't generate an available link. Try a custom one." }, { status: 500 });
}
