"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";

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

export default function RsvpFlow({
  affiliateSlug,
  affiliateName,
  showIntro = true,
  totalRsvpCount,
}: {
  affiliateSlug: string;
  affiliateName: string;
  // The "[Name] is holding a spot for you" line makes sense on the personal
  // /[slug] page but not inside the embed, which sits on a generic hub page
  // with no per-visitor personalization context.
  showIntro?: boolean;
  // Event-wide RSVP count, shown as social proof on the initial form only.
  totalRsvpCount?: number;
}) {
  const [step, setStep] = useState<Step>("rsvp");
  const [newSlug, setNewSlug] = useState<string | null>(null);
  const router = useRouter();

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
    <div className="card">
      {step === "rsvp" && (
        <RsvpForm
          affiliateSlug={affiliateSlug}
          affiliateName={affiliateName}
          showIntro={showIntro}
          totalRsvpCount={totalRsvpCount}
          onDone={() => setStep("offer")}
        />
      )}
      {step === "offer" && <Offer onYes={() => setStep("games-detail")} onNo={handleDecline} />}
      {step === "games-detail" && (
        <GamesDetail
          totalRsvpCount={totalRsvpCount}
          onYes={() => setStep("signup")}
          onNo={handleDecline}
        />
      )}
      {step === "signup" && (
        <SignupForm
          referredBySlug={affiliateSlug}
          onDone={(slug) => {
            setNewSlug(slug);
            setStep("signup-success");
          }}
        />
      )}
      {step === "signup-success" && <SignupSuccess newSlug={newSlug} />}

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
      `}</style>
    </div>
  );
}

function RsvpForm({
  affiliateSlug,
  affiliateName,
  showIntro,
  totalRsvpCount,
  onDone,
}: {
  affiliateSlug: string;
  affiliateName: string;
  showIntro: boolean;
  totalRsvpCount?: number;
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    <form onSubmit={handleSubmit}>
      <h2 className="title">Save your seat</h2>
      {typeof totalRsvpCount === "number" && totalRsvpCount > 0 && (
        <div className="headcountRow">
          <div className="headcountPill">
            <span className="pulse" />
            <span className="headcountNum">{totalRsvpCount.toLocaleString()}</span>
            <span className="headcountLabel">are coming to Rebel Event 2027: The Reveal &mdash; LIVE</span>
          </div>
        </div>
      )}
      <p className="eventMeta">Wednesday, October 21, 2026 &middot; 12:00&ndash;1:00 PM ET</p>
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
          <span>First name</span>
          <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First" />
        </label>
        <label className="field">
          <span>Last name</span>
          <input required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last" />
        </label>
      </div>
      <label className="field">
        <span>Email</span>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
        />
      </label>
      <label className="field">
        <span>Phone (optional)</span>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(555) 555-5555"
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
        {submitting ? "Saving..." : "RSVP now"}
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
          width: 8px; height: 8px; border-radius: 50%; background: var(--rebel-red);
          flex-shrink: 0; animation: headcountPulse 1.6s ease-in-out infinite;
        }
        @keyframes headcountPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.8); }
        }
        .headcountNum {
          font-family: var(--font-mono); font-weight: 700; font-size: 19px; color: var(--amber);
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
      `}</style>
    </form>
  );
}

function Offer({ onYes, onNo }: { onYes: () => void; onNo: () => void }) {
  return (
    <div>
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
      `}</style>
    </div>
  );
}

function GamesDetail({
  totalRsvpCount,
  onYes,
  onNo,
}: {
  totalRsvpCount?: number;
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <div>
      <span className="eyebrow">Rebel Ambassador Games</span>
      <h2 className="title">Bring your people. Win the games.</h2>
      <p className="sub">
        Every person you invite to the Rebel 2027 Launch Call counts toward your score. You're helping
        them land a seat in the room — and the more you bring, the better your shot at the podium.
      </p>

      {typeof totalRsvpCount === "number" && totalRsvpCount > 0 && (
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
          font-family: var(--font-mono); font-weight: 700; font-size: 19px; color: var(--amber);
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
      `}</style>
    </div>
  );
}

function SignupForm({ referredBySlug, onDone }: { referredBySlug: string; onDone: (slug: string) => void }) {
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
    <form onSubmit={handleSubmit}>
      <h2 className="title">Set up your link</h2>

      <input
        ref={honeypotRef}
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
      />

      <label className="field">
        <span>Name</span>
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
      </label>
      <label className="field">
        <span>Email</span>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
        />
      </label>
      <label className="field">
        <span>Phone (optional)</span>
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 555-5555" />
      </label>
      <label className="field">
        <span>Your link</span>
        <div className="slugRow">
          <span className="slugPrefix">join.therebelevent.com/</span>
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

function SignupSuccess({ newSlug }: { newSlug: string | null }) {
  if (!newSlug) {
    return (
      <div style={{ textAlign: "center" }}>
        <p style={{ fontFamily: "var(--font-mono)", color: "var(--success)", fontWeight: 700, marginBottom: 4 }}>
          ✓ RSVP confirmed
        </p>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, textTransform: "uppercase", margin: "0 0 8px" }}>
          See you there.
        </h2>
        <p style={{ color: "var(--slate)", fontSize: 15, lineHeight: 1.5 }}>
          We'll be in touch with the details.
        </p>
      </div>
    );
  }

  const link = `join.therebelevent.com/${newSlug}`;

  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontFamily: "var(--font-mono)", color: "var(--success)", fontWeight: 700, marginBottom: 4 }}>
        ✓ You're in the Rebel Ambassador Games
      </p>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, textTransform: "uppercase", margin: "0 0 12px" }}>
        Your link is live
      </h2>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          background: "var(--ink)",
          color: "var(--amber)",
          borderRadius: 10,
          padding: "14px 16px",
          fontSize: 16,
          wordBreak: "break-all",
          marginBottom: 12,
        }}
      >
        {link}
      </div>
      <CopyLinkButton link={link} />
      <p style={{ color: "var(--slate)", fontSize: 15, lineHeight: 1.5, marginTop: 14 }}>
        Share it anywhere. Every RSVP through your link counts toward your score on the leaderboard.
        Bookmark your link too — visiting it again is also how you check your live count later.
      </p>
    </div>
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

function CopyLinkButton({ link }: { link: string }) {
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
        borderRadius: 8,
        border: "1.5px solid var(--line)",
        background: status === "copied" ? "var(--success)" : status === "failed" ? "var(--rebel-red)" : "transparent",
        color: status === "idle" ? "var(--ink)" : "#fff",
        borderColor: status === "copied" ? "var(--success)" : status === "failed" ? "var(--rebel-red)" : "var(--line)",
        transition: "all 0.15s ease",
      }}
    >
      {label}
    </button>
  );
}
