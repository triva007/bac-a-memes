"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { flushSync } from "react-dom";
import type { ApiFailure, GameApi } from "@/features/game/props";
import type { Meme } from "@/lib/game/types";
import { sfx } from "@/lib/sfx";

// ------------------------------------------------------------------ zone visible (clavier du téléphone)

export interface ViewportBox {
  /** hauteur réellement visible de l'élément (clavier virtuel déduit) */
  h: number;
  /** décalage à appliquer si le navigateur a fait glisser la page sous le clavier */
  shift: number;
  /** hauteur complète de l'élément */
  full: number;
  /** largeur de l'élément */
  w: number;
}

/**
 * Mesure la partie de `ref` réellement visible à l'écran, en tenant compte du
 * clavier virtuel (`window.visualViewport`). iOS ne réduit pas la page quand le
 * clavier s'ouvre : sans ça, le champ actif passerait dessous.
 * Renvoie null tant que rien n'est mesuré (la mise en page CSS sert de repli).
 */
export function useViewportBox(ref: RefObject<HTMLElement | null>): ViewportBox | null {
  const [box, setBox] = useState<ViewportBox | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const vv = window.visualViewport ?? null;
    let raf = 0;
    let first = true;
    let lastReset = 0;

    const measure = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      if (r.height <= 0) return;
      // pincement pour zoomer : on ne touche à rien
      const zoomed = vv ? Math.abs(vv.scale - 1) > 0.01 : false;
      const visTop = vv && !zoomed ? vv.offsetTop : 0;
      const visBottom = vv && !zoomed ? vv.offsetTop + vv.height : window.innerHeight;
      const top = Math.max(r.top, visTop);
      const bottom = Math.min(r.bottom, visBottom);
      const next: ViewportBox = {
        h: Math.max(140, Math.round(bottom - top)),
        shift: Math.max(0, Math.round(top - r.top)),
        full: Math.round(r.height),
        w: Math.round(r.width),
      };
      const update = () => setBox((prev) => (prev && prev.h === next.h && prev.shift === next.shift && prev.full === next.full && prev.w === next.w ? prev : next));
      if (first) {
        first = false;
        flushSync(update);
      } else update();

      // iOS a fait glisser la page pour montrer le champ : maintenant que la mise en
      // page tient au-dessus du clavier, on la remet en place (au plus 2 fois par seconde)
      if (vv && !zoomed && (vv.offsetTop > 1 || window.scrollY > 1) && el.contains(document.activeElement)) {
        const now = performance.now();
        if (now - lastReset > 500) {
          lastReset = now;
          window.scrollTo(0, 0);
        }
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    ro?.observe(el);
    if (!ro) schedule();
    vv?.addEventListener("resize", schedule);
    vv?.addEventListener("scroll", schedule);
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    // le conteneur peut encore bouger (transition d'entrée du shell) : on revérifie un peu plus tard
    const later = [setTimeout(schedule, 350), setTimeout(schedule, 900)];
    return () => {
      later.forEach(clearTimeout);
      if (raf) cancelAnimationFrame(raf);
      ro?.disconnect();
      vv?.removeEventListener("resize", schedule);
      vv?.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
    };
  }, [ref]);

  return box;
}

// ------------------------------------------------------------------ pression du temps

export interface TimePressure {
  /** secondes restantes (entier, arrondi au supérieur) dans les 10 dernières secondes, sinon null */
  secs: number | null;
  /** alerte visuelle : 5 dernières secondes */
  alert: boolean;
  /** temps écoulé (on attend que le serveur change de phase) */
  up: boolean;
}

const CALM: TimePressure = { secs: null, alert: false, up: false };

/**
 * Suit la fin de la phase sans faire re-rendre l'écran 4 fois par seconde :
 * l'état ne change qu'une fois par seconde, et seulement dans les 10 dernières.
 * `onNearEnd` est appelé une fois, ~2 s avant la fin (sauvegarde forcée du brouillon).
 */
export function useTimePressure(endsAt: number | null, api: Pick<GameApi, "serverNow">, options: { sound: boolean; onNearEnd?: () => void }): TimePressure {
  const [state, setState] = useState<TimePressure>(CALM);
  const optRef = useRef(options);
  useEffect(() => {
    optRef.current = options;
  });

  useEffect(() => {
    if (endsAt == null) return;
    let nearDone = false;
    let lastSecs: number | null = null;
    let wasUp: boolean | null = null;
    const tick = () => {
      const left = (endsAt - api.serverNow()) / 1000;
      const up = left <= 0;
      const secs = left <= 10 ? Math.max(0, Math.ceil(left)) : null;
      if (!nearDone && left <= 2.2) {
        nearDone = true;
        if (left > -1) optRef.current.onNearEnd?.();
      }
      if (secs !== lastSecs) {
        // pas de son au tout premier passage (page rechargée en pleine fin de manche)
        if (lastSecs !== null || secs === 10) {
          if (secs !== null && secs > 0 && optRef.current.sound) sfx.play("tick", Math.min(1, (11 - secs) / 10));
        }
        lastSecs = secs;
      }
      if (up !== wasUp) {
        if (up && wasUp === false) sfx.play("timeUp");
        wasUp = up;
      }
      const alert = secs !== null && secs <= 5 && !up;
      setState((prev) => (prev.secs === secs && prev.alert === alert && prev.up === up ? prev : { secs, alert, up }));
    };
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 200);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [endsAt, api]);

  return endsAt == null ? CALM : state;
}

