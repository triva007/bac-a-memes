"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ApiFailure, GameApi } from "@/features/game/props";
import type { Settings } from "@/lib/game/types";
import { sfx } from "@/lib/sfx";

const DEBOUNCE_MS = 350;

export interface SettingsDraft {
  /** réglages à afficher : ceux du serveur + les modifications locales pas encore confirmées */
  settings: Settings;
  /** modifie un ou plusieurs réglages (affichage immédiat, envoi groupé après un court délai) */
  set(patch: Partial<Settings>): void;
  /** envoie tout de suite ce qui attend (à appeler avant de lancer la partie) */
  flush(): Promise<void>;
  /** dernier refus du serveur, à afficher */
  error: string | null;
}

/**
 * Réglages du salon côté hôte : affichage optimiste + envoi anti-rafale.
 * Les modifications rapprochées (un stepper martelé, une liste de noms) partent en un seul `settings`.
 */
export function useSettingsDraft(server: Settings, api: GameApi): SettingsDraft {
  const [pending, setPending] = useState<Partial<Settings>>({});
  const [error, setError] = useState<string | null>(null);
  const queueRef = useRef<Partial<Settings>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runningRef = useRef<Promise<void> | null>(null);

  const flush = useCallback((): Promise<void> => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (runningRef.current) return runningRef.current;
    const run = (async () => {
      while (Object.keys(queueRef.current).length > 0) {
        const patch = queueRef.current;
        queueRef.current = {};
        try {
          await api.send({ type: "settings", patch });
          // la vue serveur contient maintenant ces valeurs : on lâche les clés non retouchées entre-temps
          setPending((prev) => {
            const next = { ...prev };
            for (const key of Object.keys(patch) as (keyof Settings)[]) {
              if (!(key in queueRef.current)) delete next[key];
            }
            return next;
          });
        } catch (e) {
          queueRef.current = {};
          setPending({});
          setError((e as Partial<ApiFailure>).message || "Réglage refusé par le serveur.");
          sfx.play("error");
        }
      }
    })().finally(() => {
      runningRef.current = null;
    });
    runningRef.current = run;
    return run;
  }, [api]);

  const set = useCallback(
    (patch: Partial<Settings>) => {
      queueRef.current = { ...queueRef.current, ...patch };
      setPending((prev) => ({ ...prev, ...patch }));
      setError(null);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        void flush();
      }, DEBOUNCE_MS);
    },
    [flush],
  );

  // en quittant l'écran, ne pas perdre la dernière modification
  useEffect(
    () => () => {
      if (timerRef.current) void flush();
    },
    [flush],
  );

  const settings = useMemo(() => ({ ...server, ...pending }), [server, pending]);
  return { settings, set, flush, error };
}
