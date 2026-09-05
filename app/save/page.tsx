import type { Metadata } from "next";
import SaveClient from "./SaveClient";

export const metadata: Metadata = {
  title: "Save to Your Calendar — Rebel Event 2027: The Reveal",
  description: "Save Rebel Event 2027: The Reveal to your calendar — live on YouTube, Oct 21, 2026.",
  openGraph: {
    title: "Save to Your Calendar — Rebel Event 2027: The Reveal",
    description: "Save Rebel Event 2027: The Reveal to your calendar — live on YouTube, Oct 21, 2026.",
    images: ["/save-og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Save to Your Calendar — Rebel Event 2027: The Reveal",
    description: "Save Rebel Event 2027: The Reveal to your calendar — live on YouTube, Oct 21, 2026.",
    images: ["/save-og.png"],
  },
};

export default function SavePage() {
  return <SaveClient />;
}
