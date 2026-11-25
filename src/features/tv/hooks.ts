"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { sfx } from "@/lib/sfx";
import type { GameApi } from "@/features/game/props";

const noopSubscribe = () => () => {};

/** Vrai quand la souris (ou le clavier) n'a pas bougé depuis `ms`. */
export function useIdle(ms = 2800): boolean {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const wake = () => {
      setIdle(false);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), ms);
    };
    wake();
    const events = ["mousemove", "mousedown", "keydown", "touchstart"] as const;
    for (const e of events) window.addEventListener(e, wake, { passive: true });
    return () => {
      if (timer) clearTimeout(timer);
      for (const e of events) window.removeEventListener(e, wake);
    };
  }, [ms]);
  return idle;
}

function subscribeFullscreen(cb: () => void) {
  document.addEventListener("fullscreenchange", cb);
  return () => document.removeEventListener("fullscreenchange", cb);
}

/** Plein écran (Fullscreen API), entièrement protégé. */
export function useFullscreen() {
  const active = useSyncExternalStore(
    subscribeFullscreen,
    () => document.fullscreenElement != null,
    () => false,
  );
  const supported = useSyncExternalStore(
    noopSubscribe,
    () => document.fullscreenEnabled === true,
    () => false,
  );
  const enter = useCallback(async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: "hide" });
    } catch {
      /* refusé par le navigateur : on reste en fenêtre */
    }
  }, []);
  const toggle = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen({ navigationUI: "hide" });
    } catch {
      /* rien */
    }
  }, []);
  return { active, supported, enter, toggle };
}

/** Garde l'écran éveillé tant que `enabled` (Wake Lock API, repris au retour sur l'onglet). */
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let lock: WakeLockSentinel | null = null;
    let stopped = false;
    const acquire = async () => {
      try {
        if (stopped || document.visibilityState !== "visible") return;
        if (!("wakeLock" in navigator) || (lock && !lock.released)) return;
        const next = await navigator.wakeLock.request("screen");
        if (stopped) void next.release().catch(() => {});
        else lock = next;
      } catch {
        /* non pris en charge, batterie faible, onglet masqué… tant pis */
      }
    };
    void acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", acquire);
      try {
        void lock?.release().catch(() => {});
      } catch {
        /* rien */
      }
    };
  }, [enabled]);
}

export function useSfxMuted(): boolean {
  return useSyncExternalStore(
    sfx.subscribe,
    () => sfx.isMuted(),
    () => false,
  );
}

/** Hôte de la page (ex. « bac-a-memes.vercel.app ») et origine ; vides pendant le rendu serveur. */
export function useLocation(): { host: string; origin: string } {
  const host = useSyncExternalStore(
    noopSubscribe,
    () => window.location.host,
    () => "",
  );
  const origin = useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => "",
  );
  return { host, origin };
}

/** Compteur qui avance toutes les `everyMs` (horloge serveur) : sert de graine aux phrases qui tournent. */
export function useRotation(everyMs: number, api: Pick<GameApi, "serverNow">): number {
  const [n, setN] = useState(() => Math.floor(api.serverNow() / everyMs));
  useEffect(() => {
    const id = setInterval(() => setN(Math.floor(api.serverNow() / everyMs)), 500);
    return () => clearInterval(id);
  }, [api, everyMs]);
  return n;
}

/**
 * Déroule une suite d'étapes minutées. Renvoie l'index de l'étape courante.
 * Arrivé au bout : repart de `loopFrom` (ou reste sur la dernière si `loopFrom` est null).
 */
export function useSequence(durationsMs: readonly number[], loopFrom: number | null = null): number {
  const [step, setStep] = useState(0);
  const count = durationsMs.length;
  const current = Math.min(step, Math.max(0, count - 1));
  const duration = durationsMs[current] ?? 0;
  useEffect(() => {
    if (count === 0) return;
    const last = current >= count - 1;
    if (last && loopFrom === null) return;
    const id = setTimeout(() => setStep(last ? Math.min(loopFrom ?? 0, count - 1) : current + 1), duration);
    return () => clearTimeout(id);
  }, [count, current, duration, loopFrom]);
  return current;
}

/** Vrai `afterMs` après le montage (petits enchaînements : apparition retardée, etc.). */
export function useDelayed(afterMs: number): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setOn(true), afterMs);
    return () => clearTimeout(id);
  }, [afterMs]);
  return on;
}

/** Planifie des effets (sons, confettis) relatifs au montage ; tout est annulé au démontage. */
export function useCues(cues: readonly (readonly [number, () => void])[]) {
  const ref = useRef(cues);
  useEffect(() => {
    const ids = ref.current.map(([ms, fn]) => setTimeout(fn, ms));
    return () => ids.forEach(clearTimeout);
  }, []);
}
