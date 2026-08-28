"use client";

import { useEffect, useState } from "react";

type Row = { slug: string; display_name: string; rsvp_count: number };

export default function LeaderboardClient() {
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
        <span className="eyebrow">The Rebel Games 2027</span>
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
        <div className="lists">
          {/* #1 — full-width hero card */}
          <div className="tierLabel tierLabel-red">VIP ticket + the Rebel Trophy + stage time</div>
          <div className="hero">
            <span className="heroRank">1</span>
            <span className="heroName">{rows[0].display_name}</span>
            <span className="heroCount">{rows[0].rsvp_count}</span>
          </div>

          {/* #2 and #3 — split 50/50 */}
          {rows.length > 1 && (
            <>
              <div className="tierLabel tierLabel-red">VIP ticket + stage time</div>
              <div className="podiumRow">
                {rows.slice(1, 3).map((row, i) => (
                  <div key={row.slug} className="podiumCard">
                    <span className="podiumRank">{i + 2}</span>
                    <span className="podiumName">{row.display_name}</span>
                    <span className="podiumCount">{row.rsvp_count}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* #4+ — standard rows, purple trim through #10, white trim after */}
          {rows.length > 3 && (
            <>
              <div className="tierLabel tierLabel-purple">General admission ticket</div>
              <ol className="board">
                {rows.slice(3).map((row, i) => {
                  const rank = i + 4;
                  return (
                    <li key={row.slug} className={`row ${rank <= 10 ? "tier-purple" : "tier-white"}`}>
                      <span className="rank">{rank}</span>
                      <span className="name">{row.display_name}</span>
                      <span className="count">{row.rsvp_count}</span>
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </div>
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
        .updated { font-family: var(--font-mono); font-size: 12px; color: rgba(255,255,255,0.5); }
        .empty { color: rgba(255,255,255,0.6); font-family: var(--font-mono); }
        .lists {
          width: 100%; max-width: 560px;
          display: flex; flex-direction: column; gap: 10px;
        }

        .tierLabel {
          font-family: var(--font-mono); font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.06em; margin: 4px 2px 2px;
        }
        .tierLabel-red { color: var(--rebel-red); }
        .tierLabel-purple { color: var(--amber); }

        /* #1 — exaggerated, full-width */
        .hero {
          display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 16px;
          background: var(--ink-soft); border: 2px solid var(--rebel-red); border-radius: 14px;
          padding: 22px 26px;
        }
        .heroRank {
          font-family: var(--font-mono); font-weight: 700; color: var(--rebel-red); font-size: 22px;
        }
        .heroName { font-weight: 700; font-size: clamp(20px, 5vw, 26px); }
        .heroCount {
          font-family: var(--font-mono); font-weight: 700; font-size: clamp(28px, 7vw, 36px);
          color: var(--rebel-red); font-variant-numeric: tabular-nums;
        }

        /* #2 and #3 — exaggerated, 50/50 split */
        .podiumRow { display: flex; gap: 10px; }
        .podiumCard {
          flex: 1; min-width: 0;
          display: flex; flex-direction: column; gap: 4px;
          background: var(--ink-soft); border: 2px solid var(--rebel-red); border-radius: 12px;
          padding: 16px 18px;
        }
        .podiumRank {
          font-family: var(--font-mono); font-weight: 700; color: var(--rebel-red); font-size: 17px;
        }
        .podiumName { font-weight: 600; font-size: 17px; }
        .podiumCount {
          font-family: var(--font-mono); font-weight: 700; font-size: 24px; color: var(--rebel-red);
          font-variant-numeric: tabular-nums;
        }

        /* #4+ — standard rows, tiered trim color */
        .board { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
        .row {
          display: grid; grid-template-columns: 40px 1fr auto; align-items: center;
          background: var(--ink-soft); border-radius: 10px; padding: 14px 18px;
          border: 1.5px solid transparent;
        }
        .tier-purple { border-color: var(--amber); }
        .tier-white { border-color: var(--ivory); }
        .rank {
          font-family: var(--font-mono); font-weight: 700; color: rgba(255,255,255,0.5); font-size: 15px;
        }
        .tier-purple .rank, .tier-purple .count { color: var(--amber); }
        .tier-white .rank, .tier-white .count { color: var(--ivory); }
        .name { font-weight: 600; font-size: 16px; }
        .count {
          font-family: var(--font-mono); font-weight: 700; font-size: 20px;
          font-variant-numeric: tabular-nums;
        }
      `}</style>
    </main>
  );
}
