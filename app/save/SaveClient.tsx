"use client";

import { useEffect, useState } from "react";

const GOOGLE_URL =
  "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Rebel%20Event%202027%3A%20The%20Reveal%20%E2%80%94%20Live%20on%20YouTube&dates=20261021T160000Z/20261021T170000Z&details=Rebel%20is%20coming%20back.%20But%20almost%20everything%20else%20is%20changing.%0A%0AJoin%20us%20live%20as%20we%20reveal%20the%20Rebel%202027%20dates%2C%20unveil%20our%20new%20venue%2C%20announce%20this%20year's%20speaker%20lineup%2C%20and%20give%20you%20the%20first%20look%20at%20what%20we're%20building%20for%20the%20next%20Rebel%20experience.%0A%0AAnd%20if%20you%20already%20know%20you%20want%20to%20be%20in%20the%20room%2C%20you'll%20want%20to%20watch%20live.%0A%0AVIP%20tickets%20are%20extremely%20limited%2C%20first%20come%2C%20first%20served%2C%20and%20those%20watching%20The%20Reveal%20will%20be%20the%20first%20to%20get%20access.%0A%0ANew%20dates.%20New%20venue.%20New%20speakers.%20A%20bigger%20Rebel.%0A%0AWe've%20been%20building%20this%20since%20we%20stepped%20off%20stage%20last%20year.%0A%0ANow%20it's%20time%20to%20show%20you.%0A%0AWatch%20live%3A%20https%3A%2F%2Fwww.youtube.com%2Flive%2FfyzxZiC-XLg&location=https%3A%2F%2Fwww.youtube.com%2Flive%2FfyzxZiC-XLg";

const OUTLOOK_URL =
  "https://outlook.office.com/calendar/0/deeplink/compose?path=/calendar/action/compose&subject=Rebel%20Event%202027%3A%20The%20Reveal%20%E2%80%94%20Live%20on%20YouTube&startdt=2026-10-21T16%3A00%3A00Z&enddt=2026-10-21T17%3A00%3A00Z&body=Rebel%20is%20coming%20back.%20But%20almost%20everything%20else%20is%20changing.%0A%0AJoin%20us%20live%20as%20we%20reveal%20the%20Rebel%202027%20dates%2C%20unveil%20our%20new%20venue%2C%20announce%20this%20year's%20speaker%20lineup%2C%20and%20give%20you%20the%20first%20look%20at%20what%20we're%20building%20for%20the%20next%20Rebel%20experience.%0A%0AAnd%20if%20you%20already%20know%20you%20want%20to%20be%20in%20the%20room%2C%20you'll%20want%20to%20watch%20live.%0A%0AVIP%20tickets%20are%20extremely%20limited%2C%20first%20come%2C%20first%20served%2C%20and%20those%20watching%20The%20Reveal%20will%20be%20the%20first%20to%20get%20access.%0A%0ANew%20dates.%20New%20venue.%20New%20speakers.%20A%20bigger%20Rebel.%0A%0AWe've%20been%20building%20this%20since%20we%20stepped%20off%20stage%20last%20year.%0A%0ANow%20it's%20time%20to%20show%20you.%0A%0AWatch%20live%3A%20https%3A%2F%2Fwww.youtube.com%2Flive%2FfyzxZiC-XLg&location=https%3A%2F%2Fwww.youtube.com%2Flive%2FfyzxZiC-XLg&allday=false";

