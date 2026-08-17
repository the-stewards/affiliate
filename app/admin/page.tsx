import { sql } from "@/lib/db";
import { addRootAffiliate } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string };
}) {
  const [affiliateRows, rsvpRows, counts] = await Promise.all([
    sql`
      select a.slug, a.display_name, a.email, a.created_at,
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
        (select count(*)::int from rsvps) as rsvp_count
    `,
  ]);

  const stats = counts[0];

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "40px 20px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ marginBottom: 4 }}>Rebel Admin</h1>
      <p style={{ color: "#666", marginBottom: 24 }}>
        {stats.affiliate_count} affiliates · {stats.rsvp_count} RSVPs
      </p>

      {searchParams.error && (
        <p style={{ background: "#fee", color: "#900", padding: "10px 14px", borderRadius: 8, marginBottom: 20 }}>
          {searchParams.error}
        </p>
      )}
      {searchParams.success && (
        <p style={{ background: "#efe", color: "#060", padding: "10px 14px", borderRadius: 8, marginBottom: 20 }}>
          {searchParams.success}
        </p>
      )}

      <section style={{ marginBottom: 40 }}>
        <h2>Add root affiliate</h2>
        <form
          action={addRootAffiliate}
          style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}
        >
          <label>
            Name
            <br />
            <input name="name" required />
          </label>
          <label>
            Email
            <br />
            <input name="email" type="email" required />
          </label>
          <label>
            Phone
            <br />
            <input name="phone" />
          </label>
          <label>
            Slug
            <br />
            <input name="slug" required />
          </label>
          <button type="submit">Add</button>
        </form>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2>Affiliates ({affiliateRows.length})</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #ddd" }}>
              <th style={{ padding: 8 }}>Slug</th>
              <th style={{ padding: 8 }}>Name</th>
              <th style={{ padding: 8 }}>Email</th>
              <th style={{ padding: 8 }}>RSVPs</th>
              <th style={{ padding: 8 }}>Referred by</th>
              <th style={{ padding: 8 }}>Joined</th>
            </tr>
          </thead>
          <tbody>
            {affiliateRows.map((a: any) => (
              <tr key={a.slug} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: 8 }}>{a.slug}</td>
                <td style={{ padding: 8 }}>{a.display_name}</td>
                <td style={{ padding: 8 }}>{a.email}</td>
                <td style={{ padding: 8 }}>{a.rsvp_count}</td>
                <td style={{ padding: 8 }}>{a.referred_by_slug || "—"}</td>
                <td style={{ padding: 8 }}>{new Date(a.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Recent RSVPs ({rsvpRows.length})</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #ddd" }}>
              <th style={{ padding: 8 }}>Name</th>
              <th style={{ padding: 8 }}>Email</th>
              <th style={{ padding: 8 }}>Phone</th>
              <th style={{ padding: 8 }}>Affiliate</th>
              <th style={{ padding: 8 }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {rsvpRows.map((r: any, i: number) => (
              <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: 8 }}>
                  {r.first_name} {r.last_name}
                </td>
                <td style={{ padding: 8 }}>{r.email}</td>
                <td style={{ padding: 8 }}>{r.phone || "—"}</td>
                <td style={{ padding: 8 }}>{r.affiliate_slug}</td>
                <td style={{ padding: 8 }}>{new Date(r.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
