"use client";

import { useSyncExternalStore } from "react";
import { sfx } from "@/lib/sfx";

const noopSubscribe = () => () => {};

/** Faux pendant le rendu serveur et l'hydratation, vrai ensuite. */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/** Préférence « son coupé », synchronisée avec `sfx` (et donc entre tous les boutons son). */
export function useSfxMuted(): boolean {
  return useSyncExternalStore(
    sfx.subscribe,
    () => sfx.isMuted(),
    () => false,
  );
}

/** Copie un texte dans le presse-papiers, avec repli pour les contextes non sécurisés (http en salle). */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* on tente le repli */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
