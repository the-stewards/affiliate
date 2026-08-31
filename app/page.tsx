import Link from "next/link";
import FindLinkForm from "./FindLinkForm";

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
        Lost your link?
      </h1>
      <p style={{ color: "rgba(255,255,255,0.7)", maxWidth: 420, marginBottom: 24 }}>
        If you're already an ambassador, enter the email you signed up with and we'll find it.
      </p>
      <FindLinkForm />
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 28 }}>
        Not an ambassador yet? Ask whoever invited you for their link, or{" "}
        <Link href="/leaderboard" style={{ color: "var(--amber)" }}>
          check the leaderboard
        </Link>
        .
      </p>
    </main>
  );
}
