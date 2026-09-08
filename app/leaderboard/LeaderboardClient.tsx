"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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

// Background sits in a fixed layer and nudges upward as the page scrolls
// down - the classic "background moves slower than content" illusion,
// without needing the source art itself to be any taller than one screen.
// scrollY is never negative, so the layer only ever needs to move up, never
// down - it is oversized by 10vh at the BOTTOM only (see .parallaxBg's
// height/top in the style block) to supply that slack; giving it slack at
// the top too (an earlier version did) permanently crops that much off the
// art's actual top edge, since the layer would never sit low enough to
// reveal it. Mutates the layer's transform directly (rather than React
// state) and throttles to one write per animation frame, since this fires
// on every scroll event and a re-render per pixel scrolled would be
// wasteful. Skipped entirely under prefers-reduced-motion, same as the RSVP
// headcount's count-up animation.
function useParallaxBackground() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const SLACK_VH = 10;
    let ticking = false;

    function apply() {
      ticking = false;
      const el = ref.current;
      if (!el) return;
      const slackPx = window.innerHeight * (SLACK_VH / 100);
      const offset = Math.max(-slackPx, Math.min(slackPx, window.scrollY * -0.15));
      el.style.transform = `translateY(${offset}px)`;
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(apply);
    }

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return ref;
}

export default function LeaderboardClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const { isOver, days, hours, minutes, seconds } = useCountdown(GAMES_END_UTC);
  const bgRef = useParallaxBackground();

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
      <div ref={bgRef} className="parallaxBg" />
      <div className="header">
        <span className="eyebrow">The Rebel Games 2027</span>
        <h1 className="title">Leaderboard</h1>
        {updatedAt && (
          <span className="updated">Updated {updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        )}
        <div className="headerActions">
          <Link href="/" className="actionBtn actionBtn--secondary">
            Lost your link?
          </Link>
          <a href={MEDIA_FOLDER_URL} target="_blank" rel="noopener noreferrer" className="actionBtn actionBtn--primary">
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
          position: relative;
          min-height: 100dvh;
          background: var(--ink);
          color: var(--ivory);
          padding: 32px 20px 48px;
          display: flex;
          flex-direction: column;
          align-items: center;
          overflow-x: clip;
        }
        /* Oversized by 10vh at the bottom only, flush with the viewport at
           the top (see useParallaxBackground - the layer only ever moves
           up, never down, so slack is only needed below) so nudging it via
           transform on scroll never reveals empty space at the bottom
           edge. background-position: top keeps the top edge of the art
           flush with the top of the page at rest, instead of the default
           center crop that cover would otherwise use, eating into it.
           Mobile image is the default (mobile-first); desktop swaps in at
           the breakpoint below. */
        .parallaxBg {
          position: fixed; top: 0; left: 0; right: 0; height: 110vh;
          background-image: url(/leaderboard-bg-mobile.png);
          background-size: cover; background-position: top center;
          z-index: 0; pointer-events: none;
        }
        @media (min-width: 768px) {
          .parallaxBg { background-image: url(/leaderboard-bg-desktop.png); }
        }
        .header, .countdown, .lists, .empty { position: relative; z-index: 1; }
        .header { text-align: center; margin-bottom: 20px; }
        .eyebrow {
          font-family: var(--font-mono); font-size: 14px; font-weight: 700; letter-spacing: 0.16em;
          text-transform: uppercase; color: var(--amber);
        }
        .title {
          font-family: var(--font-display); font-size: clamp(42px, 11vw, 68px);
          text-transform: uppercase; margin: 6px 0 4px;
          text-shadow: 3px 3px 0 rgba(0,0,0,0.85), 0 0 32px rgba(255,69,0,0.25);
        }
        .updated { font-family: var(--font-mono); font-size: 12px; color: rgba(255,255,255,0.5); }
        .headerActions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 18px; }
        .actionBtn {
          flex: 1 1 190px; text-align: center;
          font-family: var(--font-display); font-size: 15px; letter-spacing: 0.04em;
          text-transform: uppercase; padding: 16px 20px; border-radius: 0;
          text-decoration: none; white-space: nowrap; transition: filter 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        }
        .actionBtn--secondary {
          background: rgba(0,0,0,0.35); border: 1px solid var(--ivory); color: var(--ivory);
        }
        .actionBtn--secondary:hover { border-color: var(--rebel-red); color: var(--rebel-red); }
        .actionBtn--primary { background: var(--rebel-red); border: 1px solid var(--rebel-red); color: #fff; }
        .actionBtn--primary:hover { filter: brightness(1.1); }
        .empty { color: rgba(255,255,255,0.6); font-family: var(--font-mono); }
        .countdown { display: flex; flex-direction: column; align-items: center; gap: 10px; margin-bottom: 20px; }
        .countdownLabel {
          font-family: var(--font-mono); font-size: 12px; text-transform: uppercase;
          letter-spacing: 0.06em; color: rgba(255,255,255,0.6); margin: 0;
        }
        .countdownRow { display: flex; gap: 10px; }
        .countdownUnit {
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          background: rgba(0,0,0,0.45); border: 1px solid var(--amber); border-radius: 0;
          padding: 8px 12px; min-width: 56px;
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
          width: 100%; max-width: 420px;
          display: flex; flex-direction: column; gap: 8px;
        }

        .tierLabel {
          font-family: var(--font-mono); font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.06em; margin: 2px 2px 1px;
        }
        .tierLabel-red { color: var(--rebel-red); }
        .tierLabel-purple { color: var(--amber); }

        /* #1 — exaggerated, full-width */
        .hero {
          display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 16px;
          background: rgba(0,0,0,0.45); border: 1px solid var(--rebel-red); border-radius: 0;
          padding: 16px 20px;
        }
        .heroRank {
          font-family: var(--font-mono); font-weight: 700; color: var(--rebel-red); font-size: 20px;
        }
        .heroName { font-weight: 700; font-size: clamp(18px, 4.5vw, 24px); }
        .heroCount {
          font-family: var(--font-mono); font-weight: 700; font-size: clamp(24px, 6vw, 30px);
          color: var(--rebel-red); font-variant-numeric: tabular-nums;
        }

        /* #2 and #3 — exaggerated, 50/50 split */
        .podiumRow { display: flex; gap: 8px; }
        .podiumCard {
          flex: 1; min-width: 0;
          display: flex; flex-direction: column; gap: 3px;
          background: rgba(0,0,0,0.45); border: 1px solid var(--rebel-red); border-radius: 0;
          padding: 12px 14px;
        }
        .podiumRank {
          font-family: var(--font-mono); font-weight: 700; color: var(--rebel-red); font-size: 16px;
        }
        .podiumName { font-weight: 600; font-size: 16px; }
        .podiumCount {
          font-family: var(--font-mono); font-weight: 700; font-size: 21px; color: var(--rebel-red);
          font-variant-numeric: tabular-nums;
        }

        /* #4+ — standard rows, tiered trim color */
        .board { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
        .row {
          display: grid; grid-template-columns: 40px 1fr auto; align-items: center;
          background: rgba(0,0,0,0.4); border-radius: 0; padding: 10px 14px;
          border: 1px solid transparent;
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
          font-size: 12px; letter-spacing: 0.02em; padding: 10px 8px 2px;
          border-top: 1px solid rgba(255,255,255,0.15); margin-top: 2px;
        }
        .name { font-weight: 600; font-size: 15px; }
        .count {
          font-family: var(--font-mono); font-weight: 700; font-size: 18px;
          font-variant-numeric: tabular-nums;
        }
      `}</style>
    </main>
  );
}
