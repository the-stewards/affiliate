"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useIframeAutoResize } from "../useIframeAutoResize";
import { isValidEmail } from "@/lib/validate";

type Step = "rsvp" | "offer" | "games-detail" | "signup" | "signup-success";

// Plain fetch has no timeout — on flaky wifi a request can hang indefinitely,
// leaving the user stuck on "Saving..." with no way to recover short of a
// refresh. This caps how long we wait and surfaces a clear, actionable error
// instead. Retrying after a timeout is safe: both /api/rsvp and
// /api/affiliates enforce uniqueness server-side, so a duplicate attempt
// (in case the first one actually went through) comes back as a clear
// "already RSVP'd" / "already registered" error, never a silent dupe.
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("That's taking too long — check your connection and try again.");
    }
    throw new Error("Couldn't reach the server — check your connection and try again.");
  } finally {
    clearTimeout(timeout);
  }
}

// Counts up from 0 to `target` on mount instead of just showing the number -
// a ticking headcount reads as "this is happening right now" (momentum/
// social proof) at exactly the moment someone's deciding whether to RSVP.
// Skips the animation for prefers-reduced-motion, since this is JS-driven
// state rather than a CSS animation/transition, so the blanket
// prefers-reduced-motion rule in globals.css doesn't cover it.
function useCountUp(target: number, durationMs = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }

    let frame: number;
    const start = performance.now();

    function tick(now: number) {
      const progress = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}

export default function RsvpFlow({
  affiliateSlug,
  affiliateName,
  showIntro = true,
  totalRsvpCount,
  condensed = false,
  ctaLabel = "RSVP now",
}: {
  affiliateSlug: string;
  affiliateName: string;
  // The "[Name] is holding a spot for you" line makes sense on the personal
  // /[slug] page but not inside the embed, which sits on a generic hub page
  // with no per-visitor personalization context.
  showIntro?: boolean;
  // Event-wide RSVP count, shown as social proof on the initial form only.
  totalRsvpCount?: number;
  // Drops the "Save your seat" heading and date/time line - for embedding
  // on a page (e.g. the Squarespace Reveal landing page) that already shows
  // the event name and date in its own hero, where repeating it just adds
  // friction before the actual form fields. Headcount pill stays either way.
  condensed?: boolean;
  // Lets an embedding page match its own hero CTA copy (e.g. the
  // Squarespace Reveal page's "Reserve My Spot" button).
  ctaLabel?: string;
}) {
  const [step, setStep] = useState<Step>("rsvp");
  const [newSlug, setNewSlug] = useState<string | null>(null);
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);

  // Only the condensed embed (app/embed/reveal) is iframed on Squarespace
  // with a fixed host-side height - /[slug] and the original /embed route
  // render full-page or in their own already-sized iframe, so gating on
  // condensed keeps this a no-op there.
  useIframeAutoResize(cardRef, condensed);

  // Declining the ambassador upsell still means they RSVP'd, so send them to
  // the add-to-calendar page instead of the old plain "we'll be in touch"
  // message - only on the full personalized /[slug] page (showIntro=true),
  // not the compact Squarespace iframe embed (app/embed/page.tsx, showIntro
  // false), where navigating to a full page designed for its own viewport
  // would just render squeezed inside whatever small box that iframe is
  // sized to. The embed keeps the original in-place confirmation.
  function handleDecline() {
    if (showIntro) {
      router.push("/save");
    } else {
      setStep("signup-success");
    }
  }

  return (
    <div ref={cardRef} className={condensed ? "card condensed" : "card"}>
      {step === "rsvp" && (
        <RsvpForm
          affiliateSlug={affiliateSlug}
          affiliateName={affiliateName}
          showIntro={showIntro}
          totalRsvpCount={totalRsvpCount}
          condensed={condensed}
          ctaLabel={ctaLabel}
          onDone={() => setStep("offer")}
        />
      )}
      {step === "offer" && (
        <Offer condensed={condensed} onYes={() => setStep("games-detail")} onNo={handleDecline} />
      )}
      {step === "games-detail" && (
        <GamesDetail
          totalRsvpCount={totalRsvpCount}
          condensed={condensed}
          onYes={() => setStep("signup")}
          onNo={handleDecline}
        />
      )}
      {step === "signup" && (
        <SignupForm
          referredBySlug={affiliateSlug}
          condensed={condensed}
          onDone={(slug) => {
            setNewSlug(slug);
            setStep("signup-success");
          }}
        />
      )}
      {step === "signup-success" && <SignupSuccess newSlug={newSlug} condensed={condensed} />}

      <style>{`
        .card {
          width: 100%;
          max-width: 560px;
          margin-top: 22px;
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 28px;
        }
        @media (max-width: 480px) {
          .card { padding: 22px 18px; }
        }
        /* Nothing but the individual field/button boxes should read as a
           shape here - no card outline, no fill - so it sits directly on
           whatever page hosts the embed (built for the black Squarespace
           Reveal page, hence the white borders below). Padding (moved in
           from app/embed/reveal/page.tsx wrapping div) and a zeroed
           margin-top (overriding the base .card rule above) both matter
           for more than looks here - useIframeAutoResize measures this
           exact box, so any spacing living outside it (a wrapping div
           padding, an external margin on this element itself) is
           invisible to that measurement, and the iframe renders taller
           than the height it reports.
        */
        .card.condensed {
          background: transparent;
          border: none;
          border-radius: 0;
          padding: 16px;
          margin-top: 0;
        }
      `}</style>
    </div>
  );
}

