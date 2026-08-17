import { sql } from "@/lib/db";
import RsvpFlow from "../[slug]/RsvpFlow";

export const dynamic = "force-dynamic";

// Affiliate credited when the embed loads with no `?ref=` (or an invalid
// one) - e.g. someone visits the Squarespace hub page directly rather than
// through a specific affiliate's share. Keeps every RSVP attributable
// instead of erroring out.
const FALLBACK_SLUG = process.env.EMBED_FALLBACK_SLUG || "nick";

async function getAffiliate(slug: string) {
  const rows = await sql`
    select slug, display_name from affiliates where lower(slug) = ${slug.toLowerCase()}
  `;
  return rows[0] || null;
}

export default async function EmbedPage({ searchParams }: { searchParams: { ref?: string } }) {
  const ref = (searchParams.ref || "").trim();
  const affiliate = (ref && (await getAffiliate(ref))) || (await getAffiliate(FALLBACK_SLUG));

  if (!affiliate) {
    return (
      <p style={{ fontFamily: "system-ui, sans-serif", padding: 20, color: "#900" }}>
        RSVP form isn&rsquo;t configured yet — no affiliate found.
      </p>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <RsvpFlow affiliateSlug={affiliate.slug} affiliateName={affiliate.display_name} showIntro={false} />
    </div>
  );
}
