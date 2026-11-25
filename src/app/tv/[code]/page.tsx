import type { Metadata } from "next";
import { TvScreen } from "@/features/tv/TvScreen";

export async function generateMetadata({ params }: PageProps<"/tv/[code]">): Promise<Metadata> {
  const { code } = await params;
  return { title: `Écran de classe ${code.toUpperCase().slice(0, 8)} — Bac à Mèmes` };
}

export default async function TvPage({ params }: PageProps<"/tv/[code]">) {
  const { code } = await params;
  return <TvScreen code={code} />;
}