function RsvpForm({
  affiliateSlug,
  affiliateName,
  showIntro,
  totalRsvpCount,
  condensed = false,
  ctaLabel = "RSVP now",
  onDone,
}: {
  affiliateSlug: string;
  affiliateName: string;
  showIntro: boolean;
  totalRsvpCount?: number;
  condensed?: boolean;
  ctaLabel?: string;
  onDone: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [smsConsent, setSmsConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const displayCount = useCountUp(totalRsvpCount ?? 0);

  function validate(): string | null {
    if (!firstName.trim() || !lastName.trim()) return "Enter your first and last name.";
    if (!email.trim() || !isValidEmail(email.trim())) return "Enter a valid email address.";
    if (phone.trim() && !smsConsent) return "Check the box to consent to texts, or leave the phone number blank.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetchWithTimeout(
        "/api/rsvp",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName,
            lastName,
            email,
            phone,
            smsConsent,
            affiliateSlug,
            website: honeypotRef.current?.value || "",
          }),
        },
        12000
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setSubmitting(false);
        return;
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error — try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={condensed ? "condensed" : undefined}>
      {!condensed && <h2 className="title">Save your seat</h2>}
      {/* Hidden until the count is actually impressive - a low number here
          undercuts the social proof it's meant to create. */}
      {typeof totalRsvpCount === "number" && totalRsvpCount >= 100 && (
        <div className="headcountRow">
          <div className="headcountPill">
            <span className="pulse" />
            <span className="headcountNum">{displayCount.toLocaleString()}</span>
            <span className="headcountLabel">
              {condensed ? "are coming to the reveal" : "are coming to Rebel Event 2027: The Reveal — LIVE"}
            </span>
          </div>
        </div>
      )}
      {!condensed && (
        <p className="eventMeta">Wednesday, October 21, 2026 &middot; 12:00&ndash;1:00 PM ET</p>
      )}
      {showIntro && (
        <p className="sub">
          {affiliateName} is holding a spot for you on the Rebel launch call.
        </p>
      )}

      {/* honeypot — hidden from real users via CSS, bots tend to fill every field */}
      <input
        ref={honeypotRef}
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
      />

      <div className="nameRow">
        <label className="field">
          <span className="fieldLabel">First name</span>
          <input
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder={condensed ? "FIRST NAME" : "First"}
          />
        </label>
        <label className="field">
          <span className="fieldLabel">Last name</span>
          <input
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder={condensed ? "LAST NAME" : "Last"}
          />
        </label>
      </div>
      <label className="field">
        <span className="fieldLabel">Email</span>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={condensed ? "E-MAIL ADDRESS" : "you@email.com"}
        />
      </label>
      <label className="field">
        <span className="fieldLabel">Phone (optional)</span>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={condensed ? "PHONE #" : "(555) 555-5555"}
        />
      </label>

      {phone && (
        <label className="checkboxField">
          <input
            type="checkbox"
            required
            checked={smsConsent}
            onChange={(e) => setSmsConsent(e.target.checked)}
          />
          <span>I agree to receive event updates by text at the number above.</span>
        </label>
      )}

      {error && <p className="error">{error}</p>}

      <button type="submit" className="cta" disabled={submitting}>
        {submitting ? "Saving..." : ctaLabel}
      </button>

      <style>{`
        .title { font-family: var(--font-display); font-size: 26px; text-transform: uppercase; margin: 0 0 14px; }
        .sub { color: var(--slate); margin: 0 0 20px; font-size: 15px; line-height: 1.5; }
        .headcountRow { text-align: center; margin: 0 0 18px; }
        .headcountPill {
          display: inline-flex; align-items: center; gap: 9px;
          background: rgba(178,65,248,0.08); border: 1.5px solid rgba(178,65,248,0.3);
          border-radius: 999px; padding: 9px 16px 9px 14px;
        }
        .pulse {
          width: 8px; height: 8px; border-radius: 50%; background: #ffd60a;
          flex-shrink: 0; animation: headcountPulse 1.6s ease-in-out infinite;
        }
        @keyframes headcountPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.8); }
        }
        .headcountNum {
          font-family: var(--font-mono); font-weight: 700; font-size: 19px; color: var(--rebel-red);
          font-variant-numeric: tabular-nums;
        }
        .headcountLabel {
          font-family: var(--font-mono); font-size: 12px; color: var(--ink);
          text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600;
        }
        .eventMeta {
          font-family: var(--font-mono); font-size: 12px; color: var(--slate);
          text-align: center; letter-spacing: 0.02em; margin: 0 0 14px;
        }
        .nameRow { display: flex; gap: 10px; }
        .nameRow .field { flex: 1; min-width: 0; }
        .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; font-size: 13px; font-weight: 600; color: var(--ink); }
        .field input {
          font-size: 16px; padding: 12px 14px; border-radius: 10px;
          border: 1.5px solid var(--line); font-family: var(--font-body);
          width: 100%;
        }
        .field input:focus { border-color: var(--ink); }
        .checkboxField { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: var(--slate); margin-bottom: 16px; }
        .checkboxField input { margin-top: 3px; }
        .error { color: var(--rebel-red); font-size: 14px; margin: 0 0 14px; }
        .cta {
          width: 100%; background: var(--rebel-red); color: #fff; border: none;
          border-radius: 10px; padding: 14px; font-weight: 700; font-size: 16px;
          letter-spacing: 0.02em; transition: filter 0.15s ease;
        }
        .cta:hover:not(:disabled) { filter: brightness(1.08); }
        .cta:disabled { opacity: 0.6; cursor: default; }

        /* Built for a black backdrop (the Squarespace Reveal page) - square
           corners, bold white-bordered fields with no fill, uppercase
           display-font placeholders carrying the label instead of a
           separate label line above each field. */
        form.condensed .fieldLabel {
          position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
          overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
        }
        form.condensed .field input {
          background: transparent; border: 1px solid var(--ivory); border-radius: 0;
          color: var(--ivory); padding: 18px 16px;
          font-family: var(--font-display); font-size: 15px; letter-spacing: 0.16em;
        }
        form.condensed .field input::placeholder {
          color: var(--ivory); font-family: var(--font-display);
          text-transform: uppercase; letter-spacing: 0.16em;
        }
        form.condensed .field input:focus { border-color: var(--rebel-red); }
        form.condensed .checkboxField { color: rgba(255,255,255,0.7); }
        form.condensed .cta {
          border-radius: 0; padding: 18px; font-family: var(--font-display);
          font-size: 18px; letter-spacing: 0.18em; text-transform: uppercase;
          font-weight: normal;
        }
        form.condensed .headcountPill {
          background: transparent; border: 1px solid var(--ivory); border-radius: 4px;
        }
        form.condensed .headcountLabel { color: var(--ivory); white-space: nowrap; }
      `}</style>
    </form>
  );
}

