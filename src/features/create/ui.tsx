"use client";

/**
 * Petites briques d'interface propres à l'écran de création :
 * icônes, avatars, message éphémère, avancement des autres joueurs.
 */

import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Emoji } from "@/components/ui/Emoji";
import type { GameApi } from "@/features/game/props";
import { creatingPhrase, rotatingSeed } from "@/lib/content/phrases";
import type { PlayerView, RoomView } from "@/lib/game/types";

// ------------------------------------------------------------------ icônes

const ICONS = {
  check: "M4.5 12.5l5 5L19.5 7",
  close: "M6 6l12 12M18 6L6 18",
  left: "M14.5 5l-7 7 7 7",
  right: "M9.5 5l7 7-7 7",
  refresh: "M19.5 12a7.5 7.5 0 1 1-2.4-5.5M19.5 4.5v4.6h-4.6",
  search: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.5 15.5L20 20",
  grid: "M4.5 4.5h6v6h-6zM13.5 4.5h6v6h-6zM4.5 13.5h6v6h-6zM13.5 13.5h6v6h-6z",
  pencil: "M4.5 19.5l1-4.2L16.3 4.5a1.8 1.8 0 0 1 2.5 0l.7.7a1.8 1.8 0 0 1 0 2.5L8.7 18.5zM14.5 6.3l3.2 3.2",
  plus: "M12 5v14M5 12h14",
  down: "M5 9l7 7 7-7",
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 20, stroke = 2.6 }: { name: IconName; size?: number; stroke?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}>
      <path d={ICONS[name]} />
    </svg>
  );
}

export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" className="animate-spin" style={{ flex: "none" }}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3.5" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

// ------------------------------------------------------------------ mot surligné

/** Mot passé au surligneur fluo (texte encre sur fond plein, lisible sur fond nuit). */
export function Marker({ children, color = "var(--color-fluo-yellow)", tilt = -1.5 }: { children: ReactNode; color?: string; tilt?: number }) {
  return (
    <span className="inline-block rounded-[5px] px-[0.22em] pb-[0.06em] text-ink" style={{ background: color, rotate: `${tilt}deg` }}>
      {children}
    </span>
  );
}

// ------------------------------------------------------------------ garder le focus du champ

const prevent = (e: PointerEvent | MouseEvent) => e.preventDefault();

/**
 * À étaler sur un bouton qui agit sur le champ en cours de saisie : le toucher
 * ne retire pas le focus du champ (le clavier du téléphone reste ouvert).
 */
export const keepFocus = { onPointerDown: prevent, onMouseDown: prevent };

// ------------------------------------------------------------------ message éphémère

export interface Notice {
  id: number;
  text: string;
  tone: "warn" | "info";
}

let noticeCounter = 0;

export function useNotice(ms = 2800): [Notice | null, (text: string, tone?: Notice["tone"]) => void] {
  const [notice, setNotice] = useState<Notice | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback(
    (text: string, tone: Notice["tone"] = "warn") => {
      if (timer.current) clearTimeout(timer.current);
      noticeCounter += 1;
      setNotice({ id: noticeCounter, text, tone });
      timer.current = setTimeout(() => setNotice(null), ms);
    },
    [ms],
  );
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return [notice, show];
}

