import type { Metadata } from "next";
import { CodeEntryScreen } from "@/features/tv/CodeEntry";

export const metadata: Metadata = {
  title: "Écran de classe — Bac à Mèmes",
  description: "L'écran à projeter au tableau pendant la partie.",
};

export default function TvIndexPage() {
  return <CodeEntryScreen />;
}
