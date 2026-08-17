import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { RESERVED_SLUGS } from "@/lib/slug";
import RsvpFlow from "./RsvpFlow";

export const dynamic = "force-dynamic";

async function getAffiliate(slug: string) {
  if (RESERVED_SLUGS.has(slug.toLowerCase())) return null;
  const rows = await sql`
    select a.id, a.slug, a.display_name,
      (select count(*)::int from rsvps r where r.affiliate_id = a.id) as rsvp_count,
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
        <div className="score">
          <span className="scoreLabel">RSVPs brought in</span>
          <span className="scoreNum">{affiliate.rsvp_count}</span>
        </div>
      </div>

      <RsvpFlow
        affiliateSlug={affiliate.slug}
        affiliateName={affiliate.display_name}
        totalRsvpCount={affiliate.total_rsvp_count}
      />

      <style>{`
        .wrap {
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 48px 20px 80px;
          background:
            radial-gradient(circle at 15% 10%, rgba(111,9,137,0.10), transparent 45%),
            var(--ivory);
        }
        .badge {
          width: 100%;
          max-width: 560px;
          background: var(--ink);
          color: var(--ivory);
          border-radius: 18px;
          padding: 32px 28px 26px;
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
            rgba(111,9,137,0.06) 0px,
            rgba(111,9,137,0.06) 2px,
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
          font-size: clamp(34px, 8vw, 52px);
          letter-spacing: 0.01em;
          margin: 6px 0 20px;
          text-transform: uppercase;
        }
        .score {
          display: inline-flex;
          align-items: baseline;
          gap: 12px;
          background: var(--ink-soft);
          border-radius: 12px;
          padding: 12px 22px;
        }
        .scoreLabel {
          font-family: var(--font-mono);
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: rgba(255,255,255,0.6);
        }
        .scoreNum {
          font-family: var(--font-mono);
          font-weight: 700;
          font-size: 32px;
          color: var(--amber);
          font-variant-numeric: tabular-nums;
        }
      `}</style>
    </main>
  );
}
