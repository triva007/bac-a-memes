"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Emoji } from "@/components/ui/Emoji";
import { Icon } from "@/components/ui/Icon";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { copyText, useSfxMuted } from "@/components/ui/hooks";
import type { ApiFailure, GameApi } from "@/features/game/props";
import type { PlayerView, RoomView } from "@/lib/game/types";
import { sfx } from "@/lib/sfx";

function PlayerRow({
  player,
  isMe,
  showScore,
  canKick,
  onKick,
}: {
  player: PlayerView;
  isMe: boolean;
  showScore: boolean;
  canKick: boolean;
  onKick: () => void;
}) {
  return (
    <li className="flex min-h-[52px] items-center gap-3 py-1">
      <Avatar avatar={player.avatar} color={player.color} size={40} dimmed={!player.connected} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={`truncate font-display text-[1.02rem] font-extrabold leading-tight ${player.connected ? "" : "text-ink/45"}`}>{player.name}</span>
          {player.isHost ? <Emoji id="crown" size={18} alt="hôte" /> : null}
          {isMe ? <span className="flex-none rounded-md bg-ink px-1.5 py-0.5 text-[0.68rem] font-bold uppercase leading-none text-paper">toi</span> : null}
        </div>
        {!player.connected ? <div className="text-[0.78rem] font-semibold text-ink/50">hors ligne</div> : null}
      </div>
      {showScore ? <span className="flex-none font-display text-[1rem] font-extrabold tabular-nums">{player.score} pts</span> : null}
      {canKick ? (
        <button
          type="button"
          onClick={onKick}
          aria-label={`Retirer ${player.name} de la salle`}
          title="Retirer de la salle"
          className="grid h-11 w-11 flex-none place-items-center rounded-full text-ink/55 outline-none hover:bg-red-pen/15 hover:text-red-pen focus-visible:ring-4 focus-visible:ring-fluo-blue"
        >
          <Icon name="close" size={20} />
        </button>
      ) : null}
    </li>
  );
}