function Offer({
  condensed = false,
  onYes,
  onNo,
}: {
  condensed?: boolean;
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <div className={condensed ? "condensed" : undefined}>
      <p className="check">✓ Spot saved for the Rebel 2027 Launch Call</p>
      <h2 className="title">Don't just attend — compete</h2>
      <p className="sub">
        Invite others to the Launch Call and you could win real prizes — a free VIP ticket, the trophy,
        even stage time.
      </p>
      <button className="cta" onClick={onYes}>
        See the prizes
      </button>
      <button className="skip" onClick={onNo}>
        No thanks
      </button>
      <style>{`
        .check { font-family: var(--font-mono); color: var(--success); font-weight: 700; margin: 0 0 4px; }
        .title { font-family: var(--font-display); font-size: 26px; text-transform: uppercase; margin: 0 0 6px; }
        .sub { color: var(--slate); margin: 0 0 20px; font-size: 15px; line-height: 1.5; }
        .cta {
          display: block; width: 100%; background: var(--rebel-red); color: #fff; border: none;
          border-radius: 10px; padding: 14px; font-weight: 700; font-size: 16px;
        }
        .skip {
          display: block; width: 100%; background: none; border: none; color: var(--slate);
          font-size: 13px; font-weight: 600; padding: 12px 0 0; cursor: pointer; text-align: center;
        }
        .skip:hover { color: var(--ink); text-decoration: underline; }

        .condensed .check { color: #5fd576; }
        .condensed .title { color: var(--ivory); }
        .condensed .sub { color: rgba(255,255,255,0.7); }
        .condensed .cta {
          border-radius: 0; font-family: var(--font-display); font-size: 18px;
          letter-spacing: 0.06em; text-transform: uppercase; padding: 18px;
          font-weight: normal;
        }
        .condensed .skip { color: rgba(255,255,255,0.6); }
        .condensed .skip:hover { color: var(--ivory); }
      `}</style>
    </div>
  );
}

