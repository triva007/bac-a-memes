"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Avatar } from "@/components/ui/Avatar";
import { Emoji } from "@/components/ui/Emoji";
import { ConfirmDialog } from "@/components/ui/Modal";
import type { ApiFailure, PhaseProps } from "@/features/game/props";
import { LIMITS, type PlayerView } from "@/lib/game/types";
import { sfx } from "@/lib/sfx";

function PlayerTile({ player, isMe, onKick }: { player: PlayerView; isMe: boolean; onKick?: () => void }) {
  const body = (
    <>
      <span className="relative">
        <Avatar avatar={player.avatar} color={player.color} size={52} dimmed={!player.connected} className="shadow-[3px_3px_0_0_rgba(0,0,0,0.5)]" />
        {player.isHost ? (
          <span className="absolute -left-2.5 -top-3.5 -rotate-[24deg] drop-shadow-[1px_2px_0_rgba(0,0,0,0.5)]">
            <Emoji id="crown" size={26} alt="Hôte" />
          </span>
        ) : null}
        {!player.connected ? (
          <span className="absolute -bottom-1 -right-2 rounded-full border-2 border-ink bg-paper p-0.5">
            <Emoji id="zzz" size={16} alt="Hors ligne" />
          </span>
        ) : null}
        {player.isBot ? (
          <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-md border-2 border-ink bg-fluo-blue px-1 py-px text-[0.56rem] font-extrabold uppercase leading-none tracking-wide text-ink">
            robot
          </span>
        ) : null}
      </span>
      <span className={`mt-1.5 line-clamp-2 w-full text-center text-[0.8rem] font-bold leading-[1.15] [overflow-wrap:anywhere] ${player.connected ? "text-paper" : "text-paper/45"}`}>
        {player.name}
      </span>
      <span className="mt-0.5 flex h-[16px] items-center justify-center">
        {isMe ? (
          <span className="rounded-md bg-fluo-yellow px-1.5 py-[2px] text-[0.64rem] font-extrabold uppercase leading-none text-ink">toi</span>
        ) : player.isHost ? (
          <span className="text-[0.68rem] font-bold uppercase leading-none tracking-wide text-fluo-yellow">hôte</span>
        ) : !player.connected ? (
          <span className="text-[0.68rem] font-semibold leading-none text-paper/45">hors ligne</span>
        ) : null}
      </span>
    </>
  );
  const cls = "flex w-full min-w-0 flex-col items-center rounded-2xl px-1 pb-0.5 pt-2.5";
  if (onKick) {
    return (
      <button
        type="button"
        onClick={onKick}
        aria-label={`${player.name}${player.isBot ? " (robot)" : ""}${player.connected ? "" : " (hors ligne)"}. Retirer de la salle`}
        className={`${cls} outline-none hover:bg-paper/10 focus-visible:ring-4 focus-visible:ring-fluo-blue active:scale-95`}
      >
        {body}
      </button>
    );
  }
  return <div className={cls}>{body}</div>;
}