/** Bulle de message posée en absolu (le parent doit être `relative`). */
export function NoticeBubble({ notice, className = "" }: { notice: Notice | null; className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-x-0 z-30 flex justify-center px-4 ${className}`} role="status" aria-live="polite">
      <AnimatePresence>
        {notice ? (
          <motion.div
            key={notice.id}
            initial={{ opacity: 0, y: 10, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 520, damping: 30 }}
            className={`max-w-full rounded-xl border-[3px] border-ink px-3 py-2 text-center font-display text-[0.92rem] font-extrabold leading-tight text-ink shadow-hard-light ${
              notice.tone === "warn" ? "bg-fluo-orange" : "bg-fluo-green"
            }`}
          >
            {notice.text}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

// ------------------------------------------------------------------ avatars

export function Avatar({ player, size = 40, done = false }: { player: Pick<PlayerView, "avatar" | "color" | "name" | "connected">; size?: number; done?: boolean }) {
  const badge = Math.max(16, Math.round(size * 0.44));
  return (
    <span
      className="relative inline-flex flex-none items-center justify-center rounded-full border-[2.5px] border-ink"
      style={{ width: size, height: size, background: player.color, opacity: player.connected || done ? 1 : 0.45 }}
      title={player.name}
    >
      <Emoji id={player.avatar} size={Math.round(size * 0.66)} />
      {done ? (
        <span
          className="absolute flex items-center justify-center rounded-full border-2 border-ink bg-fluo-green text-ink"
          style={{ width: badge, height: badge, right: -badge * 0.28, bottom: -badge * 0.22 }}
        >
          <Icon name="check" size={Math.round(badge * 0.62)} stroke={4} />
        </span>
      ) : null}
    </span>
  );
}

// ------------------------------------------------------------------ bandeau "thème imposé"

export function ThemeBanner({ theme, compact = false, style }: { theme: string; compact?: boolean; style?: CSSProperties }) {
  return (
    <div
      className={`flex items-center gap-2 border-[3px] border-ink bg-fluo-yellow text-ink ${compact ? "rounded-xl px-2.5 py-1" : "rounded-2xl px-3 py-2 shadow-hard-light"}`}
      style={style}
      data-testid="theme-banner"
    >
      <span className="flex-none -rotate-3 rounded-md bg-ink px-1.5 py-0.5 font-display text-[0.62rem] font-extrabold uppercase tracking-wider text-fluo-yellow">Thème</span>
      <span className={`min-w-0 font-display font-extrabold leading-tight ${compact ? "line-clamp-2 text-[0.82rem]" : "text-[1rem]"}`}>{theme}</span>
    </div>
  );
}

// ------------------------------------------------------------------ avancement des autres

function useServerClock(api: Pick<GameApi, "serverNow">, everyMs: number): number {
  const [now, setNow] = useState(() => api.serverNow());
  useEffect(() => {
    const id = setInterval(() => setNow(api.serverNow()), everyMs);
    return () => clearInterval(id);
  }, [api, everyMs]);
  return now;
}

/**
 * Compteur « X / Y ont rendu leur copie », avatars cochés et phrase d'ambiance
 * qui tourne. Utilisé après validation et sur les écrans d'attente.
 */
export function OthersProgress({ view, api, dense = false }: { view: RoomView; api: Pick<GameApi, "serverNow">; dense?: boolean }): ReactNode {
  const now = useServerClock(api, 2000);
  const create = view.create;
  if (!create) return null;
  const shown = view.players.filter((p) => p.connected || p.done);
  const waiting = shown.filter((p) => !p.done && p.connected).map((p) => p.name);
  const total = Math.max(create.totalPlayers, 1);
  const ratio = Math.min(1, create.submittedCount / total);
  const allDone = create.totalPlayers > 0 && create.submittedCount >= create.totalPlayers;
  const seed = rotatingSeed(`${view.code}:${view.round}`, now, 5000);
  const phrase = creatingPhrase(seed, allDone ? [] : waiting.length ? waiting : undefined);
  const size = shown.length > 24 ? 30 : shown.length > 12 ? 36 : 42;

  return (
    <div className="w-full">
      <div className="flex items-end justify-between gap-3">
        <p className="font-display text-[0.95rem] font-extrabold leading-tight text-paper">Copies rendues</p>
        <p className="font-display text-2xl font-extrabold leading-none text-fluo-green" data-testid="submitted-count">
          {create.submittedCount}
          <span className="text-base text-muted"> / {create.totalPlayers}</span>
        </p>
      </div>
      <div className="mt-1.5 h-3.5 overflow-hidden rounded-full border-[2.5px] border-ink bg-ink-3" role="progressbar" aria-valuemin={0} aria-valuemax={create.totalPlayers} aria-valuenow={create.submittedCount}>
        <motion.div className="h-full rounded-full bg-fluo-green" initial={false} animate={{ width: `${ratio * 100}%` }} transition={{ type: "spring", stiffness: 200, damping: 26 }} />
      </div>
      <div className={`flex flex-wrap justify-center gap-x-2 gap-y-2.5 ${dense ? "mt-3" : "mt-4"}`}>
        {shown.map((p) => (
          <motion.span key={p.id} layout="position" animate={{ scale: p.done ? 1 : 0.92 }} transition={{ type: "spring", stiffness: 500, damping: 22 }}>
            <Avatar player={p} size={size} done={p.done} />
          </motion.span>
        ))}
      </div>
      <div className={`flex min-h-[2.6em] items-center justify-center ${dense ? "mt-2" : "mt-3"}`}>
        <AnimatePresence mode="wait">
          <motion.p
            key={phrase}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
            className="text-center text-[1.35rem] leading-tight text-paper/90"
            style={{ fontFamily: "var(--font-hand)" }}
          >
            {phrase}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
