"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const INTERVAL_MS = 15_000;

export function AutoRefresh() {
  const router = useRouter();
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => router.refresh(), INTERVAL_MS);
    return () => clearInterval(id);
  }, [live, router]);

  return (
    <label className="autoRefresh">
      <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
      <span className={live ? "dot pulse" : "dot"} />
      Live refresh (15s)
      <style>{`
        .autoRefresh {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-mono);
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--slate);
          cursor: pointer;
          user-select: none;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--slate);
          flex-shrink: 0;
        }
        .dot.pulse {
          background: var(--rebel-red);
          animation: autoRefreshPulse 1.6s ease-in-out infinite;
        }
        @keyframes autoRefreshPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.8); }
        }
      `}</style>
    </label>
  );
}
