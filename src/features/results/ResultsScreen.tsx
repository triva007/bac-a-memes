"use client";

/**
 * CLASSEMENT DE MANCHE (phase "results") : le meilleur mème mis en scène, les
 * suivants en carrousel, le classement général qui se réordonne, et une barre
 * du bas avec ma place, le compte à rebours et le bouton de l'hôte.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { MotionConfig, motion, useReducedMotion } from "motion/react";
import { MemeView } from "@/components/meme/MemeView";
import { Emoji } from "@/components/ui/Emoji";
import { MemeLightbox } from "@/features/final/MemeLightbox";
import type { PhaseProps } from "@/features/game/props";
import { useCountdown } from "@/features/game/useRoom";
import { LIMITS, type MemeResult, type PlayerView } from "@/lib/game/types";
import { sfx } from "@/lib/sfx";
import {
  Avatar,
  ChevronIcon,
  CountUp,
  FALLBACK_COLOR,
  TimeBar,
  ordinal,
  pts,
  sortByScore,
  useMemeRatio,
  useNearViewport,
  useSkip,
  withRanks,
} from "@/features/vote/shared";
import { LazyMeme } from "./LazyMeme";
import { RankingList, type RankRow } from "./RankingList";

type Results = NonNullable<PhaseProps["view"]["results"]>;

export function ResultsScreen({ view, api }: PhaseProps) {
  if (!view.results) {
    return <div className="flex h-full items-center justify-center p-6 text-center font-display text-xl font-extrabold text-paper/80">On compte les points…</div>;
  }
  return (
    <MotionConfig reducedMotion="user">
      <ResultsStage key={view.round} view={view} api={api} results={view.results} />
    </MotionConfig>
  );
}

function ResultsStage({ view, api, results }: PhaseProps & { results: Results }) {
  const reduce = useReducedMotion();
  const meId = view.me?.id ?? null;
  const left = useCountdown(view.phaseEndsAt, api);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const rankingRef = useRef<HTMLDivElement>(null);
  const myRowRef = useRef<HTMLLIElement>(null);
  const [open, setOpen] = useState<number | null>(null);

  const { entries, roundPoints } = results;
  const winner = entries[0];
  const others = entries.slice(1);
  const colorOf = useMemo(() => {
    const map = new Map(view.players.map((p) => [p.id, p.color]));
    return (id: string) => map.get(id) ?? FALLBACK_COLOR;
  }, [view.players]);

  // ------------------------------------------------------------ classement : avant -> après la manche
  const { before, after } = useMemo(() => {
    const prev = (p: PlayerView) => p.score - (roundPoints[p.id] ?? 0);
    const b = withRanks(sortByScore(view.players, prev), prev);
    const a = withRanks(sortByScore(view.players));
    return { before: b, after: a };
  }, [view.players, roundPoints]);

  const rankingSeen = useNearViewport(rankingRef, scrollerRef, "-90px");
  const [moved, setMoved] = useState(false);
  useEffect(() => {
    if (!rankingSeen || moved) return;
    const t = setTimeout(() => {
      setMoved(true);
      const mine = meId ? (roundPoints[meId] ?? 0) : 0;
      const best = Math.max(1, ...Object.values(roundPoints));
      sfx.play("points", meId ? mine / best : 0.5);
    }, 900);
    return () => clearTimeout(t);
  }, [rankingSeen, moved, meId, roundPoints]);
  const settled = moved || Boolean(reduce);

  const rows: RankRow[] = useMemo(() => {
    if (!settled) {
      return before.map((r) => ({ player: r.player, rank: r.rank, score: r.player.score - (roundPoints[r.player.id] ?? 0) }));
    }
    const prevRank = new Map(before.map((r) => [r.player.id, r.rank]));
    return after.map((r) => ({
      player: r.player,
      rank: r.rank,
      score: r.player.score,
      gain: roundPoints[r.player.id] ?? 0,
      move: view.round > 1 ? (prevRank.get(r.player.id) ?? r.rank) - r.rank : undefined,
    }));
  }, [settled, before, after, roundPoints, view.round]);

  const mine = meId ? after.find((r) => r.player.id === meId) : undefined;

  useEffect(() => {
    sfx.play("pop");
  }, []);

  const toMyRow = () => {
    const target = myRowRef.current ?? rankingRef.current;
    target?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollerRef} data-scroller className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
        <div className="mx-auto w-full max-w-5xl px-3 pb-5 pt-3 lg:grid lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start lg:gap-8 lg:px-6 lg:pt-6">
          {/* ------------------------------------------------ les mèmes de la manche */}
          <section className="min-w-0">
            <p className="text-[12px] font-bold uppercase tracking-wider text-paper/55">
              Fin de la manche {view.round}/{view.totalRounds}
            </p>
            {winner ? (
              <>
                <h2 className="mt-0.5 flex items-center gap-2 font-display text-[26px] font-extrabold leading-tight text-paper">
                  <span>
                    Le <span className="inline-block -rotate-1 rounded-md bg-fluo-yellow px-2 text-ink">mème de la manche</span>
                  </span>
                </h2>
                <WinnerCard entry={winner} color={colorOf(winner.authorId)} isMe={winner.authorId === meId} onOpen={() => setOpen(0)} />
                {others.length > 0 ? (
                  <Runners entries={others} first={winner} colorOf={colorOf} meId={meId} onOpen={(i) => setOpen(i + 1)} />
                ) : null}
              </>
            ) : (
              <EmptyRound />
            )}
          </section>

          {/* ------------------------------------------------ classement général */}
          <section ref={rankingRef} className="mt-6 min-w-0 lg:sticky lg:top-6 lg:mt-0">
            <div className="mb-2 flex items-end justify-between gap-2">
              <h2 className="font-display text-[22px] font-extrabold leading-tight text-paper">Classement général</h2>
              <span className="pb-0.5 text-[12px] font-semibold text-paper/55">
                {view.players.length} joueur{view.players.length > 1 ? "s" : ""}
              </span>
            </div>
            <RankingList rows={rows} meId={meId} myRowRef={myRowRef} />
          </section>
        </div>
      </div>

      <Footer view={view} api={api} left={left} mine={mine ? { rank: mine.rank, tied: mine.tied, player: mine.player, gain: roundPoints[mine.player.id] ?? 0 } : null} onMine={toMyRow} isLastRound={results.isLastRound} />

      {open !== null && entries[open] ? (
        <MemeLightbox items={entries} index={open} onIndex={setOpen} onClose={() => setOpen(null)} players={view.players} meId={meId} />
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------ le gagnant

function WinnerCard({ entry, color, isMe, onOpen }: { entry: MemeResult; color: string; isMe: boolean; onOpen: () => void }) {
  const ratio = useMemeRatio(entry.meme);
  return (
    <div className="mt-4">
      <motion.div
        className="relative mx-auto"
        style={{ width: `min(94%, calc(min(40dvh, 440px) / ${ratio}))`, rotate: -1.2 }}
        initial={{ scale: 0.7, opacity: 0, rotate: -8 }}
        animate={{ scale: 1, opacity: 1, rotate: -1.2 }}
        transition={{ type: "spring", stiffness: 300, damping: 18 }}
      >
        <div className="overflow-hidden rounded-[18px] border-[3px] border-ink shadow-[6px_6px_0_0_rgba(0,0,0,0.55)]" style={{ aspectRatio: `1 / ${ratio}` }}>
          <MemeView meme={entry.meme} rounded={false} />
        </div>
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Voir en grand le mème de ${entry.authorName}`}
          className="absolute inset-0 rounded-[18px] outline-none focus-visible:ring-4 focus-visible:ring-fluo-blue"
        />
        <motion.span
          className="pointer-events-none absolute -left-3 -top-6"
          initial={{ y: -40, opacity: 0, rotate: -40 }}
          animate={{ y: 0, opacity: 1, rotate: -18 }}
          transition={{ type: "spring", stiffness: 400, damping: 12, delay: 0.35 }}
        >
          <Emoji id="crown" size={52} />
        </motion.span>
        <motion.div
          className="pointer-events-none absolute -bottom-4 -right-2 rounded-2xl border-[3px] border-ink bg-fluo-yellow px-3 py-1 text-center text-ink shadow-[3px_3px_0_0_var(--color-ink)]"
          initial={{ scale: 0, rotate: 30 }}
          animate={{ scale: 1, rotate: 6 }}
          transition={{ type: "spring", stiffness: 420, damping: 14, delay: 0.5 }}
        >
          <span className="block font-display text-[28px] font-extrabold leading-none tabular-nums">
            +<CountUp value={entry.points} duration={700} delay={600} />
          </span>
          <span className="block text-[10px] font-bold uppercase leading-tight tracking-wide">{pts(entry.points)}</span>
        </motion.div>
      </motion.div>

      <div className="mt-5 flex items-center justify-center gap-2.5">
        <Avatar avatar={entry.authorAvatar} color={color} size={44} />
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase leading-none tracking-wide text-paper/55">Signé</p>
          <p className="truncate font-display text-[22px] font-extrabold leading-tight text-paper">
            {entry.authorName}
            {isMe ? <span className="ml-1.5 text-[14px] font-bold text-fluo-yellow">c&apos;est toi !</span> : null}
          </p>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ les suivants

function Runners({
  entries,
  first,
  colorOf,
  meId,
  onOpen,
}: {
  entries: MemeResult[];
  first: MemeResult;
  colorOf: (id: string) => string;
  meId: string | null;
  onOpen: (index: number) => void;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  // rangs avec ex æquo, à partir du gagnant
  const ranks = useMemo(() => {
    const out: number[] = [];
    let prevPoints = first.points;
    let prevRank = 1;
    entries.forEach((e, i) => {
      const rank = e.points === prevPoints ? prevRank : i + 2;
      out.push(rank);
      prevPoints = e.points;
      prevRank = rank;
    });
    return out;
  }, [entries, first.points]);

  return (
    <div className="mt-6">
      <div className="flex items-end justify-between gap-2">
        <h3 className="font-display text-[19px] font-extrabold leading-tight text-paper">Et juste derrière</h3>
        {entries.length > 2 ? (
          <span className="flex items-center gap-1 pb-0.5 text-[12px] font-semibold text-paper/55 lg:hidden">
            fais défiler <ChevronIcon size={11} stroke={3.5} />
          </span>
        ) : null}
      </div>
      <div
        ref={stripRef}
        className="no-scrollbar -mx-3 mt-2 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-3 pb-2 pt-1 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0"
      >
        {entries.map((e, i) => (
          <div key={e.memeId} className="card relative w-[46%] min-w-[150px] max-w-[220px] flex-none snap-start p-1.5 lg:w-auto lg:max-w-none">
            <LazyMeme meme={e.meme} rootRef={stripRef} margin="0px 500px 0px 500px" className="aspect-square overflow-hidden rounded-[11px] bg-ink" />
            <div className="mt-1.5 flex items-center gap-1.5 px-0.5">
              <span className="flex-none font-display text-[13px] font-extrabold tabular-nums text-ink/55">{ordinal(ranks[i])}</span>
              <Avatar avatar={e.authorAvatar} color={colorOf(e.authorId)} size={24} />
              <span className={`min-w-0 flex-1 truncate text-[13px] leading-tight ${e.authorId === meId ? "font-extrabold" : "font-semibold"}`}>
                {e.authorId === meId ? "Toi" : e.authorName}
              </span>
              <span className="flex-none font-display text-[15px] font-extrabold tabular-nums">+{e.points}</span>
            </div>
            <button
              type="button"
              onClick={() => onOpen(i)}
              aria-label={`Voir en grand le mème de ${e.authorName}, ${e.points} ${pts(e.points)}`}
              className="absolute inset-0 rounded-[15px] outline-none focus-visible:ring-4 focus-visible:ring-fluo-blue"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ manche sans mème

function EmptyRound() {
  return (
    <div className="card mx-auto mt-4 max-w-md -rotate-1 px-5 py-6 text-center">
      <div className="flex justify-center gap-1">
        <Emoji id="desert" size={56} />
        <Emoji id="cricket" size={40} className="mt-4" />
      </div>
      <h2 className="mt-3 font-display text-[24px] font-extrabold leading-tight">Copie blanche générale</h2>
      <p className="mt-1.5 text-[15px] font-medium leading-snug text-ink/70">
        Pas un seul mème rendu cette manche. Même le conseil de classe n&apos;avait jamais vu ça. On retente ?
      </p>
    </div>
  );
}

// ------------------------------------------------------------------ barre du bas

function Footer({
  view,
  api,
  left,
  mine,
  onMine,
  isLastRound,
}: PhaseProps & {
  left: number | null;
  mine: { rank: number; tied: boolean; player: PlayerView; gain: number } | null;
  onMine: () => void;
  isLastRound: boolean;
}) {
  const isHost = view.me?.isHost ?? false;
  const { skip, disabled, busy, error } = useSkip(view, api, left, LIMITS.resultsSeconds);
  const seconds = left == null ? null : Math.ceil(left);
  const next = isLastRound ? "Le podium" : "Manche suivante";

  return (
    <footer className="flex-none border-t-[3px] border-ink bg-ink-2" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
      <TimeBar left={left} total={LIMITS.resultsSeconds} className="!h-1.5 !rounded-none" />
      <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-3 pt-2 lg:px-6">
        {mine ? (
          <button
            type="button"
            onClick={onMine}
            aria-label={`Tu es ${ordinal(mine.rank)}${mine.tied ? " ex æquo" : ""} avec ${mine.player.score} ${pts(mine.player.score)}. Voir ma ligne dans le classement.`}
            className="flex min-h-[52px] min-w-0 flex-1 items-center gap-2 rounded-xl text-left outline-none focus-visible:ring-4 focus-visible:ring-fluo-blue"
          >
            <Avatar avatar={mine.player.avatar} color={mine.player.color} size={38} />
            <span className="min-w-0">
              <span className="block whitespace-nowrap font-display text-[19px] font-extrabold leading-none text-paper">
                {ordinal(mine.rank)}
                {mine.tied ? <span className="ml-1 text-[11px] font-bold text-paper/60">ex æquo</span> : null}
              </span>
              <span className="mt-1 block whitespace-nowrap text-[13px] font-semibold leading-none text-paper/70">
                <span className="tabular-nums text-paper">{mine.player.score}</span> pts
                {mine.gain > 0 ? <span className="ml-1.5 font-extrabold tabular-nums text-fluo-green">+{mine.gain}</span> : null}
              </span>
            </span>
          </button>
        ) : (
          <div className="min-h-[52px] min-w-0 flex-1" />
        )}

        {isHost ? (
          <div className="flex flex-none flex-col items-end">
            <button type="button" className={`btn px-4 text-[1rem] ${isLastRound ? "btn-pink" : "btn-green"}`} onClick={skip} disabled={disabled}>
              {busy ? "C'est parti…" : isLastRound ? "Voir le podium" : "Manche suivante"}
              {seconds != null && !busy ? <span className="text-[13px] font-bold tabular-nums opacity-60">{seconds}</span> : null}
            </button>
            {error ? <span className="mt-1 text-[12px] font-semibold text-fluo-pink">{error}</span> : null}
          </div>
        ) : (
          <div className="flex-none text-right" aria-live="off">
            <p className="text-[12px] font-semibold leading-tight text-paper/60">{next} dans</p>
            <p className="font-display text-[22px] font-extrabold leading-none tabular-nums text-fluo-yellow">{seconds == null ? "…" : `${seconds} s`}</p>
          </div>
        )}
      </div>
    </footer>
  );
}
