import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { RESERVED_SLUGS } from "@/lib/slug";
import RsvpFlow from "./RsvpFlow";

export const dynamic = "force-dynamic";

// Static, not per-affiliate - the title/OG image are the same regardless of
// whose /[slug] link brought someone here, only the on-page badge changes.
export const metadata: Metadata = {
  title: "Rebel Event 2027: The Reveal",
  description: "Save your seat for the Rebel 2027 Launch Call — Wednesday, October 21, 2026.",
  openGraph: {
    title: "Rebel Event 2027: The Reveal",
    description: "Save your seat for the Rebel 2027 Launch Call — Wednesday, October 21, 2026.",
    images: ["/save-og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rebel Event 2027: The Reveal",
    description: "Save your seat for the Rebel 2027 Launch Call — Wednesday, October 21, 2026.",
    images: ["/save-og.png"],
  },
};

async function getAffiliate(slug: string) {
  if (RESERVED_SLUGS.has(slug.toLowerCase())) return null;
  const rows = await sql`
    select a.id, a.slug, a.display_name,
      (select count(*)::int from rsvps) as total_rsvp_count
    from affiliates a
    where lower(a.slug) = ${slug.toLowerCase()}
  `;
  return rows[0] || null;
}

export default async function AffiliatePage({ params }: { params: { slug: string } }) {
  const affiliate = await getAffiliate(params.slug);
  if (!affiliate) notFound();

  return (
    <main className="wrap">
      <div className="badge">
        <span className="eyebrow">You're invited by</span>
        <h1 className="name">{affiliate.display_name}</h1>
      </div>

      <RsvpFlow
        affiliateSlug={affiliate.slug}
        affiliateName={affiliate.display_name}
        totalRsvpCount={affiliate.total_rsvp_count}
      />

      <div className="announce">
        <p>
          Join us live as we reveal the Rebel 2027 dates, unveil our new venue, announce this year&rsquo;s speaker
          lineup, and give you the first look at what we&rsquo;re building.
        </p>
        <p className="punch">New dates. New venue. New speakers.</p>
        <p>We&rsquo;ve been building this for a while.</p>
        <p className="closer">Now it&rsquo;s time to show you.</p>
      </div>

      <style
        // dangerouslySetInnerHTML, not children - `content: "";` below has a
        // literal quote, and <style> is a RAWTEXT element the browser never
        // entity-decodes. React's normal text-child escaping turns that quote
        // into &quot; in the server HTML, which the browser then takes
        // literally, causing a hydration mismatch on every single page load
        // (this affects every affiliate's personal /[slug] page - the exact
        // page every RSVP starts on). Setting innerHTML directly avoids the
        // escape/decode round trip entirely. See app/save/page.tsx for the
        // same fix, found while wiring up its links.
        dangerouslySetInnerHTML={{
          __html: `
        .wrap {
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 48px 20px 80px;
          background:
            radial-gradient(circle at 15% 10%, rgba(178,65,248,0.10), transparent 45%),
            var(--ivory);
        }
        .badge {
          width: 100%;
          max-width: 560px;
          background: var(--ink);
          color: var(--ivory);
          border-radius: 18px;
          padding: 16px 28px 13px;
          text-align: center;
          box-shadow: 0 18px 40px rgba(0,0,0,0.28);
          position: relative;
          overflow: hidden;
        }
        .badge::before {
          content: "";
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            135deg,
            rgba(178,65,248,0.06) 0px,
            rgba(178,65,248,0.06) 2px,
            transparent 2px,
            transparent 14px
          );
          pointer-events: none;
        }
        .eyebrow {
          font-family: var(--font-mono);
          font-size: 13px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--amber);
        }
        .name {
          font-family: var(--font-display);
          font-weight: 400;
          font-size: clamp(18px, 4vw, 26px);
          letter-spacing: 0.01em;
          margin: 3px 0 0;
          text-transform: uppercase;
        }
        .announce {
          width: 100%;
          max-width: 560px;
          margin-top: 32px;
          text-align: center;
        }
        .announce p {
          font-size: 15px;
          line-height: 1.6;
          color: var(--slate);
          margin: 0 0 14px;
        }
        .announce .punch {
          font-family: var(--font-display);
          font-size: clamp(20px, 4.5vw, 26px);
          text-transform: uppercase;
          color: var(--amber);
          letter-spacing: 0.01em;
          line-height: 1.3;
          margin: 0 0 14px;
        }
        .announce .closer {
          font-weight: 700;
          color: var(--ink);
          margin: 0;
        }
      `,
        }}
      />
    </main>
  );
}
