"use client";

/**
 * Briques communes aux écrans vote / révélation / classement / podium :
 * avatar, compteur animé, barre de temps, confettis, rangs, montage paresseux.
 */
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type RefObject } from "react";
import { useReducedMotion } from "motion/react";
import { Emoji } from "@/components/ui/Emoji";
import { CANVAS_W } from "@/components/meme/palette";
import { usePersoImage } from "@/components/meme/perso";
import { getTemplate } from "@/lib/templates";
import type { GameApi } from "@/features/game/props";
import type { Meme, PlayerView, RoomView, VoteScore } from "@/lib/game/types";

// ---------------------------------------------------------------- notes

/** Couleur de chaque note : du papier tiède (Bof) au rose fluo (Mort de rire). */
export const SCORE_COLORS: Record<VoteScore, string> = {
  0: "var(--color-paper-2)",
  1: "var(--color-fluo-blue)",
  2: "var(--color-fluo-yellow)",
  3: "var(--color-fluo-pink)",
};

/** Couleur du macaron de points selon le palier de révélation (0 = bide … 4 = carton). */
export const TIER_COLORS = [
  "var(--color-paper-2)",
  "var(--color-fluo-blue)",
  "var(--color-fluo-yellow)",
  "var(--color-fluo-orange)",
  "var(--color-fluo-pink)",
] as const;

// ---------------------------------------------------------------- textes

export function pts(n: number): string {
  return n > 1 || n < -1 ? "points" : "point";
}

/** 1 -> "1er", 2 -> "2e"… */
export function ordinal(rank: number): string {
  return rank === 1 ? "1er" : `${rank}e`;
}

/** Nom de fichier sûr pour un export. */
export function slug(text: string): string {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24) || "meme"
  );
}

// ---------------------------------------------------------------- joueurs

export const FALLBACK_COLOR = "#8f8db3";

export function playerMap(players: PlayerView[]): Map<string, PlayerView> {
  return new Map(players.map((p) => [p.id, p]));
}

export interface Ranked {
  player: PlayerView;
  /** rang avec ex æquo (1, 1, 3…) */
  rank: number;
  tied: boolean;
}

/** Classe des joueurs déjà triés : même score = même rang. */
export function withRanks(sorted: PlayerView[], scoreOf: (p: PlayerView) => number = (p) => p.score): Ranked[] {
  const out: Ranked[] = [];
  sorted.forEach((player, i) => {
    const prev = out[i - 1];
    const rank = prev && scoreOf(prev.player) === scoreOf(player) ? prev.rank : i + 1;
    out.push({ player, rank, tied: false });
  });
  for (let i = 0; i < out.length; i++) {
    out[i].tied = out[i - 1]?.rank === out[i].rank || out[i + 1]?.rank === out[i].rank;
  }
  return out;
}

/** Tri stable par score décroissant (l'ordre d'arrivée départage). */
export function sortByScore(players: PlayerView[], scoreOf: (p: PlayerView) => number = (p) => p.score): PlayerView[] {
  return players
    .map((p, i) => ({ p, i }))
    .sort((a, b) => scoreOf(b.p) - scoreOf(a.p) || a.i - b.i)
    .map((x) => x.p);
}

export const MEDALS = ["1st-place-medal", "2nd-place-medal", "3rd-place-medal"] as const;

