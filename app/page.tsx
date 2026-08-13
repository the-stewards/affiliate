import Link from "next/link";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: 24,
        background: "var(--ink)",
        color: "var(--ivory)",
      }}
    >
      <span style={{ fontFamily: "var(--font-mono)", color: "var(--amber)", letterSpacing: "0.12em", textTransform: "uppercase", fontSize: 13 }}>
        Rebel
      </span>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px,8vw,52px)", textTransform: "uppercase", margin: "8px 0 20px" }}>
        You need a link
      </h1>
      <p style={{ color: "rgba(247,243,234,0.7)", maxWidth: 420, marginBottom: 24 }}>
        This site works through a personal invite link. If someone sent you here directly, ask them for their link — or check the leaderboard.
      </p>
      <Link
        href="/leaderboard"
        style={{
          fontFamily: "var(--font-mono)",
          background: "var(--amber)",
          color: "var(--ink)",
          padding: "12px 22px",
          borderRadius: 10,
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        View leaderboard →
      </Link>
    </main>
  );
}
