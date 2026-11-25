"use client";

/**
 * Écran de VOTE et de RÉVÉLATION (phases "vote" et "reveal").
 * Le mème reste en place d'une phase à l'autre ; seul le panneau du bas change
 * (boutons de note -> révélation de l'auteur et des points).
 */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { MemeView } from "@/components/meme/MemeView";
import { Emoji } from "@/components/ui/Emoji";
import type { PhaseProps } from "@/features/game/props";
import { useCountdown } from "@/features/game/useRoom";
import { LIMITS, VOTE_OPTIONS, type VoteScore } from "@/lib/game/types";
import { sfx } from "@/lib/sfx";
import { RevealPanel } from "./RevealPanel";
import { CheckIcon, ChevronIcon, SCORE_COLORS, TimeBar, useSkip } from "./shared";

type Vote = NonNullable<PhaseProps["view"]["vote"]>;

interface Optimistic {
  memeId: string;
  score: VoteScore;
  /** numéro de l'envoi (pour ignorer la réponse d'un envoi dépassé) */
  seq: number;
}

export function VoteScreen({ view, api }: PhaseProps) {
  const vote = view.vote;
  if (!vote) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center font-display text-xl font-extrabold text-paper/80">
        Les copies arrivent…
      </div>
    );
  }
  return (
    <MotionConfig reducedMotion="user">
      <VoteStage view={view} api={api} vote={vote} />
    </MotionConfig>
  );
}

function VoteStage({ view, api, vote }: PhaseProps & { vote: Vote }) {
  const revealing = view.phase === "reveal" && vote.result !== null;
  const total = view.phase === "vote" ? view.settings.voteSeconds : LIMITS.revealSeconds;
  const left = useCountdown(view.phaseEndsAt, api);
  const isHost = view.me?.isHost ?? false;

  // ------------------------------------------------------------ ma note (optimiste)
  const [optimistic, setOptimistic] = useState<Optimistic | null>(null);
  const [failure, setFailure] = useState<{ memeId: string; message: string } | null>(null);
  const seq = useRef(0);
  const mine = optimistic && optimistic.memeId === vote.memeId ? optimistic.score : vote.myVote;
  const error = failure && failure.memeId === vote.memeId ? failure.message : null;

  const cast = (score: VoteScore) => {
    if (view.phase !== "vote" || mine === score) return;
    const id = ++seq.current;
    const memeId = vote.memeId;
    sfx.play("vote", score / 3);
    setFailure(null);
    setOptimistic({ memeId, score, seq: id });
    api.send({ type: "vote", memeId, score }).catch((e: { error?: string; message?: string }) => {
      // on n'annule que si aucun autre choix n'a été fait entre-temps
      setOptimistic((cur) => (cur && cur.seq === id ? null : cur));
      if (seq.current !== id) return;
      sfx.play("error");
      setFailure({
        memeId,
        message: e?.error === "bad_phase" ? "Trop tard, le vote est clos." : (e?.message ?? "Ta note n'est pas partie. Réessaie."),
      });
    });
  };

  // ------------------------------------------------------------ nouveau mème : petit « pop »
  useEffect(() => {
    sfx.play("pop");
  }, [vote.memeId]);

  return (
    <div
      className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col px-3 pt-2"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <header className="flex h-9 flex-none items-center justify-between gap-3">
        <div className="-rotate-2 rounded-lg border-2 border-ink bg-paper px-2.5 py-0.5 font-display text-[15px] font-extrabold leading-tight text-ink shadow-[2px_2px_0_0_rgba(0,0,0,0.55)]">
          Mème <span className="tabular-nums">{vote.index + 1}</span>
          <span className="text-ink/50">/{vote.count}</span>
        </div>
        <VoteProgress voted={vote.votedCount} voters={vote.votersCount} closed={revealing} />
      </header>
      <TimeBar left={left} total={total} className="mt-1.5 flex-none" />

      <div className="relative min-h-0 flex-1">
        <AnimatePresence initial={false}>
          <motion.div
            key={vote.memeId}
            className="absolute inset-x-0 bottom-2 top-3"
            style={{ filter: "drop-shadow(5px 6px 0 rgba(0,0,0,0.45))" }}
            initial={{ opacity: 0, scale: 0.8, rotate: -4, y: 28 }}
            animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, x: -60, rotate: -6, transition: { duration: 0.18 } }}
            transition={{ type: "spring", stiffness: 380, damping: 24 }}
          >
            <MemeView meme={vote.meme} fit="contain" />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex-none">
        {revealing && vote.result ? (
          <RevealPanel key={vote.memeId} result={vote.result} myVote={mine} isMine={vote.isMine} players={view.players} />
        ) : vote.isMine ? (
          <MinePanel />
        ) : view.me ? (
          <VoteButtons mine={mine} error={error} onVote={cast} />
        ) : (
          <SpectatorPanel />
        )}
        {isHost ? <HostTools view={view} api={api} left={left} total={total} memeId={vote.memeId} revealing={revealing} /> : null}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ progression

