import Link from "next/link";

export default function NotFound() {
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
        background: "var(--ivory)",
      }}
    >
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px,7vw,44px)", textTransform: "uppercase", margin: "0 0 12px" }}>
        That link isn't live
      </h1>
      <p style={{ color: "var(--slate)", maxWidth: 420, marginBottom: 24 }}>
        Double check the link you were sent, or find the leaderboard below.
      </p>
      <Link
        href="/leaderboard"
        style={{
          fontFamily: "var(--font-mono)",
          background: "var(--rebel-red)",
          color: "#fff",
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