/** Menu de la partie : passer à la suite (hôte), joueurs + expulsion (hôte), son, lien, quitter. */
export function GameMenu({
  open,
  onClose,
  view,
  api,
  onLeave,
}: {
  open: boolean;
  onClose: () => void;
  view: RoomView;
  api: GameApi;
  onLeave: () => void;
}) {
  const muted = useSfxMuted();
  const [confirmLeave, setConfirmLeave] = useState(false);
  // la cible reste en mémoire pendant l'animation de fermeture de la confirmation
  const [kickTarget, setKickTarget] = useState<PlayerView | null>(null);
  const [kickOpen, setKickOpen] = useState(false);
  const [kicking, setKicking] = useState(false);
  const [skipLocked, setSkipLocked] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  const meId = view.me?.id;
  const isHost = view.me?.isHost ?? false;
  const inGame = view.phase !== "lobby";
  const canSkip = isHost && view.phase !== "lobby" && view.phase !== "final";
  const players = inGame ? [...view.players].sort((a, b) => b.score - a.score) : view.players;
  const connected = view.players.filter((p) => p.connected).length;

  const skip = async () => {
    if (skipLocked) return;
    setSkipLocked(true);
    setNotice(null);
    later(() => setSkipLocked(false), 2000);
    try {
      await api.send({ type: "skip" });
      sfx.play("tap");
      onClose();
    } catch (e) {
      sfx.play("error");
      setNotice((e as ApiFailure).message || "Impossible de passer à la suite.");
    }
  };

  const kick = async () => {
    if (!kickTarget || kicking) return;
    setKicking(true);
    try {
      await api.send({ type: "kick", playerId: kickTarget.id });
    } catch (e) {
      sfx.play("error");
      setNotice((e as ApiFailure).message || "Impossible de retirer ce joueur.");
    } finally {
      setKickOpen(false);
      setKicking(false);
    }
  };

  const copyLink = async () => {
    const ok = await copyText(`${window.location.origin}/r/${view.code}`);
    if (ok) {
      sfx.play("tap");
      setCopied(true);
      later(() => setCopied(false), 2200);
    } else {
      setNotice("Copie impossible\u00a0: recopie l'adresse à la main.");
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={
          <>
            Salle <span className="hl">{view.code}</span>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {canSkip ? (
            <div className="rounded-2xl border-[3px] border-ink bg-fluo-blue/25 p-3">
              <button type="button" className="btn btn-blue w-full" onClick={skip} disabled={skipLocked}>
                <Icon name="skip" size={20} />
                Passer à la suite
              </button>
              <p className="mt-2 text-center text-[0.82rem] font-semibold leading-snug text-ink/65">
                Réservé à l&apos;hôte&nbsp;: termine tout de suite l&apos;étape en cours pour toute la classe.
              </p>
            </div>
          ) : null}

          {notice ? (
            <p role="alert" className="rounded-xl border-2 border-red-pen bg-red-pen/10 px-3 py-2 text-[0.9rem] font-bold text-red-pen">
              {notice}
            </p>
          ) : null}

          <section aria-labelledby="menu-joueurs">
            <h3 id="menu-joueurs" className="mb-1 flex items-baseline justify-between text-[0.78rem] font-bold uppercase tracking-wide text-ink/60">
              <span>Joueurs</span>
              <span>
                {connected} en ligne{view.players.length > connected ? ` · ${view.players.length - connected} hors ligne` : ""}
              </span>
            </h3>
            <ul className="divide-y-2 divide-ink/10">
              {players.map((p) => (
                <PlayerRow
                  key={p.id}
                  player={p}
                  isMe={p.id === meId}
                  showScore={inGame}
                  canKick={isHost && p.id !== meId}
                  onKick={() => {
                    setKickTarget(p);
                    setKickOpen(true);
                  }}
                />
              ))}
            </ul>
          </section>

          <div className="grid gap-2.5">
            <button
              type="button"
              className="btn btn-paper w-full justify-between !px-4"
              role="switch"
              aria-checked={!muted}
              onClick={() => {
                const nowMuted = sfx.toggleMuted();
                if (!nowMuted) sfx.play("pop");
              }}
            >
              <span className="flex items-center gap-2.5">
                <Icon name={muted ? "volume-off" : "volume-on"} />
                Sons du jeu
              </span>
              <span className={`rounded-full border-2 border-ink px-2.5 py-1 text-[0.8rem] ${muted ? "bg-paper-2 text-ink/60" : "bg-fluo-green"}`}>{muted ? "Coupés" : "Activés"}</span>
            </button>
            <button type="button" className="btn btn-paper w-full justify-between !px-4" onClick={copyLink}>
              <span className="flex items-center gap-2.5">
                <Icon name={copied ? "check" : "copy"} />
                {copied ? "Lien copié\u00a0!" : "Copier le lien d'invitation"}
              </span>
            </button>
            <button type="button" className="btn btn-paper w-full justify-between !px-4 !text-red-pen" onClick={() => setConfirmLeave(true)}>
              <span className="flex items-center gap-2.5">
                <Icon name="logout" />
                Quitter la partie
              </span>
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmLeave}
        onCancel={() => setConfirmLeave(false)}
        onConfirm={() => {
          setConfirmLeave(false);
          onClose();
          onLeave();
        }}
        title={"Tu pars vraiment\u00a0?"}
        confirmLabel="Quitter"
        cancelLabel="Je reste"
      >
        {inGame ? (
          <>Tu quittes la salle {view.code} en pleine partie&nbsp;: tes mèmes restent, mais tu ne joues plus.</>
        ) : (
          <>Tu quittes la salle {view.code}. Tu pourras revenir avec le code.</>
        )}
        {isHost && view.players.length > 1 ? <> Comme tu es l&apos;hôte, quelqu&apos;un d&apos;autre prendra la main.</> : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={kickOpen}
        onCancel={() => setKickOpen(false)}
        onConfirm={kick}
        busy={kicking}
        title={`Retirer ${kickTarget?.name ?? ""}\u00a0?`}
        confirmLabel="Retirer"
      >
        {kickTarget ? (
          <>
            {kickTarget.name} sortira de la salle et ne pourra plus y revenir.
            {inGame ? " Ses mèmes seront retirés de la partie." : ""}
          </>
        ) : null}
      </ConfirmDialog>
    </>
  );
}
