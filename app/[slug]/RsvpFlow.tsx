"use client";

import { useState, useRef, useEffect } from "react";

type Step = "rsvp" | "offer" | "signup" | "signup-success";

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
}: {
  affiliateSlug: string;
  affiliateName: string;
  // The "[Name] is holding a spot for you" line makes sense on the personal
  // /[slug] page but not inside the embed, which sits on a generic hub page
  // with no per-visitor personalization context.
  showIntro?: boolean;
}) {
  const [step, setStep] = useState<Step>("rsvp");
  const [newSlug, setNewSlug] = useState<string | null>(null);

  return (
    <div className="card">
      {step === "rsvp" && (
        <RsvpForm
          affiliateSlug={affiliateSlug}
          affiliateName={affiliateName}
          showIntro={showIntro}
          onDone={() => setStep("offer")}
        />
      )}
      {step === "offer" && <Offer onYes={() => setStep("signup")} onNo={() => setStep("signup-success")} />}
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
  onDone,
}: {
  affiliateSlug: string;
  affiliateName: string;
  showIntro: boolean;
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
          <input type="checkbox" checked={smsConsent} onChange={(e) => setSmsConsent(e.target.checked)} />
          <span>I agree to receive event updates by text at the number above.</span>
        </label>
      )}

      {error && <p className="error">{error}</p>}

      <button type="submit" className="cta" disabled={submitting}>
        {submitting ? "Saving..." : "RSVP now"}
      </button>

      <style>{`
        .title { font-family: var(--font-display); font-size: 26px; text-transform: uppercase; margin: 0 0 16px; }
        .sub { color: var(--slate); margin: 0 0 20px; font-size: 15px; line-height: 1.5; }
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
      <p className="check">✓ You're in.</p>
      <h2 className="title">Want your own scoreboard?</h2>
      <p className="sub">
        Get a personal link, invite people yourself, and see your name climb the leaderboard.
      </p>
      <div className="row">
        <button className="cta" onClick={onYes}>
          Join the game
        </button>
        <button className="secondary" onClick={onNo}>
          No thanks
        </button>
      </div>
      <style>{`
        .check { font-family: var(--font-mono); color: var(--success); font-weight: 700; margin: 0 0 4px; }
        .title { font-family: var(--font-display); font-size: 26px; text-transform: uppercase; margin: 0 0 6px; }
        .sub { color: var(--slate); margin: 0 0 20px; font-size: 15px; line-height: 1.5; }
        .row { display: flex; gap: 10px; flex-wrap: wrap; }
        .cta {
          flex: 1; min-width: 160px; background: var(--rebel-red); color: #fff; border: none;
          border-radius: 10px; padding: 14px; font-weight: 700; font-size: 16px;
        }
        .secondary {
          flex: 1; min-width: 120px; background: transparent; color: var(--ink);
          border: 1.5px solid var(--line); border-radius: 10px; padding: 14px; font-weight: 600; font-size: 15px;
        }
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
          <span className="slugPrefix">therebelevent.com/</span>
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

  const link = `therebelevent.com/${newSlug}`;

  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontFamily: "var(--font-mono)", color: "var(--success)", fontWeight: 700, marginBottom: 4 }}>
        ✓ You're in the game
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
          marginBottom: 14,
        }}
      >
        {link}
      </div>
      <p style={{ color: "var(--slate)", fontSize: 15, lineHeight: 1.5 }}>
        Share it anywhere. Every RSVP through your link counts toward your score on the leaderboard.
        We've sent a copy of this link to your email.
      </p>
    </div>
  );
}
