"use client";

import { motion } from "motion/react";
import { Icon } from "@/components/ui/Icon";
import { useSfxMuted } from "@/components/ui/hooks";
import type { GameApi } from "@/features/game/props";
import { useCountdown } from "@/features/game/useRoom";
import type { RoomView } from "@/lib/game/types";
import { sfx } from "@/lib/sfx";

/** Hauteur de la barre hors marge de sécurité (px). */
export const TOP_BAR_HEIGHT = 52;

function phaseLabels(view: RoomView): { main: string; sub: string } {
  const count = view.players.length;
  const round = `Manche ${view.round}/${view.totalRounds}`;
  switch (view.phase) {
    case "lobby":
      return { main: "Salon", sub: `${count} joueur${count > 1 ? "s" : ""}` };
    case "create":
      return { main: round, sub: "Création" };
    case "vote":
    case "reveal":
      return { main: round, sub: view.vote ? `Mème ${view.vote.index + 1}/${view.vote.count}` : "Vote" };
    case "results":
      return { main: round, sub: "Classement" };
    case "final":
      return { main: "Fin de partie", sub: "Podium" };
  }
}

function formatTime(seconds: number): string {
  const s = Math.ceil(seconds);
  if (s < 60) return String(s);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function Timer({ view, api }: { view: RoomView; api: GameApi }) {
  const left = useCountdown(view.phaseEndsAt, api);
  if (left == null) return null;
  const whole = Math.ceil(left);
  const urgentPhase = view.phase === "create" || view.phase === "vote";
  const alert = urgentPhase && whole <= 10;
  return (
    <motion.div
      key={alert ? `a${whole}` : "calm"}
      initial={alert ? { scale: 1.18 } : false}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 520, damping: 16 }}
      role="timer"
      aria-label={`Temps restant : ${whole} seconde${whole > 1 ? "s" : ""}`}
      className={[
        "flex h-9 min-w-[46px] flex-none items-center justify-center gap-1 rounded-full border-[2.5px] px-2.5 font-display text-[1.1rem] font-extrabold tabular-nums leading-none min-[380px]:min-w-[58px]",
        alert ? "border-ink bg-red-pen text-white shadow-[2px_2px_0_0_rgba(0,0,0,0.6)]" : "border-paper/25 bg-ink-3 text-paper",
      ].join(" ")}
    >
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden className="flex-none opacity-80 max-[379px]:hidden">
        <circle cx="12" cy="13.5" r="7.5" />
        <path d="M12 9.5v4l2.5 2M9.5 3h5" />
      </svg>
      {formatTime(left)}
    </motion.div>
  );
}

export function SoundButton({ className = "" }: { className?: string }) {
  const muted = useSfxMuted();
  return (
    <button
      type="button"
      onClick={() => {
        const nowMuted = sfx.toggleMuted();
        if (!nowMuted) {
          sfx.unlock();
          sfx.play("pop");
        }
      }}
      aria-pressed={!muted}
      aria-label={muted ? "Son coupé. Activer le son" : "Son activé. Couper le son"}
      title={muted ? "Activer le son" : "Couper le son"}
      className={`grid h-11 w-11 flex-none place-items-center rounded-full outline-none hover:bg-paper/10 focus-visible:ring-4 focus-visible:ring-fluo-blue ${muted ? "text-paper/45" : "text-paper"} ${className}`}
    >
      <Icon name={muted ? "volume-off" : "volume-on"} size={23} />
    </button>
  );
}

/** Barre du haut, constante pendant toute la partie : code, manche, minuteur, son, menu. */
export function TopBar({ view, api, onMenu }: { view: RoomView; api: GameApi; onMenu: () => void }) {
  const labels = phaseLabels(view);
  return (
    <header
      className="relative z-30 flex-none border-b-[3px] border-black/40 bg-ink-2"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div
        className="mx-auto flex w-full max-w-[1100px] items-center gap-2"
        style={{
          height: TOP_BAR_HEIGHT,
          paddingLeft: "max(0.6rem, env(safe-area-inset-left))",
          paddingRight: "max(0.25rem, env(safe-area-inset-right))",
        }}
      >
        <div
          className="flex-none -rotate-2 rounded-[9px] border-[2.5px] border-ink bg-fluo-yellow px-2 py-1 font-display text-[1.15rem] font-extrabold leading-none tracking-[0.06em] text-ink shadow-[2px_2px_0_0_rgba(0,0,0,0.6)]"
          aria-label={`Salle ${view.code.split("").join(" ")}`}
        >
          {view.code}
        </div>
        <div className="min-w-0 flex-1 leading-none">
          <div className="truncate font-display text-[0.92rem] font-extrabold text-paper min-[380px]:text-[0.98rem]">{labels.main}</div>
          <div className="mt-[3px] truncate text-[0.74rem] font-semibold text-muted">{labels.sub}</div>
        </div>
        <Timer view={view} api={api} />
        <div className="flex flex-none items-center">
          <SoundButton />
          <button
            type="button"
            onClick={onMenu}
            aria-label="Menu de la partie"
            aria-haspopup="dialog"
            className="grid h-11 w-11 flex-none place-items-center rounded-full text-paper outline-none hover:bg-paper/10 focus-visible:ring-4 focus-visible:ring-fluo-blue"
          >
            <Icon name="menu" size={24} />
          </button>
        </div>
      </div>
    </header>
  );
}