const ICS_HREF =
  "data:text/calendar;charset=utf-8,BEGIN%3AVCALENDAR%0D%0AVERSION%3A2.0%0D%0APRODID%3A-%2F%2FRebel%2F%2FAdd%20to%20Calendar%2F%2FEN%0D%0ACALSCALE%3AGREGORIAN%0D%0AMETHOD%3APUBLISH%0D%0ABEGIN%3AVEVENT%0D%0AUID%3Arebel2027-reveal-20261021%40therebelevent.com%0D%0ADTSTAMP%3A20260829T000000Z%0D%0ADTSTART%3A20261021T160000Z%0D%0ADTEND%3A20261021T170000Z%0D%0ASUMMARY%3ARebel%20Event%202027%3A%20The%20Reveal%20%E2%80%94%20Live%20on%20YouTube%0D%0ADESCRIPTION%3ARebel%20is%20coming%20back.%20But%20almost%20everything%20else%20is%20changing.%5Cn%5CnJoin%20us%20live%20as%20we%20reveal%20the%20Rebel%202027%20dates%5C%2C%20unveil%20our%20new%20venue%5C%2C%20announce%20this%20year's%20speaker%20lineup%5C%2C%20and%20give%20you%20the%20first%20look%20at%20what%20we're%20building%20for%20the%20next%20Rebel%20experience.%5Cn%5CnAnd%20if%20you%20already%20know%20you%20want%20to%20be%20in%20the%20room%5C%2C%20you'll%20want%20to%20watch%20live.%5Cn%5CnVIP%20tickets%20are%20extremely%20limited%5C%2C%20first%20come%5C%2C%20first%20served%5C%2C%20and%20those%20watching%20The%20Reveal%20will%20be%20the%20first%20to%20get%20access.%5Cn%5CnNew%20dates.%20New%20venue.%20New%20speakers.%20A%20bigger%20Rebel.%5Cn%5CnWe've%20been%20building%20this%20since%20we%20stepped%20off%20stage%20last%20year.%5Cn%5CnNow%20it's%20time%20to%20show%20you.%5Cn%5CnWatch%20live%3A%20https%3A%2F%2Fwww.youtube.com%2Flive%2FfyzxZiC-XLg%0D%0ALOCATION%3Ahttps%3A%2F%2Fwww.youtube.com%2Flive%2FfyzxZiC-XLg%0D%0AURL%3Ahttps%3A%2F%2Fwww.youtube.com%2Flive%2FfyzxZiC-XLg%0D%0ABEGIN%3AVALARM%0D%0AACTION%3ADISPLAY%0D%0ADESCRIPTION%3AReminder%0D%0ATRIGGER%3A-PT30M%0D%0AEND%3AVALARM%0D%0AEND%3AVEVENT%0D%0AEND%3AVCALENDAR%0D%0A";

const YOUTUBE_URL = "https://www.youtube.com/live/fyzxZiC-XLg";

// Noon EDT on 10/21/2026 - when The Reveal goes live. Targeted as the fixed
// UTC instant (rather than a literal "noon EST") because that date falls
// during daylight time - DST doesn't end until early November - so a
// literal EST offset would land an hour off.
const GOES_LIVE_UTC = Date.UTC(2026, 9, 21, 16, 0, 0);

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
    return { isLive: false, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const remaining = Math.max(0, target - now);
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);

  return { isLive: now >= target, days, hours, minutes, seconds };
}

function copyToClipboard(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(textarea);
  return ok;
}

