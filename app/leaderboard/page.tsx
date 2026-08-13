"use client";

import { useEffect, useState } from "react";

type Row = { slug: string; display_name: string; rsvp_count: number };

export default function LeaderboardPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/leaderboard", { cache: "no-store" });
      const data = await res.json();
      setRows(data.affiliates || []);
      setUpdatedAt(new Date());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="wrap">
      <div className="header">
        <span className="eyebrow">Rebel · Live</span>
        <h1 className="title">Leaderboard</h1>
        {updatedAt && (
          <span className="updated">Updated {updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        )}
      </div>

      {loading ? (
        <p className="empty">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="empty">No RSVPs yet — be the first.</p>
      ) : (
        <ol className="board">
          {rows.map((row, i) => (
            <li key={row.slug} className={`row rank-${i + 1 <= 3 ? i + 1 : "n"}`}>
              <span className="rank">{i + 1}</span>
              <span className="name">{row.display_name}</span>
              <span className="count">{row.rsvp_count}</span>
            </li>
          ))}
        </ol>
      )}

      <style>{`
        .wrap {
          min-height: 100dvh;
          background: var(--ink);
          color: var(--ivory);
          padding: 48px 20px 80px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .header { text-align: center; margin-bottom: 28px; }
        .eyebrow {
          font-family: var(--font-mono); font-size: 13px; letter-spacing: 0.12em;
          text-transform: uppercase; color: var(--amber);
        }
        .title {
          font-family: var(--font-display); font-size: clamp(36px, 9vw, 56px);
          text-transform: uppercase; margin: 6px 0 4px;
        }
        .updated { font-family: var(--font-mono); font-size: 12px; color: rgba(247,243,234,0.5); }
        .empty { color: rgba(247,243,234,0.6); font-family: var(--font-mono); }
        .board {
          width: 100%; max-width: 560px; list-style: none; margin: 0; padding: 0;
          display: flex; flex-direction: column; gap: 8px;
        }
        .row {
          display: grid; grid-template-columns: 40px 1fr auto; align-items: center;
          background: var(--ink-soft); border-radius: 10px; padding: 14px 18px;
        }
        .rank {
          font-family: var(--font-mono); font-weight: 700; color: rgba(247,243,234,0.5); font-size: 15px;
        }
        .rank-1 .rank, .rank-2 .rank, .rank-3 .rank { color: var(--amber); }
        .rank-1 { border: 1.5px solid var(--amber); }
        .name { font-weight: 600; font-size: 16px; }
        .count {
          font-family: var(--font-mono); font-weight: 700; font-size: 20px; color: var(--amber);
          font-variant-numeric: tabular-nums;
        }
      `}</style>
    </main>
  );
}
