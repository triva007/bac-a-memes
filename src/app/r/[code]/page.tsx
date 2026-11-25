import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GameShell } from "@/features/shell/GameShell";
import { NotFoundScreen } from "@/features/shell/StatusScreens";

type Params = Promise<{ code: string }>;

function normalize(raw: string): string {
  let code = raw;
  try {
    code = decodeURIComponent(raw);
  } catch {
    /* séquence invalide : on garde la valeur brute */
  }
  return code.trim().toUpperCase();
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const code = normalize((await params).code);
  return /^[A-Z]{4}$/.test(code)
    ? { title: `Salle ${code} — Bac à Mèmes`, description: `Rejoins la salle ${code} et fabrique ton mème.` }
    : { title: "Salle introuvable — Bac à Mèmes" };
}

/** Page de jeu : salon d'attente, création, vote, résultats, podium. */
export default async function RoomPage({ params }: { params: Params }) {
  const { code: raw } = await params;
  const code = normalize(raw);
  if (!/^[A-Z]{4}$/.test(code)) return <NotFoundScreen code={code.slice(0, 12)} />;
  if (code !== raw) redirect(`/r/${code}`);
  return <GameShell code={code} />;
}
