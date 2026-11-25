"use client";

import { useRef, type RefObject } from "react";
import { MemeView } from "@/components/meme/MemeView";
import type { Meme } from "@/lib/game/types";
import { useNearViewport } from "@/features/vote/shared";

/**
 * Mème monté seulement quand sa case approche de la zone visible (et démonté
 * quand elle s'en éloigne) : une galerie de 90 mèmes reste légère.
 * Le parent doit donner une taille à la case (`className`).
 */
export function LazyMeme({
  meme,
  rootRef,
  margin,
  className,
}: {
  meme: Meme;
  /** conteneur qui défile (sinon la fenêtre) */
  rootRef?: RefObject<Element | null>;
  margin?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const near = useNearViewport(ref, rootRef, margin);
  return (
    <div ref={ref} className={className} data-lazy-meme={near ? "on" : "off"}>
      {near ? <MemeView meme={meme} fit="contain" /> : null}
    </div>
  );
}