export function Avatar({
  avatar,
  color,
  size = 40,
  className,
  style,
}: {
  avatar: string;
  color?: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${className ?? ""}`}
      style={{
        width: size,
        height: size,
        background: color ?? FALLBACK_COLOR,
        border: `${size >= 44 ? 3 : 2}px solid var(--color-ink)`,
        ...style,
      }}
    >
      <Emoji id={avatar} size={Math.round(size * 0.66)} />
    </span>
  );
}

// ---------------------------------------------------------------- mèmes

/** Hauteur / largeur du canevas d'un mème (pour réserver la bonne place avant le rendu). */
export function useMemeRatio(meme: Meme): number {
  const perso = usePersoImage(meme.templateId);
  const height = getTemplate(meme.templateId)?.height ?? perso?.height ?? 640;
  return height / CANVAS_W;
}

// ---------------------------------------------------------------- animation

/** Nombre qui défile jusqu'à `value`. Sans animation si l'utilisateur les réduit. */
export function CountUp({
  value,
  from = 0,
  duration = 800,
  delay = 0,
}: {
  value: number;
  from?: number;
  duration?: number;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(from);
  const current = useRef(from);

  useEffect(() => {
    if (reduce) return;
    const start = current.current;
    if (start === value) return;
    let raf = 0;
    let t0: number | null = null;
    const step = (t: number) => {
      if (t0 === null) t0 = t;
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = Math.round(start + (value - start) * eased);
      current.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    const timer = setTimeout(() => {
      raf = requestAnimationFrame(step);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [value, duration, delay, reduce]);

  return <>{reduce ? value : shown}</>;
}

const CONFETTI_COLORS = ["#ffe94a", "#ff5fa2", "#5df2a0", "#5cc8ff", "#ff9a3d", "#fbf7ec"];

/** Confettis : "carton" (léger, deux gerbes), "podium" (généreux), "mini" (une pincée). */
export async function fireConfetti(kind: "carton" | "podium" | "mini"): Promise<void> {
  try {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const confetti = (await import("canvas-confetti")).default;
    const base = { colors: CONFETTI_COLORS, disableForReducedMotion: true, zIndex: 80 };
    if (kind === "mini") {
      void confetti({ ...base, particleCount: 26, spread: 70, startVelocity: 26, scalar: 0.8, ticks: 110, origin: { x: 0.5, y: 0.7 } });
      return;
    }
    if (kind === "carton") {
      void confetti({ ...base, particleCount: 38, angle: 62, spread: 58, startVelocity: 44, scalar: 0.85, ticks: 150, origin: { x: 0, y: 0.82 } });
      void confetti({ ...base, particleCount: 38, angle: 118, spread: 58, startVelocity: 44, scalar: 0.85, ticks: 150, origin: { x: 1, y: 0.82 } });
      return;
    }
    void confetti({ ...base, particleCount: 90, spread: 100, startVelocity: 46, origin: { x: 0.5, y: 0.55 } });
    setTimeout(() => {
      void confetti({ ...base, particleCount: 60, angle: 60, spread: 70, startVelocity: 52, origin: { x: 0, y: 0.75 } });
      void confetti({ ...base, particleCount: 60, angle: 120, spread: 70, startVelocity: 52, origin: { x: 1, y: 0.75 } });
    }, 350);
    setTimeout(() => {
      void confetti({ ...base, particleCount: 70, spread: 140, startVelocity: 32, scalar: 1.1, origin: { x: 0.5, y: 0.35 } });
    }, 900);
  } catch {
    // les confettis ne sont jamais indispensables
  }
}

// ---------------------------------------------------------------- minuteur

/** Barre de temps qui se vide. `left` et `total` en secondes. */
export function TimeBar({ left, total, className }: { left: number | null; total: number; className?: string }) {
  const ratio = left == null || total <= 0 ? 0 : Math.min(1, Math.max(0, left / total));
  const urgent = left != null && left <= 3;
  return (
    <div
      className={`h-2 overflow-hidden rounded-full bg-paper/15 ${className ?? ""}`}
      role="timer"
      aria-label={left == null ? "Pas de minuteur" : `${Math.ceil(left)} secondes restantes`}
    >
      <div
        className="h-full origin-left rounded-full"
        style={{
          width: "100%",
          transform: `scaleX(${ratio})`,
          background: urgent ? "var(--color-fluo-pink)" : "var(--color-fluo-yellow)",
          transition: left == null ? "none" : "transform 260ms linear, background-color 200ms",
        }}
      />
    </div>
  );
}

/**
 * Bouton « passer » de l'hôte : un seul envoi à la fois, et rien pendant la
 * première seconde et demie de la phase (le serveur l'ignorerait de toute façon).
 */
export function useSkip(view: RoomView, api: GameApi, left: number | null, total: number) {
  const [busyFor, setBusyFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const phaseKey = `${view.phase}:${view.round}:${view.vote?.memeId ?? ""}`;
  const busy = busyFor === phaseKey;
  const tooEarly = left != null && left > total - 1.5;
  const skip = () => {
    if (busy) return;
    setBusyFor(phaseKey);
    setError(null);
    api
      .send({ type: "skip" })
      .catch((e: { message?: string }) => setError(e?.message ?? "Ça n'a pas marché."))
      .finally(() => setBusyFor((k) => (k === phaseKey ? null : k)));
  };
  return { skip, busy, disabled: busy || tooEarly, error };
}

// ---------------------------------------------------------------- montage paresseux

/**
 * Vrai tant que l'élément est (presque) visible dans son conteneur défilant.
 * `rootRef` : le conteneur qui défile (sinon la fenêtre).
 */
export function useNearViewport<T extends Element>(
  ref: RefObject<T | null>,
  rootRef?: RefObject<Element | null>,
  margin = "350px",
): boolean {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      const t = setTimeout(() => setNear(true), 0);
      return () => clearTimeout(t);
    }
    const io = new IntersectionObserver(
      (entries) => {
        const last = entries[entries.length - 1];
        setNear(last.isIntersecting);
      },
      { root: rootRef?.current ?? null, rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootRef, margin]);
  return near;
}

/** Vrai si la requête média correspond (faux côté serveur). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

// ---------------------------------------------------------------- icônes

export function CheckIcon({ size = 16, stroke = 3.5 }: { size?: number; stroke?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4.5 12.8 10 18 19.5 6.5" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CrossIcon({ size = 16, stroke = 3.5 }: { size?: number; stroke?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
    </svg>
  );
}

export function ChevronIcon({ dir = "right", size = 16, stroke = 3.5 }: { dir?: "left" | "right"; size?: number; stroke?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" style={dir === "left" ? { transform: "scaleX(-1)" } : undefined}>
      <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
