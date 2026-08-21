"use client";

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
    <section style={{ marginBottom: 40 }}>
      <div
        style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
        onClick={() => setOpen((o) => !o)}
      >
        <span style={{ fontSize: 13, color: "#666", width: 14 }}>{open ? "▾" : "▸"}</span>
        <h2 style={{ margin: 0 }}>
          {title} ({rows.length})
        </h2>
      </div>

      {open && (
        <div style={{ marginTop: 12 }}>
          <input
            type="text"
            placeholder={`Search ${title.toLowerCase()}…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              marginBottom: 12,
              padding: "7px 10px",
              width: "100%",
              maxWidth: 320,
              fontSize: 14,
              border: "1px solid #ccc",
              borderRadius: 6,
            }}
          />
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "2px solid #ddd" }}>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    style={{ padding: 8, cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
                  >
                    {col.label}
                    {sortKey === col.key ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row._key} style={{ borderBottom: "1px solid #eee" }}>
                  {columns.map((col) => (
                    <td key={col.key} style={{ padding: 8 }}>
                      {col.render ? col.render(row) : col.value(row)}
                    </td>
                  ))}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={columns.length} style={{ padding: 14, color: "#999", textAlign: "center" }}>
                    No matches.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export type AffiliateRow = {
  slug: string;
  display_name: string;
  email: string;
  rsvp_count: number;
  referred_by_slug: string | null;
  created_at: string;
};

export function AffiliatesTable({ rows }: { rows: AffiliateRow[] }) {
  const data = rows.map((r) => ({ ...r, _key: r.slug }));
  const columns: Column<(typeof data)[number]>[] = [
    { key: "slug", label: "Slug", value: (r) => r.slug },
    { key: "display_name", label: "Name", value: (r) => r.display_name },
    { key: "email", label: "Email", value: (r) => r.email },
    { key: "rsvp_count", label: "RSVPs", value: (r) => r.rsvp_count },
    { key: "referred_by_slug", label: "Referred by", value: (r) => r.referred_by_slug || "—" },
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

export function RsvpsTable({ rows }: { rows: RsvpRow[] }) {
  const data = rows.map((r, i) => ({ ...r, _key: String(i) }));
  const columns: Column<(typeof data)[number]>[] = [
    { key: "name", label: "Name", value: (r) => `${r.first_name} ${r.last_name}` },
    { key: "email", label: "Email", value: (r) => r.email },
    { key: "phone", label: "Phone", value: (r) => r.phone || "—" },
    { key: "affiliate_slug", label: "Affiliate", value: (r) => r.affiliate_slug },
    {
      key: "created_at",
      label: "Date",
      value: (r) => new Date(r.created_at).getTime(),
      render: (r) => new Date(r.created_at).toLocaleString(),
    },
  ];
  return <Table title="Recent RSVPs" rows={data} columns={columns} defaultSortKey="created_at" />;
}
