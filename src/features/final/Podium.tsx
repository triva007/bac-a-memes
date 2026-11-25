"use client";

/**
 * CÉRÉMONIE DU PODIUM : les marches se dévoilent une à une, de la plus basse à
 * la plus haute (roulement de tambour avant chaque nom), fanfare et confettis
 * pour la première place. Rejouable. Gère 1, 2 ou 3 joueurs et les ex æquo.
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Emoji } from "@/components/ui/Emoji";
import { podiumPhrase, type PodiumRank } from "@/lib/content/phrases";
import { sfx } from "@/lib/sfx";
import { Avatar, ChevronIcon, CountUp, fireConfetti, ordinal, pts, useMediaQuery, type Ranked } from "@/features/vote/shared";

const STEP_COLORS: Record<number, string> = {
  1: "var(--color-fluo-yellow)",
  2: "var(--color-fluo-blue)",
  3: "var(--color-fluo-orange)",
};
/** part de la hauteur disponible sous l'avatar occupée par chaque marche */
const STEP_SHARE: Record<number, number> = { 1: 1, 2: 0.72, 3: 0.5 };
/** tailles (px) en mode normal / compact (écrans peu hauts) */
const SIZES = {
  normal: { first: 76, other: 58, names: 54, nameFirst: 18, nameOther: 15, digitFirst: 46, digitOther: 36 },
  compact: { first: 60, other: 48, names: 46, nameFirst: 16, nameOther: 14, digitFirst: 34, digitOther: 28 },
} as const;
const DRUM_MS = 750;

export function Podium({
  top,
  me,
  total,
  seed,
  onNext,
}: {
  /** les 3 premiers (ou moins), dans l'ordre du classement */
  top: Ranked[];
  me: Ranked | null;
  total: number;
  seed: string;
  onNext: () => void;
}) {
  const [run, setRun] = useState(0);
  return <Ceremony key={run} top={top} me={me} total={total} seed={seed} onNext={onNext} onReplay={() => setRun((r) => r + 1)} />;
}

