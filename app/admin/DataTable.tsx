"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

type Column<T> = {
  key: string;
  label: string;
  value: (row: T) => string | number;
  render?: (row: T) => ReactNode;
};

function Table<T extends { _key: string }>({
  title,
  rows,
  columns,
  defaultSortKey,
}: {
  title: string;
  rows: T[];
  columns: Column<T>[];
  defaultSortKey: string;
}) {
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState(defaultSortKey);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? rows.filter((row) => columns.some((col) => String(col.value(row)).toLowerCase().includes(q)))
      : rows;
    const col = columns.find((c) => c.key === sortKey) ?? columns[0];
    return [...base].sort((a, b) => {
      const av = col.value(a);
      const bv = col.value(b);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, query, sortKey, sortDir, columns]);

  function handleSort(key: string) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <section className="adminSection">
      <div className="sectionHead" onClick={() => setOpen((o) => !o)}>
        <span className="chevron">{open ? "▾" : "▸"}</span>
        <h2>
          {title} <span className="count">({rows.length})</span>
        </h2>
      </div>

      {open && (
        <div className="sectionBody">
          <input
            type="text"
            placeholder={`Search ${title.toLowerCase()}…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search"
          />
          <div className="tableScroll">
            <table>
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col.key} onClick={() => handleSort(col.key)}>
                      {col.label}
                      {sortKey === col.key ? (
                        <span className="sortArrow">{sortDir === "asc" ? " ▲" : " ▼"}</span>
                      ) : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row._key}>
                    {columns.map((col) => (
                      <td key={col.key}>{col.render ? col.render(row) : col.value(row)}</td>
                    ))}
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={columns.length} className="empty">
                      No matches.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`
        .adminSection {
          margin-bottom: 32px;
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 14px;
          overflow: hidden;
        }
        .sectionHead {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 16px 20px;
          cursor: pointer;
          user-select: none;
        }
        .sectionHead h2 {
          margin: 0;
          font-family: var(--font-display);
          font-weight: 400;
          font-size: 20px;
          text-transform: uppercase;
          letter-spacing: 0.01em;
        }
        .chevron { font-size: 13px; color: var(--slate); width: 12px; }
        .count { font-family: var(--font-mono); color: var(--slate); font-size: 14px; text-transform: none; letter-spacing: 0; }
        .sectionBody { padding: 0 20px 20px; }
        .search {
          font-family: var(--font-mono);
          font-size: 13px;
          padding: 9px 12px;
          width: 100%;
          max-width: 320px;
          border: 1px solid var(--line);
          border-radius: 8px;
          margin-bottom: 14px;
          background: var(--ivory);
        }
        .search:focus { outline: 2px solid var(--amber); outline-offset: 1px; }
        .tableScroll { max-height: 480px; overflow-y: auto; border: 1px solid var(--line); border-radius: 10px; }
        table { width: 100%; border-collapse: collapse; font-size: 14px; }
        thead th {
          position: sticky;
          top: 0;
          background: var(--ink);
          color: var(--ivory);
          font-family: var(--font-mono);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          text-align: left;
          padding: 10px 12px;
          cursor: pointer;
          user-select: none;
          white-space: nowrap;
        }
        .sortArrow { color: var(--rebel-red); }
        tbody td { padding: 10px 12px; border-bottom: 1px solid var(--line); }
        tbody tr:last-child td { border-bottom: none; }
        tbody tr:hover { background: rgba(178,65,248,0.04); }
        .empty { text-align: center; color: var(--slate); padding: 20px !important; }
        .rowLink { color: var(--amber); font-weight: 600; text-decoration: none; }
        .rowLink:hover { text-decoration: underline; }
        .statusVisible, .statusHidden {
          font-family: var(--font-mono);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          font-weight: 700;
        }
        .statusVisible { color: var(--success); }
        .statusHidden { color: var(--slate); }
      `}</style>
    </section>
  );
}

export type AffiliateRow = {
  slug: string;
  display_name: string;
  email: string;
  rsvp_count: number;
  referred_by_slug: string | null;
  hidden_from_leaderboard: boolean;
  created_at: string;
};

export function AffiliatesTable({ rows }: { rows: AffiliateRow[] }) {
  const data = rows.map((r) => ({ ...r, _key: r.slug }));
  const columns: Column<(typeof data)[number]>[] = [
    {
      key: "slug",
      label: "Slug",
      value: (r) => r.slug,
      render: (r) => (
        <Link href={`/admin/${r.slug}`} className="rowLink">
          {r.slug}
        </Link>
      ),
    },
    { key: "display_name", label: "Name", value: (r) => r.display_name },
    { key: "email", label: "Email", value: (r) => r.email },
    { key: "rsvp_count", label: "RSVPs", value: (r) => r.rsvp_count },
    { key: "referred_by_slug", label: "Referred by", value: (r) => r.referred_by_slug || "—" },
    {
      key: "hidden_from_leaderboard",
      label: "Leaderboard",
      value: (r) => (r.hidden_from_leaderboard ? "Hidden" : "Visible"),
      render: (r) => (
        <span className={r.hidden_from_leaderboard ? "statusHidden" : "statusVisible"}>
          {r.hidden_from_leaderboard ? "Hidden" : "Visible"}
        </span>
      ),
    },
    {
      key: "created_at",
      label: "Joined",
      value: (r) => new Date(r.created_at).getTime(),
      render: (r) => new Date(r.created_at).toLocaleDateString(),
    },
  ];
  return <Table title="Affiliates" rows={data} columns={columns} defaultSortKey="created_at" />;
}

export type RsvpRow = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  affiliate_slug: string;
  created_at: string;
};

export function RsvpsTable({
  rows,
  title = "Recent RSVPs",
  showAffiliateColumn = true,
}: {
  rows: RsvpRow[];
  title?: string;
  showAffiliateColumn?: boolean;
}) {
  const data = rows.map((r, i) => ({ ...r, _key: String(i) }));
  const columns: Column<(typeof data)[number]>[] = [
    { key: "name", label: "Name", value: (r) => `${r.first_name} ${r.last_name}` },
    { key: "email", label: "Email", value: (r) => r.email },
    { key: "phone", label: "Phone", value: (r) => r.phone || "—" },
    ...(showAffiliateColumn
      ? [{ key: "affiliate_slug", label: "Affiliate", value: (r: (typeof data)[number]) => r.affiliate_slug }]
      : []),
    {
      key: "created_at",
      label: "Date",
      value: (r) => new Date(r.created_at).getTime(),
      render: (r) => new Date(r.created_at).toLocaleString(),
    },
  ];
  return <Table title={title} rows={data} columns={columns} defaultSortKey="created_at" />;
}
