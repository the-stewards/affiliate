import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { RsvpsTable } from "../DataTable";
import { setLeaderboardVisibility, deleteAffiliate } from "../actions";
import { ConfirmButton } from "../ConfirmButton";

export const dynamic = "force-dynamic";

async function getAffiliate(slug: string) {
  const rows = await sql`
    select a.id, a.slug, a.display_name, a.email, a.phone, a.created_at, a.hidden_from_leaderboard,
      ref.slug as referred_by_slug,
      (select count(*)::int from rsvps r where r.affiliate_id = a.id) as rsvp_count
    from affiliates a
    left join affiliates ref on ref.id = a.referred_by_id
    where lower(a.slug) = ${slug.toLowerCase()}
  `;
  return rows[0] || null;
}

export default async function AffiliateDetailPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { error?: string; success?: string };
}) {
  const affiliate = await getAffiliate(params.slug);
  if (!affiliate) notFound();

  const [rsvps, referred] = await Promise.all([
    sql`
      select first_name, last_name, email, phone, created_at
      from rsvps
      where affiliate_id = ${affiliate.id}
      order by created_at desc
    `,
    sql`
      select slug, display_name, created_at,
        (select count(*)::int from rsvps r where r.affiliate_id = affiliates.id) as rsvp_count
      from affiliates
      where referred_by_id = ${affiliate.id}
      order by created_at desc
    `,
  ]);

  return (
    <main className="wrap">
      <Link href="/admin" className="back">
        ← Back to admin
      </Link>

      <div className="header">
        <span className="eyebrow">Affiliate</span>
        <h1>{affiliate.display_name}</h1>
        <div className="meta">
          <span>/{affiliate.slug}</span>
          <span>·</span>
          <span>{affiliate.email}</span>
          {affiliate.phone && (
            <>
              <span>·</span>
              <span>{affiliate.phone}</span>
            </>
          )}
        </div>
        <div className="metaRow">
          <span>Referred by: {affiliate.referred_by_slug || "—"}</span>
          <span>Joined: {new Date(affiliate.created_at).toLocaleDateString()}</span>
          <span>
            Leaderboard: <strong>{affiliate.hidden_from_leaderboard ? "Hidden" : "Visible"}</strong>
          </span>
        </div>
      </div>

      {searchParams.error && <p className="banner bannerError">{searchParams.error}</p>}
      {searchParams.success && <p className="banner bannerSuccess">{searchParams.success}</p>}

      <div className="actions">
        <form action={setLeaderboardVisibility}>
          <input type="hidden" name="slug" value={affiliate.slug} />
          <input type="hidden" name="hidden" value={affiliate.hidden_from_leaderboard ? "false" : "true"} />
          <button type="submit" className="secondaryBtn">
            {affiliate.hidden_from_leaderboard ? "Show on leaderboard" : "Hide from leaderboard"}
          </button>
        </form>
        <form action={deleteAffiliate}>
          <input type="hidden" name="slug" value={affiliate.slug} />
          <ConfirmButton
            type="submit"
            className="dangerBtn"
            confirmText={`Delete /${affiliate.slug}? This only works if they have 0 RSVPs and referred no one.`}
          >
            Delete affiliate
          </ConfirmButton>
        </form>
      </div>

      <div className="stats">
        <div className="stat">
          <span className="statLabel">RSVPs brought in</span>
          <span className="statNum">{affiliate.rsvp_count}</span>
        </div>
        <div className="stat">
          <span className="statLabel">People they referred</span>
          <span className="statNum">{referred.length}</span>
        </div>
      </div>

      {referred.length > 0 && (
        <section className="adminSection">
          <div className="sectionHead">
            <h2>Referred affiliates ({referred.length})</h2>
          </div>
          <div className="sectionBody">
            <table>
              <thead>
                <tr>
                  <th>Slug</th>
                  <th>Name</th>
                  <th>RSVPs</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {referred.map((r: any) => (
                  <tr key={r.slug}>
                    <td>
                      <Link href={`/admin/${r.slug}`} className="rowLink">
                        {r.slug}
                      </Link>
                    </td>
                    <td>{r.display_name}</td>
                    <td>{r.rsvp_count}</td>
                    <td>{new Date(r.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <RsvpsTable rows={rsvps as any} title={`RSVPs via ${affiliate.slug}`} showAffiliateColumn={false} />

      <style>{`
        .wrap {
          max-width: 1000px;
          margin: 0 auto;
          padding: 40px 20px 80px;
          font-family: var(--font-body);
          color: var(--ink);
        }
        .back {
          font-family: var(--font-mono);
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--slate);
          text-decoration: none;
        }
        .back:hover { color: var(--ink); }
        .header { margin: 20px 0 24px; }
        .eyebrow {
          font-family: var(--font-mono);
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--amber);
        }
        h1 {
          font-family: var(--font-display);
          font-weight: 400;
          font-size: clamp(28px, 6vw, 40px);
          text-transform: uppercase;
          margin: 4px 0 8px;
        }
        .meta, .metaRow {
          font-family: var(--font-mono);
          font-size: 13px;
          color: var(--slate);
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .metaRow { margin-top: 4px; gap: 20px; }
        .metaRow strong { color: var(--ink); }
        .banner {
          font-family: var(--font-mono);
          font-size: 13px;
          padding: 10px 14px;
          border-radius: 8px;
          margin-bottom: 16px;
        }
        .bannerError { background: #fee; color: #900; }
        .bannerSuccess { background: #efe; color: #060; }
        .actions { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 24px; }
        .secondaryBtn {
          font-family: var(--font-mono);
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          background: transparent;
          color: var(--ink);
          border: 1.5px solid var(--line);
          border-radius: 8px;
          padding: 9px 16px;
          cursor: pointer;
        }
        .secondaryBtn:hover { border-color: var(--amber); color: var(--amber); }
        .dangerBtn {
          font-family: var(--font-mono);
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          background: transparent;
          color: var(--rebel-red);
          border: 1.5px solid var(--rebel-red);
          border-radius: 8px;
          padding: 9px 16px;
          cursor: pointer;
        }
        .dangerBtn:hover { background: var(--rebel-red); color: #fff; }
        .stats { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
        .stat {
          flex: 1;
          min-width: 140px;
          background: var(--ink);
          color: var(--ivory);
          border-radius: 12px;
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .statLabel {
          font-family: var(--font-mono);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: rgba(255,255,255,0.6);
        }
        .statNum {
          font-family: var(--font-mono);
          font-weight: 700;
          font-size: 30px;
          font-variant-numeric: tabular-nums;
          color: var(--amber);
        }
        .adminSection {
          margin-bottom: 32px;
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 14px;
          overflow: hidden;
        }
        .sectionHead { padding: 16px 20px; }
        .sectionHead h2 {
          margin: 0;
          font-family: var(--font-display);
          font-weight: 400;
          font-size: 20px;
          text-transform: uppercase;
        }
        .sectionBody { padding: 0 20px 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 14px; }
        thead th {
          background: var(--ink);
          color: var(--ivory);
          font-family: var(--font-mono);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          text-align: left;
          padding: 10px 12px;
        }
        tbody td { padding: 10px 12px; border-bottom: 1px solid var(--line); }
        tbody tr:last-child td { border-bottom: none; }
        tbody tr:hover { background: rgba(111,9,137,0.04); }
        .rowLink { color: var(--amber); font-weight: 600; text-decoration: none; }
        .rowLink:hover { text-decoration: underline; }
      `}</style>
    </main>
  );
}
