"use client";

import { useEffect } from "react";

/**
 * Garde l'écran allumé tant que `active` est vrai (Wake Lock API).
 * Le verrou est perdu quand l'onglet passe en arrière-plan : on le redemande au retour.
 * Tout est protégé : API absente (vieux navigateurs, http), refus du système (batterie faible)…
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;
    let pending = false;

    const acquire = async () => {
      if (cancelled || pending || document.visibilityState !== "visible") return;
      if (sentinel && !sentinel.released) return;
      pending = true;
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          lock.release().catch(() => {});
        } else {
          sentinel = lock;
        }
      } catch {
        /* refusé : tant pis, l'écran s'éteindra comme d'habitude */
      } finally {
        pending = false;
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    // certains navigateurs n'accordent le verrou qu'après un geste
    window.addEventListener("pointerdown", onVisible, { passive: true });

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pointerdown", onVisible);
      try {
        sentinel?.release().catch(() => {});
      } catch {
        /* rien */
      }
      sentinel = null;
    };
  }, [active]);
}