// ------------------------------------------------------------------ sauvegarde automatique du brouillon

export interface DraftPayload {
  meme: Meme;
  usedJoker: boolean;
}

export interface Autosave {
  /** envoie tout de suite la dernière version (fin du temps, onglet masqué) */
  flushNow: () => void;
  /** délai court (fin de manche imminente) */
  hurry: () => void;
  /** signale que cette version est déjà connue du serveur (après un `submit`) */
  markSent: (payload: DraftPayload) => void;
}

const DEBOUNCE_MS = 1500;
const HURRY_MS = 300;
/** quelqu'un qui tape sans s'arrêter est quand même sauvegardé au moins toutes les ~6 s */
const MAX_WAIT_MS = 6000;

/**
 * Envoie l'action `draft` avec un délai anti-rafale : ~1,5 s après la dernière
 * modification, jamais plus d'une requête à la fois, la dernière version gagne.
 * `payload` null ou `enabled` faux = rien à envoyer.
 */
export function useAutosave(api: GameApi, payload: DraftPayload | null, enabled: boolean, onError: (failure: ApiFailure) => void): Autosave {
  const latest = useRef<{ json: string; payload: DraftPayload } | null>(null);
  const sentJson = useRef<string | null>(null);
  const inFlight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const delay = useRef(DEBOUNCE_MS);
  /** début de la série de modifications pas encore envoyées */
  const pendingSince = useRef<number | null>(null);
  const stopped = useRef(false);
  const enabledRef = useRef(enabled);
  const onErrorRef = useRef(onError);
  const flushRef = useRef<() => void>(() => {});

  const json = payload ? JSON.stringify(payload) : null;

  const clear = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const flush = useCallback(() => {
    clear();
    const cur = latest.current;
    if (!cur || stopped.current || !enabledRef.current) return;
    if (inFlight.current) return; // relancé à la fin de la requête en cours
    if (cur.json === sentJson.current) return;
    inFlight.current = true;
    pendingSince.current = null;
    const sending = cur.json;
    sentJson.current = sending;
    api
      .send({ type: "draft", meme: cur.payload.meme, usedJoker: cur.payload.usedJoker })
      .catch((e: ApiFailure) => {
        if (e?.error === "bad_phase") {
          stopped.current = true; // la phase a changé : plus rien à sauvegarder
        } else if (e?.error === "invalid") {
          onErrorRef.current(e); // même version : inutile de la renvoyer
        } else if (sentJson.current === sending) {
          sentJson.current = null; // réseau : on retentera
        }
      })
      .finally(() => {
        inFlight.current = false;
        const now = latest.current;
        if (now && now.json !== sentJson.current && !stopped.current && enabledRef.current) {
          clear();
          timer.current = setTimeout(() => flushRef.current(), sentJson.current === null ? 2000 : HURRY_MS);
        }
      });
  }, [api]);

  useEffect(() => {
    flushRef.current = flush;
    onErrorRef.current = onError;
    enabledRef.current = enabled;
  });

  // nouvelle version : on (re)lance le délai
  useEffect(() => {
    if (!json || !payload) {
      latest.current = null;
      clear();
      return;
    }
    latest.current = { json, payload };
    if (!enabled) {
      clear();
      return;
    }
    if (json === sentJson.current) return;
    clear();
    const now = Date.now();
    pendingSince.current ??= now;
    const wait = Math.max(HURRY_MS, Math.min(delay.current, MAX_WAIT_MS - (now - pendingSince.current)));
    timer.current = setTimeout(() => flushRef.current(), wait);
    // `payload` suit `json` : la version sérialisée suffit comme dépendance
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [json, enabled]);

  // onglet masqué / téléphone verrouillé : on n'attend pas
  useEffect(() => {
    const onHide = () => {
      if (document.hidden) flushRef.current();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      clear();
    };
  }, []);

  const flushNow = useCallback(() => flushRef.current(), []);
  const hurry = useCallback(() => {
    delay.current = HURRY_MS;
  }, []);
  const markSent = useCallback((p: DraftPayload) => {
    sentJson.current = JSON.stringify(p);
  }, []);

  return useMemo(() => ({ flushNow, hurry, markSent }), [flushNow, hurry, markSent]);
}