function GamesDetail({
  totalRsvpCount,
  condensed = false,
  onYes,
  onNo,
}: {
  totalRsvpCount?: number;
  condensed?: boolean;
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <div className={condensed ? "condensed" : undefined}>
      <span className="eyebrow">Rebel Ambassador Games</span>
      <h2 className="title">Bring your people. Win the games.</h2>
      <p className="sub">
        Every person you invite to the Rebel 2027 Launch Call counts toward your score. You're helping
        them land a seat in the room — and the more you bring, the better your shot at the podium.
      </p>

      {typeof totalRsvpCount === "number" && totalRsvpCount >= 100 && (
        <div className="momentumRow">
          <div className="momentumPill">
            <span className="pulse" />
            <span className="momentumNum">{totalRsvpCount.toLocaleString()}</span>
            <span className="momentumLabel">RSVPs brought in so far — you could be next</span>
          </div>
        </div>
      )}

      <div className="prizes">
        <div className="prize prize-gold">
          <span className="prizeRank">1st</span>
          <span className="prizeDetail">Free VIP ticket + the Rebel Trophy + stage time at the event</span>
        </div>
        <div className="prize prize-silver">
          <span className="prizeRank">2nd–3rd</span>
          <span className="prizeDetail">Free VIP ticket + stage time at the event</span>
        </div>
        <div className="prize prize-bronze">
          <span className="prizeRank">4th–10th</span>
          <span className="prizeDetail">Free General Admission ticket</span>
        </div>
      </div>

      <button className="cta" onClick={onYes}>
        Get my link
      </button>
      <button className="skip" onClick={onNo}>
        Maybe later
      </button>
      <style>{`
        .eyebrow {
          display: block; font-family: var(--font-mono); font-size: 12px; text-transform: uppercase;
          letter-spacing: 0.08em; color: var(--amber); margin-bottom: 6px;
        }
        .title { font-family: var(--font-display); font-size: 26px; text-transform: uppercase; margin: 0 0 10px; }
        .sub { color: var(--slate); margin: 0 0 16px; font-size: 15px; line-height: 1.5; }
        .momentumRow { margin: 0 0 20px; }
        .momentumPill {
          display: inline-flex; align-items: center; gap: 9px;
          background: rgba(178,65,248,0.08); border: 1.5px solid rgba(178,65,248,0.3);
          border-radius: 999px; padding: 9px 16px 9px 14px;
        }
        .momentumPill .pulse {
          width: 8px; height: 8px; border-radius: 50%; background: var(--rebel-red);
          flex-shrink: 0; animation: momentumPulse 1.6s ease-in-out infinite;
        }
        @keyframes momentumPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.8); }
        }
        .momentumNum {
          font-family: var(--font-mono); font-weight: 700; font-size: 19px; color: var(--rebel-red);
          font-variant-numeric: tabular-nums;
        }
        .momentumLabel {
          font-family: var(--font-mono); font-size: 12px; color: var(--ink);
          text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600;
        }
        .prizes { display: flex; flex-direction: column; gap: 8px; margin-bottom: 22px; }
        .prize {
          display: flex; align-items: baseline; gap: 12px; padding: 12px 14px;
          border-radius: 10px; border: 1.5px solid var(--line);
        }
        .prizeRank {
          font-family: var(--font-mono); font-weight: 700; font-size: 13px; text-transform: uppercase;
          letter-spacing: 0.03em; white-space: nowrap; flex-shrink: 0; width: 62px;
        }
        .prizeDetail { font-size: 14px; line-height: 1.4; color: var(--ink); }
        .prize-gold { background: rgba(255,69,0,0.06); border-color: rgba(255,69,0,0.35); }
        .prize-gold .prizeRank { color: var(--rebel-red); }
        .prize-silver { background: rgba(178,65,248,0.05); border-color: rgba(178,65,248,0.28); }
        .prize-silver .prizeRank { color: var(--amber); }
        .prize-bronze { background: rgba(0,0,0,0.02); }
        .prize-bronze .prizeRank { color: var(--slate); }
        .cta {
          display: block; width: 100%; background: var(--rebel-red); color: #fff; border: none;
          border-radius: 10px; padding: 14px; font-weight: 700; font-size: 16px;
        }
        .skip {
          display: block; width: 100%; background: none; border: none; color: var(--slate);
          font-size: 13px; font-weight: 600; padding: 12px 0 0; cursor: pointer; text-align: center;
        }
        .skip:hover { color: var(--ink); text-decoration: underline; }

        /* Same black-backdrop treatment as the RSVP form step - the light-
           theme colors above (dark title/body text, tinted prize boxes)
           were built for a white card and read as invisible or illegible
           on black, which is what this fixes. */
        .condensed .title { color: var(--ivory); }
        .condensed .sub { color: rgba(255,255,255,0.7); }
        .condensed .prize {
          background: transparent; border: 1px solid var(--ivory); border-radius: 0;
        }
        .condensed .prizeDetail { color: rgba(255,255,255,0.85); }
        .condensed .prize-gold .prizeRank { color: var(--rebel-red); }
        .condensed .prize-silver .prizeRank { color: var(--amber); }
        .condensed .prize-bronze .prizeRank { color: var(--ivory); }
        .condensed .momentumPill {
          background: transparent; border: 1px solid var(--ivory); border-radius: 4px;
        }
        .condensed .momentumLabel { color: var(--ivory); white-space: nowrap; }
        .condensed .cta {
          border-radius: 0; font-family: var(--font-display); font-size: 18px;
          letter-spacing: 0.06em; text-transform: uppercase; padding: 18px;
          font-weight: normal;
        }
        .condensed .skip { color: rgba(255,255,255,0.6); }
        .condensed .skip:hover { color: var(--ivory); }
      `}</style>
    </div>
  );
}

