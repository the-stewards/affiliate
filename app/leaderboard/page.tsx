import type { Metadata } from "next";
import LeaderboardClient from "./LeaderboardClient";

export const metadata: Metadata = {
  title: "Rebel Games Leaderboard",
  description: "Live standings for the Rebel Ambassador Games — Rebel 2027 Launch Call.",
  openGraph: {
    title: "Rebel Games Leaderboard",
    description: "Live standings for the Rebel Ambassador Games — Rebel 2027 Launch Call.",
    images: ["/leaderboard-og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rebel Games Leaderboard",
    description: "Live standings for the Rebel Ambassador Games — Rebel 2027 Launch Call.",
    images: ["/leaderboard-og.png"],
  },
};

export default function LeaderboardPage() {
  return <LeaderboardClient />;
}
