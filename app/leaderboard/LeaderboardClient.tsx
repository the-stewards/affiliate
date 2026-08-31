"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const MEDIA_FOLDER_URL = "https://drive.google.com/drive/folders/1k78aMD7hrJDLvDu7LcXk39X6vIH_s_6B?usp=drive_link";

// Noon EDT on 10/21/2026 — when the Rebel Games end and positions on this
// board lock in. Targeted as the fixed UTC instant (rather than a literal
// "noon EST") because Oct 21 falls during daylight time - DST doesn't end
// until early November - so a literal EST offset would land an hour off.
const GAMES_END_UTC = Date.UTC(2026, 9, 21, 16, 0, 0);

type Row = { slug: string; display_name: string; rsvp_count: number };

// `now` starts null so the server-rendered markup and the client's first
// render are identical - seeding it with Date.now() directly causes a
// hydration mismatch, since the server's clock and the client's clock are
// never exactly the same millisecond. The real clock only starts ticking
// after mount, in the effect below.
function useCountdown(target: number) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => {
      const next = Date.now();
      setNow(next);
      if (next >= target) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [target]);

  if (now === null) {
    return { ready: false, isOver: false, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const remaining = Math.max(0, target - now);
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);

  return { ready: true, isOver: now >= target, days, hours, minutes, seconds };
}

export default function LeaderboardClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const { isOver, days, hours, minutes, seconds } = useCountdown(GAMES_END_UTC);

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
        <div className="headerActions">
          <Link href="/" className="actionBtn">
            Lost your link?
          </Link>
          <a href={MEDIA_FOLDER_URL} target="_blank" rel="noopener noreferrer" className="actionBtn">
            Download media kit
          </a>
        </div>
      </div>

      <div className="countdown">
        {isOver ? (
          <p className="countdownOver">Time's up — positions are final.</p>
        ) : (
          <>
            <p className="countdownLabel">Time left to lock in your position</p>
            <div className="countdownRow">
              <div className="countdownUnit">
                <span className="countdownNum">{days}</span>
                <span className="countdownUnitLabel">Days</span>
              </div>
              <div className="countdownUnit">
                <span className="countdownNum">{String(hours).padStart(2, "0")}</span>
                <span className="countdownUnitLabel">Hours</span>
              </div>
              <div className="countdownUnit">
                <span className="countdownNum">{String(minutes).padStart(2, "0")}</span>
                <span className="countdownUnitLabel">Min</span>
              </div>
              <div className="countdownUnit">
                <span className="countdownNum">{String(seconds).padStart(2, "0")}</span>
                <span className="countdownUnitLabel">Sec</span>
              </div>
            </div>
          </>
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
                {rows.slice(3).flatMap((row, i) => {
                  const rank = i + 4;
                  const items = [];
                  if (rank === 11) {
                    items.push(
                      <li key="tier-divider" className="divider">
                        Prizes start at #10 — need help getting there? Just ask.
                      </li>
                    );
                  }
                  items.push(
                    <li key={row.slug} className={`row ${rank <= 10 ? "tier-purple" : "tier-white"}`}>
                      <span className="rank">{rank}</span>
                      <span className="name">{row.display_name}</span>
                      <span className="count">{row.rsvp_count}</span>
                    </li>
                  );
                  return items;
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
        .headerActions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 16px; }
        .actionBtn {
          font-family: var(--font-mono); font-size: 12px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.03em; padding: 9px 16px; border-radius: 8px; border: 1.5px solid rgba(255,255,255,0.25);
          color: var(--ivory); text-decoration: none; white-space: nowrap;
        }
        .actionBtn:hover { border-color: var(--amber); color: var(--amber); }
        .empty { color: rgba(255,255,255,0.6); font-family: var(--font-mono); }
        .countdown { display: flex; flex-direction: column; align-items: center; gap: 12px; margin-bottom: 28px; }
        .countdownLabel {
          font-family: var(--font-mono); font-size: 12px; text-transform: uppercase;
          letter-spacing: 0.06em; color: rgba(255,255,255,0.6); margin: 0;
        }
        .countdownRow { display: flex; gap: 10px; }
        .countdownUnit {
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          background: var(--ink-soft); border: 1.5px solid var(--amber); border-radius: 10px;
          padding: 10px 12px; min-width: 56px;
        }
        .countdownNum {
          font-family: var(--font-mono); font-weight: 700; font-size: clamp(20px, 5vw, 26px);
          color: var(--amber); font-variant-numeric: tabular-nums;
        }
        .countdownUnitLabel {
          font-family: var(--font-mono); font-size: 10px; text-transform: uppercase;
          letter-spacing: 0.05em; color: rgba(255,255,255,0.5);
        }
        .countdownOver {
          font-family: var(--font-mono); font-size: 13px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.04em; color: var(--rebel-red); margin: 0;
        }
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
        .divider {
          text-align: center; color: var(--ivory); font-family: var(--font-mono);
          font-size: 12px; letter-spacing: 0.02em; padding: 14px 8px 4px;
          border-top: 1px solid rgba(255,255,255,0.15); margin-top: 4px;
        }
        .name { font-weight: 600; font-size: 16px; }
        .count {
          font-family: var(--font-mono); font-weight: 700; font-size: 20px;
          font-variant-numeric: tabular-nums;
        }
      `}</style>
    </main>
  );
}
