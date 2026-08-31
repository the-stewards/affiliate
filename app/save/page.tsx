import type { Metadata } from "next";
import SaveClient from "./SaveClient";

export const metadata: Metadata = {
  title: "Save to Your Calendar — Rebel Event 2027: The Reveal",
  description: "Save Rebel Event 2027: The Reveal to your calendar — live on YouTube, Oct 21, 2026.",
};

export default function SavePage() {
  return <SaveClient />;
}