function VoteProgress({ voted, voters, closed }: { voted: number; voters: number; closed: boolean }) {
  const all = voters > 0 && voted >= voters;
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-[13px] font-semibold text-paper/75" aria-live="off">
      <span className="font-display text-[15px] font-extrabold tabular-nums text-paper">
        {Math.min(voted, Math.max(voters, voted))}
        <span className="text-paper/50">/{Math.max(voters, voted)}</span>
      </span>
      <span className="truncate">{closed ? "votes, c'est clos" : all ? "ont noté, bravo" : voted > 1 ? "ont noté" : "a noté"}</span>
    </div>
  );
}

// ------------------------------------------------------------------ boutons de note

function VoteButtons({ mine, error, onVote }: { mine: VoteScore | null; error: string | null; onVote: (s: VoteScore) => void }) {
  return (
    <div>
      <div className="grid grid-cols-4 gap-2" role="group" aria-label="Ta note pour ce mème">
        {VOTE_OPTIONS.map((o) => {
          const selected = mine === o.score;
          const dimmed = mine !== null && !selected;
          return (
            <button
              key={o.score}
              type="button"
              aria-pressed={selected}
              onClick={() => onVote(o.score)}
              className={[
                "relative flex h-[86px] select-none flex-col items-center justify-start gap-0.5 rounded-2xl border-[3px] border-ink px-0.5 pt-2",
                "font-display text-[13px] font-extrabold leading-[1.05] text-ink outline-none",
                "transition-[transform,box-shadow,opacity,filter] duration-100 [touch-action:manipulation]",
                "focus-visible:ring-4 focus-visible:ring-fluo-blue",
                selected
                  ? "translate-x-[2px] translate-y-[2px] shadow-[2px_2px_0_0_rgba(0,0,0,0.55)]"
                  : "shadow-[4px_4px_0_0_rgba(0,0,0,0.55)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[1px_1px_0_0_rgba(0,0,0,0.55)]",
                dimmed ? "opacity-55 saturate-[0.6]" : "",
              ].join(" ")}
              style={{ background: SCORE_COLORS[o.score] }}
            >
              <motion.span
                key={selected ? "on" : "off"}
                className="block"
                initial={selected ? { scale: 0.6, rotate: -14 } : false}
                animate={{ scale: selected ? 1.12 : 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 520, damping: 14 }}
              >
                <Emoji id={o.emoji} size={40} />
              </motion.span>
              <span className="flex min-h-[27px] items-center text-center">{o.label}</span>
              {selected ? (
                <motion.span
                  className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full border-2 border-ink bg-fluo-green text-ink"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 600, damping: 18 }}
                >
                  <CheckIcon size={13} stroke={4.5} />
                </motion.span>
              ) : null}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 flex h-6 items-center justify-center gap-1.5 text-center text-[13px] font-semibold leading-none" aria-live="polite">
        {error ? (
          <span className="rounded-md bg-red-pen px-2 py-1 text-paper">{error}</span>
        ) : mine !== null ? (
          <>
            <span className="inline-flex items-center gap-1 font-display font-extrabold text-fluo-green">
              C&apos;est noté <CheckIcon size={14} stroke={4.5} />
            </span>
            <span className="text-paper/60">Tu peux encore changer d&apos;avis.</span>
          </>
        ) : (
          <span className="text-paper/70">Alors, ça vaut combien ?</span>
        )}
      </p>
    </div>
  );
}

/** C'est mon mème : pas de boutons, et rien de voyant pour les voisins de table. */
function MinePanel() {
  return (
    <div>
      <div className="flex h-[86px] items-center gap-3 rounded-2xl border-2 border-dashed border-paper/25 bg-ink-2 px-4">
        <Emoji id="shushing-face" size={38} />
        <div className="min-w-0">
          <p className="font-display text-[17px] font-extrabold leading-tight text-paper">C&apos;est le tien. Fais genre de rien.</p>
          <p className="mt-0.5 text-[13px] font-medium leading-snug text-paper/60">Les autres notent, toi tu regardes ailleurs.</p>
        </div>
      </div>
      <p className="mt-1.5 h-6" aria-hidden />
    </div>
  );
}

function SpectatorPanel() {
  return (
    <div>
      <div className="flex h-[86px] items-center gap-3 rounded-2xl border-2 border-dashed border-paper/25 bg-ink-2 px-4">
        <Emoji id="popcorn" size={38} />
        <div className="min-w-0">
          <p className="font-display text-[17px] font-extrabold leading-tight text-paper">Tu regardes en spectateur.</p>
          <p className="mt-0.5 text-[13px] font-medium leading-snug text-paper/60">Les joueurs sont en train de noter ce mème.</p>
        </div>
      </div>
      <p className="mt-1.5 h-6" aria-hidden />
    </div>
  );
}

// ------------------------------------------------------------------ outils de l'hôte

function HostTools({
  view,
  api,
  left,
  total,
  memeId,
  revealing,
}: PhaseProps & { left: number | null; total: number; memeId: string; revealing: boolean }) {
  const { skip, disabled, error: skipError } = useSkip(view, api, left, total);
  const [confirmFor, setConfirmFor] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<{ memeId: string; message: string } | null>(null);
  const confirming = confirmFor === memeId && !revealing;
  const error = skipError ?? (removeError && removeError.memeId === memeId ? removeError.message : null);

  const remove = () => {
    setRemoving(memeId);
    setRemoveError(null);
    api
      .send({ type: "removeMeme", memeId })
      .catch((e: { message?: string }) => setRemoveError({ memeId, message: e?.message ?? "Impossible de retirer ce mème." }))
      .finally(() => {
        setRemoving(null);
        setConfirmFor(null);
      });
  };

  return (
    <div className="flex h-11 items-center justify-between gap-2 border-t border-paper/10">
      {revealing ? (
        <span className="text-[12px] font-medium text-paper/40">Hôte</span>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmFor(memeId)}
          className="-ml-2 inline-flex h-11 items-center gap-1.5 rounded-lg px-2 text-[13px] font-semibold text-paper/55 outline-none hover:text-paper focus-visible:ring-2 focus-visible:ring-fluo-blue"
        >
          <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M4 7h16M9.5 7V4.500h5V7M6.5 7l1 12.500h9l1-12.500M10 11v5M14 11v5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Retirer ce mème
        </button>
      )}
      {error ? <span className="min-w-0 flex-1 truncate text-center text-[12px] font-semibold text-fluo-pink">{error}</span> : null}
      <button
        type="button"
        onClick={skip}
        disabled={disabled}
        className="-mr-2 inline-flex h-11 items-center gap-1 rounded-lg px-2 text-[13px] font-semibold text-paper/55 outline-none hover:text-paper focus-visible:ring-2 focus-visible:ring-fluo-blue disabled:opacity-40"
      >
        Passer
        <ChevronIcon size={13} stroke={3} />
      </button>

      <AnimatePresence>
        {confirming ? (
          <ConfirmRemove key="confirm" busy={removing === memeId} onCancel={() => setConfirmFor(null)} onConfirm={remove} />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function ConfirmRemove({ busy, onCancel, onConfirm }: { busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-3 sm:items-center" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
      <motion.div
        className="absolute inset-0 bg-[#090818]/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        aria-hidden
      />
      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="remove-meme-title"
        aria-describedby="remove-meme-text"
        className="card relative w-full max-w-sm p-4"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 30 }}
      >
        <h2 id="remove-meme-title" className="font-display text-xl font-extrabold leading-tight">
          Retirer ce mème ?
        </h2>
        <p id="remove-meme-text" className="mt-1 text-[14px] font-medium leading-snug text-ink/75">
          Il disparaît pour toute la classe, ne rapporte aucun point, et on passe au suivant. À utiliser si ça va trop loin.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button ref={cancelRef} type="button" className="btn btn-paper" onClick={onCancel}>
            On le garde
          </button>
          <button type="button" className="btn btn-pink" onClick={onConfirm} disabled={busy}>
            {busy ? "On retire…" : "Oui, retirer"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
