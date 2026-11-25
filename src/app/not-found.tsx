import type { Metadata } from "next";
import { MessageScreen } from "@/features/shell/StatusScreens";

export const metadata: Metadata = { title: "Page introuvable — Bac à Mèmes" };

export default function NotFound() {
  return (
    <MessageScreen emoji="dotted-line-face" title="Cette page a séché le cours">
      Rien à cette adresse. Si tu cherchais une salle, repars de l&apos;accueil et tape son code à 4 lettres.
    </MessageScreen>
  );
}
