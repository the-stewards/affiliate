"use client";

import { useState } from "react";

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

export default function FindLinkForm() {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ slug: string; displayName: string } | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/affiliates/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, website }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Try again.");
        setResult(null);
      } else {
        setResult({ slug: data.slug, displayName: data.displayName });
      }
    } catch {
      setError("Couldn't reach the server — check your connection and try again.");
    } finally {
      setStatus("idle");
    }
  }

  async function handleCopy(link: string) {
    const fullUrl = `https://${link}`;
    let ok = false;
    try {
      await navigator.clipboard.writeText(fullUrl);
      ok = true;
    } catch {
      ok = copyToClipboard(fullUrl);
    }
    setCopyStatus(ok ? "copied" : "failed");
    setTimeout(() => setCopyStatus("idle"), 2500);
  }

  if (result) {
    const link = `join.therebelevent.com/${result.slug}`;
    return (
      <div className="findLink">
        <p className="found">Found it, {result.displayName.split(" ")[0]}</p>
        <div className="linkBox">{link}</div>
        <button type="button" className="copyBtn" onClick={() => handleCopy(link)}>
          {copyStatus === "copied" ? "Copied ✓" : copyStatus === "failed" ? "Couldn't copy — select above" : "Copy link"}
        </button>

        <style>{`
          .findLink { display: flex; flex-direction: column; align-items: center; gap: 10px; margin-top: 8px; }
          .found { font-family: var(--font-mono); color: var(--success); font-weight: 700; font-size: 14px; margin: 0; }
          .linkBox {
            font-family: var(--font-mono); background: rgba(255,255,255,0.08); color: var(--amber);
            border-radius: 10px; padding: 12px 16px; font-size: 15px; word-break: break-all; width: 100%; max-width: 340px;
          }
          .copyBtn {
            font-family: var(--font-mono); font-weight: 700; font-size: 12px; letter-spacing: 0.02em;
            text-transform: uppercase; padding: 9px 18px; border-radius: 8px; border: 1.5px solid rgba(255,255,255,0.3);
            background: transparent; color: var(--ivory); cursor: pointer;
          }
        `}</style>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="findLink">
      <input
        type="email"
        required
        placeholder="Email you signed up with"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="emailInput"
      />
      <input
        type="text"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />
      <button type="submit" className="submitBtn" disabled={status === "loading"}>
        {status === "loading" ? "Looking…" : "Find my link"}
      </button>
      {error && <p className="findError">{error}</p>}

      <style>{`
        .findLink { display: flex; flex-direction: column; align-items: center; gap: 10px; margin-top: 8px; width: 100%; max-width: 320px; }
        .emailInput {
          width: 100%; font-family: var(--font-body); font-size: 15px; padding: 12px 14px;
          border-radius: 10px; border: 1.5px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05);
          color: var(--ivory);
        }
        .emailInput::placeholder { color: rgba(255,255,255,0.4); }
        .emailInput:focus { outline: 2px solid var(--amber); outline-offset: 1px; }
        .submitBtn {
          font-family: var(--font-mono); font-weight: 700; font-size: 13px; letter-spacing: 0.02em;
          text-transform: uppercase; padding: 11px 22px; border-radius: 10px; border: none;
          background: var(--amber); color: var(--ink); cursor: pointer; width: 100%;
        }
        .submitBtn:disabled { opacity: 0.6; cursor: default; }
        .findError { font-family: var(--font-mono); color: var(--rebel-red); font-size: 13px; margin: 0; }
      `}</style>
    </form>
  );
}
