import { sql } from "@/lib/db";
import { addRootAffiliate } from "./actions";
import { AffiliatesTable, RsvpsTable } from "./DataTable";
import { AutoRefresh } from "./AutoRefresh";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string };
}) {
  const [affiliateRows, rsvpRows, counts] = await Promise.all([
    sql`
      select a.slug, a.display_name, a.email, a.created_at, a.hidden_from_leaderboard,
        ref.slug as referred_by_slug,
        (select count(*)::int from rsvps r where r.affiliate_id = a.id) as rsvp_count
      from affiliates a
      left join affiliates ref on ref.id = a.referred_by_id
      order by rsvp_count desc, a.created_at asc
    `,
    sql`
      select r.first_name, r.last_name, r.email, r.phone, r.created_at, a.slug as affiliate_slug
      from rsvps r
      join affiliates a on a.id = r.affiliate_id
      order by r.created_at desc
      limit 100
    `,
    sql`
      select
        (select count(*)::int from affiliates) as affiliate_count,
        (select count(*)::int from rsvps) as rsvp_count,
        (select count(*)::int from rsvps where created_at > now() - interval '1 hour') as rsvp_last_hour
    `,
  ]);

  const stats = counts[0];

  return (
    <main className="wrap">
      <div className="topRow">
        <div>
          <h1>Rebel Admin</h1>
          <p className="sub">Rebel Ambassador Games — live operations</p>
        </div>
        <AutoRefresh />
      </div>

      <div className="stats">
        <div className="stat">
          <span className="statLabel">Affiliates</span>
          <span className="statNum">{stats.affiliate_count}</span>
        </div>
        <div className="stat">
          <span className="statLabel">Total RSVPs</span>
          <span className="statNum">{stats.rsvp_count}</span>
        </div>
        <div className="stat stat-accent">
          <span className="statLabel">Last hour</span>
          <span className="statNum">{stats.rsvp_last_hour}</span>
        </div>
      </div>

      {searchParams.error && <p className="banner bannerError">{searchParams.error}</p>}
      {searchParams.success && <p className="banner bannerSuccess">{searchParams.success}</p>}

      <section className="adminSection">
        <div className="sectionHead">
          <h2>Add root affiliate</h2>
        </div>
        <div className="sectionBody">
          <form action={addRootAffiliate} className="addForm">
            <label>
              Name
              <input name="name" required />
            </label>
            <label>
              Email
              <input name="email" type="email" required />
            </label>
            <label>
              Phone
              <input name="phone" />
            </label>
            <label>
              Slug
              <input name="slug" required />
            </label>
            <button type="submit">Add</button>
          </form>
        </div>
      </section>

      <AffiliatesTable rows={affiliateRows as any} />

      <RsvpsTable rows={rsvpRows as any} />

      <style>{`
        .wrap {
          max-width: 1000px;
          margin: 0 auto;
          padding: 40px 20px 80px;
          font-family: var(--font-body);
          color: var(--ink);
        }
        .topRow {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }
        h1 {
          font-family: var(--font-display);
          font-weight: 400;
          font-size: clamp(28px, 5vw, 38px);
          text-transform: uppercase;
          margin: 0;
        }
        .sub {
          font-family: var(--font-mono);
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--amber);
          margin: 4px 0 0;
        }
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
        }
        .stat-accent .statNum { color: var(--rebel-red); }
        .banner {
          font-family: var(--font-mono);
          font-size: 13px;
          padding: 10px 14px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .bannerError { background: #fee; color: #900; }
        .bannerSuccess { background: #efe; color: #060; }
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
        .addForm { display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end; }
        .addForm label {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-family: var(--font-mono);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--slate);
        }
        .addForm input {
          font-family: var(--font-body);
          font-size: 14px;
          padding: 9px 12px;
          border: 1px solid var(--line);
          border-radius: 8px;
          min-width: 160px;
        }
        .addForm input:focus { outline: 2px solid var(--amber); outline-offset: 1px; }
        .addForm button {
          font-family: var(--font-mono);
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          background: var(--rebel-red);
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 10px 20px;
          cursor: pointer;
        }
        .addForm button:hover { opacity: 0.9; }
      `}</style>
    </main>
  );
}