export default function SaveClient() {
  const { isLive, days, hours, minutes, seconds } = useCountdown(GOES_LIVE_UTC);

  return (
    <main className="wrap">
      <div className="header">
        <span className="eyebrow">Rebel 2027 Launch Call</span>
        <h1 className="title">Save to your calendar</h1>
      </div>

      <div className="countdown">
        {isLive ? (
          <>
            <p className="liveLabel">We&rsquo;re live now</p>
            <a className="watchBtn" href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer">
              Watch on YouTube
            </a>
          </>
        ) : (
          <>
            <p className="countdownLabel">Goes live in</p>
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

      <div className="card">
        <div className="cardEyebrow">What you are saving</div>
        <div className="cardTitle">Rebel Event 2027: The Reveal &mdash; Live on YouTube</div>

        <div className="grid">
          <div className="field">
            <div className="label">Date</div>
            <div className="value">Wednesday, October 21, 2026</div>
          </div>
          <div className="field">
            <div className="label">Time</div>
            <div className="value">12:00 &ndash; 1:00 PM ET</div>
          </div>
          <div className="field">
            <div className="label">Location</div>
            <div className="value">
              <a className="link" href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer">
                Live on YouTube
              </a>
            </div>
          </div>
        </div>

        <div className="heading">Pick your calendar and save now</div>
        <p className="sub">Takes ten seconds. Miss the stream, miss VIP access.</p>

        <div className="buttons">
          <a className="btn btn--primary" href={GOOGLE_URL} target="_blank" rel="noopener noreferrer">
            Google Calendar
          </a>
          <a className="btn btn--secondary" download="rebel-2027-the-reveal.ics" href={ICS_HREF}>
            Apple Calendar
          </a>
          <a className="btn btn--secondary" href={OUTLOOK_URL} target="_blank" rel="noopener noreferrer">
            Outlook
          </a>
        </div>

        <p className="fallback">
          Not signed into Outlook?{" "}
          <a href={ICS_HREF} download="rebel-2027-the-reveal.ics">
            Download the invite instead
          </a>
          .
        </p>

        <p className="quote">
          VIP access goes to whoever&rsquo;s actually in the room when we open it &mdash; get this on your calendar
          now, not &ldquo;later.&rdquo;
        </p>
      </div>

      <style
        // dangerouslySetInnerHTML, not children - this CSS has literal quote
        // characters, and <style> is a RAWTEXT element the browser never
        // entity-decodes, so React's normal text-child escaping (which turns
        // a quote into &quot; in the server HTML) causes a hydration
        // mismatch as soon as any quote is present. See app/[slug]/page.tsx
        // for the same fix, found the first time this bit this app.
        dangerouslySetInnerHTML={{
          __html: `
        .wrap {
          min-height: 100dvh;
          background: var(--ink);
          color: var(--ivory);
          padding: 48px 20px 80px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .header { text-align: center; margin-bottom: 24px; }
        .eyebrow {
          font-family: var(--font-mono); font-size: 13px; letter-spacing: 0.12em;
          text-transform: uppercase; color: var(--amber);
        }
        .title {
          font-family: var(--font-display); font-size: clamp(32px, 8vw, 48px);
          text-transform: uppercase; margin: 6px 0 0;
        }

        .countdown { display: flex; flex-direction: column; align-items: center; gap: 12px; margin-bottom: 32px; }
        .countdownLabel {
          font-family: var(--font-mono); font-size: 12px; text-transform: uppercase;
          letter-spacing: 0.06em; color: rgba(255,255,255,0.6); margin: 0;
        }
        .countdownRow { display: flex; gap: 10px; }
        .countdownUnit {
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          background: var(--ink-soft); border: 1.5px solid var(--amber); border-radius: 10px;
          padding: 12px 14px; min-width: 60px;
        }
        .countdownNum {
          font-family: var(--font-mono); font-weight: 700; font-size: clamp(22px, 5vw, 28px);
          color: var(--amber); font-variant-numeric: tabular-nums;
        }
        .countdownUnitLabel {
          font-family: var(--font-mono); font-size: 10px; text-transform: uppercase;
          letter-spacing: 0.05em; color: rgba(255,255,255,0.5);
        }
        .liveLabel {
          font-family: var(--font-mono); font-size: 13px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.04em; color: var(--rebel-red); margin: 0 0 12px;
        }
        .watchBtn {
          font-family: var(--font-mono); font-weight: 700; font-size: 13px; letter-spacing: 0.03em;
          text-transform: uppercase; padding: 12px 24px; border-radius: 10px; text-decoration: none;
          background: var(--rebel-red); color: #fff;
        }
        .watchBtn:hover { filter: brightness(1.08); }

        .card {
          width: 100%; max-width: 560px; background: var(--ink-soft);
          border: 1px solid rgba(255,255,255,0.14); border-radius: 18px; padding: 28px;
        }
        @media (max-width: 480px) { .card { padding: 22px 18px; } }

        .cardEyebrow {
          font-family: var(--font-mono); font-size: 11px; font-weight: 700; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--amber); margin-bottom: 10px;
        }
        .cardTitle {
          font-family: var(--font-display); text-transform: uppercase; letter-spacing: 0.01em;
          font-size: 22px; line-height: 1.25; color: var(--ivory); margin-bottom: 22px;
        }

        .grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 16px 20px; margin-bottom: 26px;
        }
        .label {
          font-family: var(--font-mono); font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; color: rgba(255,255,255,0.5); margin-bottom: 6px;
        }
        .value { font-size: 16px; color: var(--ivory); }
        .link { color: var(--amber); text-decoration: underline; text-underline-offset: 2px; }
        .link:hover { color: #fff; }

        .heading {
          font-family: var(--font-display); text-transform: uppercase; letter-spacing: 0.03em;
          font-size: 16px; color: var(--ivory); margin: 0 0 6px;
        }
        .sub { font-size: 13.5px; color: rgba(255,255,255,0.6); margin: 0 0 18px; }

        .buttons { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 18px; }
        .btn {
          flex: 1 1 150px; display: flex; align-items: center; justify-content: center;
          text-align: center; text-decoration: none; padding: 14px 12px; border-radius: 10px;
          font-family: var(--font-mono); font-weight: 700; font-size: 13px; letter-spacing: 0.03em;
          text-transform: uppercase; white-space: nowrap; transition: filter 0.15s ease;
        }
        .btn:hover { filter: brightness(1.1); }
        .btn--primary { background: var(--rebel-red); color: #fff; }
        .btn--secondary { background: transparent; border: 1.5px solid rgba(255,255,255,0.3); color: var(--ivory); }

        .fallback { font-size: 12px; color: rgba(255,255,255,0.55); margin: 0 0 18px; }
        .fallback a { color: rgba(255,255,255,0.55); text-decoration: underline; text-underline-offset: 2px; }
        .fallback a:hover { color: var(--amber); }

        .quote {
          font-family: var(--font-body); font-style: italic; font-size: 14px; line-height: 1.55;
          color: rgba(255,255,255,0.6); margin: 0;
        }

        @media (max-width: 360px) {
          .btn { flex: 1 1 100%; }
          .cardTitle { font-size: 19px; }
        }
      `,
        }}
      />
    </main>
  );
}