/** Onglet « Joueurs » du salon : grille d'avatars, arrivées animées, expulsion par l'hôte. */
export function PlayersPanel({ view, api }: PhaseProps) {
  const meId = view.me?.id;
  const isHost = view.me?.isHost ?? false;
  const [target, setTarget] = useState<PlayerView | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // son d'arrivée : seulement pour les joueurs apparus après l'ouverture de l'écran
  const knownRef = useRef<Set<string> | null>(null);
  const ids = view.players.map((p) => p.id).join(",");
  useEffect(() => {
    const current = new Set(ids ? ids.split(",") : []);
    const known = knownRef.current;
    if (known) {
      let arrived = false;
      for (const id of current) if (!known.has(id) && id !== meId) arrived = true;
      if (arrived) sfx.play("join");
    }
    knownRef.current = current;
  }, [ids, meId]);

  const kick = async () => {
    if (!target || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.send({ type: "kick", playerId: target.id });
    } catch (e) {
      sfx.play("error");
      setError((e as Partial<ApiFailure>).message || "Impossible de retirer ce joueur.");
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  };

  const botCount = view.players.filter((p) => p.isBot).length;
  const roomFull = view.players.length >= LIMITS.maxPlayers;
  const [botsBusy, setBotsBusy] = useState(false);
  const bots = async (action: { type: "addBots"; count: number } | { type: "removeBots" }) => {
    if (botsBusy) return;
    setBotsBusy(true);
    setError(null);
    try {
      await api.send(action);
    } catch (e) {
      sfx.play("error");
      setError((e as Partial<ApiFailure>).message || "Impossible de modifier les robots.");
    } finally {
      setBotsBusy(false);
    }
  };

  const count = view.players.length;
  const offline = view.players.filter((p) => !p.connected).length;
  const placeholders = Math.max(0, 4 - count);

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 px-1">
        <p className="font-display text-[1.05rem] font-extrabold text-paper" aria-live="polite">
          {count} joueur{count > 1 ? "s" : ""} <span className="font-sans text-[0.8rem] font-semibold text-muted">/ {LIMITS.maxPlayers} max</span>
        </p>
        {offline > 0 ? <p className="text-[0.8rem] font-semibold text-muted">{offline} hors ligne</p> : null}
      </div>

      <ul className="grid grid-cols-4 items-start gap-x-1 gap-y-1.5 sm:grid-cols-5 md:grid-cols-4 lg:grid-cols-5">
        <AnimatePresence initial={false} mode="popLayout">
          {view.players.map((p) => (
            <motion.li
              key={p.id}
              layout
              initial={{ scale: 0, rotate: -25, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 20 }}
              className="min-w-0"
            >
              <PlayerTile
                player={p}
                isMe={p.id === meId}
                onKick={
                  isHost && p.id !== meId
                    ? () => {
                        setTarget(p);
                        setConfirmOpen(true);
                      }
                    : undefined
                }
              />
            </motion.li>
          ))}
        </AnimatePresence>
        {Array.from({ length: placeholders }, (_, i) => (
          <li key={`vide-${i}`} aria-hidden className="flex flex-col items-center px-1 pb-1 pt-2.5">
            <span className="grid h-[52px] w-[52px] place-items-center rounded-full border-[3px] border-dashed border-paper/25 font-display text-[1.4rem] font-extrabold text-paper/25">?</span>
          </li>
        ))}
      </ul>

      {count < 2 ? (
        <p className="mt-2 px-1 text-center font-[family-name:var(--font-hand)] text-[1.3rem] leading-tight text-fluo-green">
          Personne d&apos;autre pour l&apos;instant… Donne le code à la classe&nbsp;!
        </p>
      ) : isHost ? (
        <p className="mt-2 px-1 text-center text-[0.8rem] font-medium text-muted">Un intrus&nbsp;? Touche un joueur pour le retirer de la salle.</p>
      ) : null}

      {isHost ? (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 px-1">
          <p className="w-full text-center text-[0.8rem] font-medium text-muted">Pour tester le jeu tout seul.</p>
          <button type="button" className="btn btn-ghost btn-sm !min-h-[44px] md:!min-h-[48px]" onClick={() => bots({ type: "addBots", count: 3 })} disabled={botsBusy || roomFull}>
            <Emoji id="robot" size={20} />
            Ajouter des robots
          </button>
          {botCount > 0 ? (
            <button type="button" className="btn btn-ghost btn-sm !min-h-[44px] md:!min-h-[48px]" onClick={() => bots({ type: "removeBots" })} disabled={botsBusy}>
              Retirer les robots
            </button>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 rounded-xl border-2 border-ink bg-fluo-pink px-3 py-2 text-[0.9rem] font-bold text-ink">
          {error}
        </p>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={kick}
        busy={busy}
        title={`Retirer ${target?.name ?? ""} ?`}
        confirmLabel="Retirer"
      >
        {target ? (
          <span className="flex items-center gap-3">
            <Avatar avatar={target.avatar} color={target.color} size={48} />
            <span>{target.isBot ? `${target.name} est un robot : il quittera simplement la salle.` : `${target.name} sortira de la salle et ne pourra plus y revenir avec ce téléphone.`}</span>
          </span>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