function SignupForm({
  referredBySlug,
  condensed = false,
  onDone,
}: {
  referredBySlug: string;
  condensed?: boolean;
  onDone: (slug: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);

  // Auto-suggest slug from name until the user edits it directly.
  useEffect(() => {
    if (slugTouched) return;
    const parts = name.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const first = (parts[0] || "").replace(/[^a-z0-9]/g, "");
    const lastInitial = (parts[1] || "").replace(/[^a-z0-9]/g, "").slice(0, 1);
    setSlug(`${first}${lastInitial}`);
  }, [name, slugTouched]);

  useEffect(() => {
    if (!slug) {
      setSlugStatus("idle");
      return;
    }
    setSlugStatus("checking");
    const handle = setTimeout(async () => {
      try {
        const res = await fetchWithTimeout(
          `/api/affiliates/check-slug?slug=${encodeURIComponent(slug)}`,
          {},
          8000
        );
        const data = await res.json();
        if (!data.available && (data.reason === "invalid_format")) setSlugStatus("invalid");
        else setSlugStatus(data.available ? "available" : "taken");
      } catch {
        setSlugStatus("idle");
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetchWithTimeout(
        "/api/affiliates",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            phone,
            requestedSlug: slug,
            referredBySlug,
            website: honeypotRef.current?.value || "",
          }),
        },
        12000
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setSubmitting(false);
        return;
      }
      onDone(data.slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error — try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={condensed ? "condensed" : undefined}>
      {!condensed && <h2 className="title">Set up your link</h2>}

      <input
        ref={honeypotRef}
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
      />

      <label className="field">
        <span className="fieldLabel">Name</span>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={condensed ? "FULL NAME" : "Full name"}
        />
      </label>
      <label className="field">
        <span className="fieldLabel">Email</span>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={condensed ? "E-MAIL ADDRESS" : "you@email.com"}
        />
      </label>
      <label className="field">
        <span className="fieldLabel">Phone (optional)</span>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={condensed ? "PHONE #" : "(555) 555-5555"}
        />
      </label>
      <label className="field">
        <span className="fieldLabel">Your link</span>
        <div className="slugRow">
          <span className="slugPrefix">www.therebelevent.com/?ref=</span>
          <input
            required
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
            }}
          />
        </div>
        <SlugStatus status={slugStatus} />
      </label>

      {error && <p className="error">{error}</p>}

      <button type="submit" className="cta" disabled={submitting || slugStatus === "taken" || slugStatus === "invalid"}>
        {submitting ? "Creating..." : "Get my link"}
      </button>

      <style>{`
        .title { font-family: var(--font-display); font-size: 26px; text-transform: uppercase; margin: 0 0 18px; }
        .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; font-size: 13px; font-weight: 600; color: var(--ink); }
        .field input {
          font-size: 16px; padding: 12px 14px; border-radius: 10px;
          border: 1.5px solid var(--line); font-family: var(--font-body);
        }
        .field input:focus { border-color: var(--ink); }
        .slugRow { display: flex; align-items: center; border: 1.5px solid var(--line); border-radius: 10px; overflow: hidden; }
        .slugRow:focus-within { border-color: var(--ink); }
        .slugPrefix { padding: 0 0 0 14px; font-family: var(--font-mono); font-size: 14px; color: var(--slate); white-space: nowrap; }
        .slugRow input { border: none; flex: 1; }
        .error { color: var(--rebel-red); font-size: 14px; margin: 10px 0 0; }
        .cta {
          width: 100%; margin-top: 6px; background: var(--rebel-red); color: #fff; border: none;
          border-radius: 10px; padding: 14px; font-weight: 700; font-size: 16px;
        }
        .cta:disabled { opacity: 0.5; }

        /* Same black-backdrop treatment as the other two condensed steps -
           these fields had no background override at all, so they were
           rendering as plain white browser-default pills on black. */
        form.condensed .fieldLabel {
          position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
          overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
        }
        form.condensed .field input {
          background: transparent; border: 1px solid var(--ivory); border-radius: 0;
          color: var(--ivory); padding: 18px 16px;
          font-family: var(--font-display); font-size: 15px; letter-spacing: 0.16em;
        }
        form.condensed .field input::placeholder {
          color: var(--ivory); font-family: var(--font-display);
          text-transform: uppercase; letter-spacing: 0.16em;
        }
        form.condensed .field input:focus { border-color: var(--rebel-red); }
        form.condensed .slugRow {
          border: 1px solid var(--ivory); border-radius: 0; background: transparent;
        }
        form.condensed .slugRow:focus-within { border-color: var(--rebel-red); }
        form.condensed .slugPrefix { color: rgba(255,255,255,0.65); }
        form.condensed .slugRow input {
          background: transparent; color: var(--ivory); font-family: var(--font-mono);
          text-transform: none; padding: 12px 14px 12px 0;
        }
        form.condensed .cta {
          border-radius: 0; font-family: var(--font-display); font-size: 18px;
          letter-spacing: 0.18em; text-transform: uppercase; padding: 18px;
          font-weight: normal;
        }
      `}</style>
    </form>
  );
}

function SlugStatus({ status }: { status: "idle" | "checking" | "available" | "taken" | "invalid" }) {
  if (status === "idle") return null;
  const map = {
    checking: { text: "Checking…", color: "var(--slate)" },
    available: { text: "Available ✓", color: "var(--success)" },
    taken: { text: "Already taken — try another", color: "var(--rebel-red)" },
    invalid: { text: "Letters and numbers only, 2+ characters", color: "var(--rebel-red)" },
  } as const;
  const { text, color } = map[status];
  return <span style={{ fontSize: 12, color, fontWeight: 600 }}>{text}</span>;
}

function SignupSuccess({ newSlug, condensed = false }: { newSlug: string | null; condensed?: boolean }) {
  if (!newSlug) {
    return (
      <div style={{ textAlign: "center" }}>
        <p style={{ fontFamily: "var(--font-mono)", color: condensed ? "#5fd576" : "var(--success)", fontWeight: 700, marginBottom: 4 }}>
          ✓ RSVP confirmed
        </p>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 26,
            textTransform: "uppercase",
            margin: "0 0 8px",
            color: condensed ? "var(--ivory)" : undefined,
          }}
        >
          See you there.
        </h2>
        <p style={{ color: condensed ? "rgba(255,255,255,0.7)" : "var(--slate)", fontSize: 15, lineHeight: 1.5 }}>
          We'll be in touch with the details.
        </p>
        <SaveCalendarLink condensed={condensed} />
      </div>
    );
  }

  const link = `www.therebelevent.com/?ref=${newSlug}`;

  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontFamily: "var(--font-mono)", color: condensed ? "#5fd576" : "var(--success)", fontWeight: 700, marginBottom: 4 }}>
        ✓ You're in the Rebel Ambassador Games
      </p>
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 26,
          textTransform: "uppercase",
          margin: "0 0 12px",
          color: condensed ? "var(--ivory)" : undefined,
        }}
      >
        Your link is live
      </h2>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          background: condensed ? "rgba(255,255,255,0.08)" : "var(--ink)",
          border: condensed ? "1px solid var(--ivory)" : undefined,
          borderRadius: condensed ? 0 : 10,
          color: "var(--amber)",
          padding: "14px 16px",
          fontSize: 16,
          wordBreak: "break-all",
          marginBottom: 12,
        }}
      >
        {link}
      </div>
      <CopyLinkButton link={link} condensed={condensed} />
      <p style={{ color: condensed ? "rgba(255,255,255,0.7)" : "var(--slate)", fontSize: 15, lineHeight: 1.5, marginTop: 14 }}>
        Share it anywhere. Every RSVP through your link counts toward your score on the leaderboard.
        Bookmark your link too — visiting it again is also how you check your live count later.
      </p>
      <SaveCalendarLink condensed={condensed} />
    </div>
  );
}

