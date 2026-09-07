import { sql } from "@/lib/db";
import RsvpFlow from "../../[slug]/RsvpFlow";

export const dynamic = "force-dynamic";

// Built for the Squarespace "Reveal" landing page (therebelevent.com/youtube)
// - a separate route from ../page.tsx (the original generic embed) rather
// than a new prop on it, so the existing embed's behavior is untouched
// wherever it's already in use. Same ?ref= attribution mechanism as the
// original: the parent Squarespace page reads its own URL's ?ref= and
// passes it through to this iframe's src.
const FALLBACK_SLUG = process.env.EMBED_FALLBACK_SLUG || "nick";

async function getAffiliate(slug: string) {
  const rows = await sql`
    select slug, display_name, (select count(*)::int from rsvps) as total_rsvp_count
    from affiliates where lower(slug) = ${slug.toLowerCase()}
  `;
  return rows[0] || null;
}

export default async function EmbedRevealPage({ searchParams }: { searchParams: { ref?: string } }) {
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
      <RsvpFlow
        affiliateSlug={affiliate.slug}
        affiliateName={affiliate.display_name}
        showIntro={true}
        condensed={true}
        totalRsvpCount={affiliate.total_rsvp_count}
      />
      {/* Transparent so the iframe blends into whatever the Squarespace page
          behind it looks like - only .card (the white form itself, from
          RsvpFlow's own styles) stays opaque. Scoped to this route only, not
          globals.css, since every other page relies on the ivory body bg. */}
      <style>{`
        html, body { background: transparent !important; }
      `}</style>
    </div>
  );
}