function Ceremony({
  top,
  me,
  total,
  seed,
  onNext,
  onReplay,
}: {
  top: Ranked[];
  me: Ranked | null;
  total: number;
  seed: string;
  onNext: () => void;
  onReplay: () => void;
}) {
  const reduce = useReducedMotion();
  const sz = useMediaQuery("(max-height: 760px)") ? SIZES.compact : SIZES.normal;
  /** place réservée au-dessus de chaque marche : nom + points + avatar */
  const above = sz.names + 8 + sz.first + 8 + 4;
  const n = top.length;
  const [shown, setShown] = useState(0);
  const [finished, setFinished] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const instant = Boolean(reduce) || skipped;
  const revealed = instant ? n : shown;
  const done = instant || finished;

  useEffect(() => {
    if (instant || n === 0) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let t = 900;
    for (let k = 1; k <= n; k++) {
      const last = k === n;
      timers.push(setTimeout(() => sfx.play("reveal"), t));
      timers.push(
        setTimeout(() => {
          setShown(k);
          if (last) {
            sfx.play("fanfare");
            void fireConfetti("podium");
          } else sfx.play("points", 0.35 + 0.2 * k);
        }, t + DRUM_MS),
      );
      t += last ? DRUM_MS + 2200 : 2500;
    }
    timers.push(setTimeout(() => setFinished(true), t));
    return () => timers.forEach(clearTimeout);
  }, [instant, n]);

  // ordre d'affichage : 2e à gauche, 1er au centre, 3e à droite
  const columns = n >= 3 ? [1, 0, 2] : n === 2 ? [1, 0] : [0];
  /** la place à l'index i (0 = premier) est dévoilée quand `revealed` >= n - i */
  const isRevealed = (i: number) => revealed >= n - i;
  const champion = top[0];
  const meOnPodium = me ? top.find((r) => r.player.id === me.player.id) : undefined;
  const nextUp = revealed < n ? top[n - 1 - revealed] : null;

  if (n === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <Emoji id="desert" size={64} />
        <p className="font-display text-2xl font-extrabold text-paper">Un podium sans personne dessus.</p>
        <p className="text-paper/65">Il faut au moins un joueur pour monter sur les marches.</p>
      </div>
    );
  }

  return (
    <div
      className="mx-auto flex h-full min-h-[430px] w-full max-w-xl flex-col justify-center px-3 pb-3 pt-2"
      data-podium-revealed={revealed}
      data-podium-done={done || undefined}
    >
      <div className="relative flex-none text-center">
        <h2 className="font-display text-[30px] font-extrabold leading-[44px] text-paper">
          Le <span className="inline-block -rotate-1 rounded-md bg-fluo-yellow px-2 leading-tight text-ink">podium</span>
        </h2>
        {done && !reduce ? (
          <button
            type="button"
            onClick={onReplay}
            aria-label="Revoir la cérémonie"
            className="absolute right-0 top-0 inline-flex h-11 items-center gap-1.5 rounded-lg px-2 text-[13px] font-semibold text-paper/60 outline-none hover:text-paper focus-visible:ring-2 focus-visible:ring-fluo-blue"
          >
            <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M4 12a8 8 0 1 0 2.6-5.9M4 4v5h5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Revoir
          </button>
        ) : null}
        <div className="flex min-h-[50px] items-center justify-center" aria-live="polite">
          <AnimatePresence mode="wait">
            {done ? (
              <motion.p
                key="phrase"
                className="text-balance px-2 text-center text-[23px] leading-[1.05] text-fluo-yellow"
                style={{ fontFamily: "var(--font-hand)", fontWeight: 700, rotate: -1 }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {n === 1
                  ? "Seul en lice, premier d'office. Stratégie imparable."
                  : champion.player.score === 0
                    ? "Zéro point partout. Match nul, balle au centre."
                    : champion.tied
                      ? `Égalité au sommet ! ${podiumPhrase(1, seed)}`
                      : `${champion.player.name} : ${lowerFirst(podiumPhrase(1, seed))}`}
              </motion.p>
            ) : (
              <motion.p
                key={`wait-${revealed}`}
                className="flex items-center gap-2 text-[14px] font-semibold text-paper/70"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.span animate={{ rotate: [-12, 12, -12] }} transition={{ duration: 0.35, repeat: Infinity }} className="inline-flex">
                  <Emoji id="drum" size={22} />
                </motion.span>
                {nextUp
                  ? nextUp.rank === 1
                    ? n === 1
                      ? "Et la première place revient à…"
                      : "Et tout en haut…"
                    : `À la ${ordinal(nextUp.rank)} place…`
                  : "Roulement de tambour…"}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ------------------------------------------------ les marches */}
      <div
        className={`mx-auto grid max-h-[430px] min-h-[200px] w-full flex-1 basis-0 grid-rows-[minmax(0,1fr)] gap-2 pt-2 ${n >= 3 ? "max-w-md grid-cols-3" : n === 2 ? "max-w-[300px] grid-cols-2" : "max-w-[170px] grid-cols-1"}`}
      >
        {columns.map((i) => {
          const r = top[i];
          const shownNow = isRevealed(i);
          const first = i === 0;
          const size = first ? sz.first : sz.other;
          const isMe = me?.player.id === r.player.id;
          return (
            <div key={r.player.id} className="flex h-full min-w-0 flex-col items-center justify-end">
              <div className="flex w-full flex-none flex-col items-center justify-end px-0.5 text-center" style={{ height: sz.names }}>
                {shownNow ? (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="w-full">
                    <p
                      className={`line-clamp-2 break-words font-display font-extrabold leading-[1.1] ${isMe ? "text-fluo-yellow" : "text-paper"}`}
                      style={{ fontSize: first ? sz.nameFirst : sz.nameOther }}
                    >
                      {r.player.name}
                      {isMe ? <span className="ml-1 text-[11px] font-bold">(toi)</span> : null}
                    </p>
                    <p className="mt-0.5 text-[13px] font-bold tabular-nums leading-none text-paper/70">
                      <CountUp value={r.player.score} duration={700} delay={250} /> {pts(r.player.score)}
                    </p>
                  </motion.div>
                ) : null}
              </div>

              <div className="relative mt-2 flex flex-none items-end justify-center" style={{ height: size + 8 }}>
                {shownNow ? (
                  <motion.div
                    className="relative"
                    initial={{ y: -90, scale: 0.4, opacity: 0 }}
                    animate={{ y: 0, scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 320, damping: 13 }}
                  >
                    <Avatar avatar={r.player.avatar} color={r.player.color} size={size} style={{ boxShadow: "3px 3px 0 0 rgba(0,0,0,0.55)" }} />
                    {r.rank === 1 && r.player.score > 0 ? (
                      <motion.span
                        className="absolute -left-2 -top-6"
                        initial={{ y: -30, opacity: 0, rotate: -50 }}
                        animate={{ y: 0, opacity: 1, rotate: -16 }}
                        transition={{ type: "spring", stiffness: 380, damping: 11, delay: 0.3 }}
                      >
                        <Emoji id="crown" size={Math.round(size * 0.6)} />
                      </motion.span>
                    ) : null}
                  </motion.div>
                ) : (
                  <motion.div
                    className="grid place-items-center rounded-full border-[3px] border-dashed border-paper/35 font-display font-extrabold text-paper/45"
                    style={{ width: size, height: size, fontSize: size * 0.42 }}
                    animate={nextUp === r ? { scale: [1, 1.08, 1], rotate: [-4, 4, -4] } : { scale: 1, rotate: 0 }}
                    transition={nextUp === r ? { duration: 0.45, repeat: Infinity } : { duration: 0.2 }}
                  >
                    ?
                  </motion.div>
                )}
              </div>

              <motion.div
                className="mt-1 flex w-full flex-none flex-col items-center overflow-hidden rounded-t-2xl border-[3px] border-b-0 border-ink pt-1.5 text-ink shadow-[4px_0_0_0_rgba(0,0,0,0.4)]"
                style={{ height: `calc((100% - ${above}px) * ${STEP_SHARE[r.rank] ?? STEP_SHARE[3]})`, background: shownNow ? (STEP_COLORS[r.rank] ?? STEP_COLORS[3]) : "var(--color-paper-2)", transformOrigin: "50% 100%" }}
                animate={shownNow ? { scaleY: [1, 0.9, 1.04, 1] } : { scaleY: 1 }}
                transition={{ duration: 0.45 }}
              >
                <span className="font-display font-extrabold leading-none tabular-nums" style={{ fontSize: first ? sz.digitFirst : sz.digitOther }}>
                  {r.rank}
                </span>
                {r.tied ? <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-ink/65">ex æquo</span> : null}
              </motion.div>
            </div>
          );
        })}
      </div>
      <div className="mx-auto h-[5px] w-full max-w-md flex-none rounded-full bg-ink shadow-[0_3px_0_0_rgba(0,0,0,0.4)]" aria-hidden />

      {/* ------------------------------------------------ après la cérémonie */}
      <div className="mt-2.5 flex h-[96px] flex-none flex-col items-center justify-end gap-2">
        {done ? (
          <>
            {me ? (
              <motion.p
                className="line-clamp-2 text-balance text-center text-[14px] font-semibold leading-[1.25] text-paper/80"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
              >
                {meOnPodium && me.player.score > 0 ? (
                  <>
                    Toi, {ordinal(meOnPodium.rank)}
                    {meOnPodium.tied ? " ex æquo" : ""} :{" "}
                    <span className="text-paper">{lowerFirst(podiumPhrase(Math.min(3, meOnPodium.rank) as PodiumRank, `${seed}:${me.player.id}`))}</span>
                  </>
                ) : (
                  <>
                    Toi : <span className="font-extrabold text-fluo-yellow">{ordinal(me.rank)}</span> sur {total} avec {me.player.score} {pts(me.player.score)}. Le podium, ce
                    sera pour la revanche.
                  </>
                )}
              </motion.p>
            ) : null}
            <motion.button
              type="button"
              className="btn w-full max-w-xs flex-none"
              onClick={onNext}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Remise des diplômes
              <ChevronIcon size={16} stroke={4} />
            </motion.button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setSkipped(true)}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-lg px-3 text-[13px] font-semibold text-paper/50 outline-none hover:text-paper focus-visible:ring-2 focus-visible:ring-fluo-blue"
          >
            Passer la cérémonie
            <ChevronIcon size={12} stroke={3} />
          </button>
        )}
      </div>
    </div>
  );
}

function lowerFirst(text: string): string {
  // garde les sigles (« GOAT officiel… ») et les nombres tels quels
  if (text.length < 2 || text[1] === text[1].toUpperCase()) return text;
  return text[0].toLowerCase() + text.slice(1);
}