// Shown on both SignupSuccess branches - becoming an ambassador only happens
// after RSVPing first (rsvp -> offer -> games-detail -> signup), so everyone
// who lands here already has an RSVP on file, same as the decliners who get
// routed straight to /save. This is the one place ambassadors themselves see
// the prompt, since handleDecline only fires for people who said no.
function SaveCalendarLink({ condensed = false }: { condensed?: boolean }) {
  return (
    <a
      href="/save"
      style={{
        display: "inline-block",
        marginTop: 16,
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: "0.02em",
        textTransform: "uppercase",
        color: condensed ? "var(--ivory)" : "var(--ink)",
        border: condensed ? "1.5px solid var(--ivory)" : "1.5px solid var(--line)",
        borderRadius: condensed ? 0 : 8,
        padding: "10px 18px",
        textDecoration: "none",
      }}
    >
      Save The Reveal to your calendar
    </a>
  );
}

// Falls back to the older execCommand approach when the async Clipboard API
// throws - which it reliably does inside an iframe without clipboard-write
// permission (e.g. the Squarespace embed widget), on insecure/older
// browsers, or in some in-app webviews. Without this, the button silently
// did nothing in exactly those cases.
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

function CopyLinkButton({ link, condensed = false }: { link: string; condensed?: boolean }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function handleCopy() {
    const fullUrl = `https://${link}`;
    let ok = false;
    try {
      await navigator.clipboard.writeText(fullUrl);
      ok = true;
    } catch {
      ok = copyToClipboard(fullUrl);
    }
    setStatus(ok ? "copied" : "failed");
    setTimeout(() => setStatus("idle"), 2500);
  }

  const label = status === "copied" ? "Copied ✓" : status === "failed" ? "Couldn't copy — select above" : "Copy link";
  const idleBorder = condensed ? "var(--ivory)" : "var(--line)";

  return (
    <button
      onClick={handleCopy}
      style={{
        fontFamily: "var(--font-mono)",
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: "0.02em",
        textTransform: "uppercase",
        padding: "9px 18px",
        borderRadius: condensed ? 0 : 8,
        border: "1.5px solid var(--line)",
        background: status === "copied" ? "var(--success)" : status === "failed" ? "var(--rebel-red)" : "transparent",
        color: status === "idle" ? (condensed ? "var(--ivory)" : "var(--ink)") : "#fff",
        borderColor: status === "copied" ? "var(--success)" : status === "failed" ? "var(--rebel-red)" : idleBorder,
        transition: "all 0.15s ease",
      }}
    >
      {label}
    </button>
  );
}
