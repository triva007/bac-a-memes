"use client";

/**
 * RÉVÉLATION d'un mème (~5 s) : roulement de tambour, l'auteur se dévoile,
 * les points montent, la répartition des notes s'affiche, puis une phrase
 * d'ambiance. Confettis pour un carton, petits cœurs pour un bide.
 */
import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Emoji } from "@/components/ui/Emoji";
import { revealPhrase, revealRatio, revealTier } from "@/lib/content/phrases";
import { VOTE_OPTIONS, type MemeResult, type PlayerView, type VoteScore } from "@/lib/game/types";
import { sfx } from "@/lib/sfx";
import { Avatar, CountUp, FALLBACK_COLOR, SCORE_COLORS, TIER_COLORS, fireConfetti, pts } from "./shared";

const T_AUTHOR = 700;
const T_POINTS = 1150;
const T_PHRASE = 2000;

export function RevealPanel({
  result,
  myVote,
  isMine,
  players,
}: {
  result: MemeResult;
  myVote: VoteScore | null;
  isMine: boolean;
  players: PlayerView[];
}) {
  const reduce = useReducedMotion();
  const ratio = revealRatio(result.breakdown);
  const tier = revealTier(ratio);
  const phrase = revealPhrase(ratio, result.memeId);
  const color = useMemo(() => players.find((p) => p.id === result.authorId)?.color ?? FALLBACK_COLOR, [players, result.authorId]);
  const maxCount = Math.max(1, ...result.breakdown);
  const votes = result.breakdown[0] + result.breakdown[1] + result.breakdown[2] + result.breakdown[3];

  const [step, setStep] = useState(0);
  useEffect(() => {
    sfx.play("reveal");
    const timers = [
      setTimeout(() => setStep(1), T_AUTHOR),
      setTimeout(() => {
        setStep(2);
        sfx.play("points", ratio);
      }, T_POINTS),
      setTimeout(() => {
        setStep(3);
        if (tier === 4) void fireConfetti("carton");
      }, T_PHRASE),
    ];
    return () => timers.forEach(clearTimeout);
  }, [ratio, tier]);
  const stage = reduce ? 3 : step;

  return (
    <motion.div
      className="card relative px-3 pb-2.5 pt-3"
      data-reveal-stage={stage}
      initial={{ y: 36, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
    >
      {/* ------------------------------------------------ auteur + points */}
      <div className="flex items-center gap-3">
        <div className="relative h-[52px] w-[52px] flex-none" style={{ perspective: 400 }}>
          {stage >= 1 ? (
            <motion.div
              initial={{ rotateY: 90, scale: 0.7 }}
              animate={{ rotateY: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 14 }}
            >
              <Avatar avatar={result.authorAvatar} color={color} size={52} />
            </motion.div>
          ) : (
            <motion.div
              className="grid h-[52px] w-[52px] place-items-center rounded-full border-[3px] border-dashed border-ink/50 bg-paper-2 font-display text-2xl font-extrabold text-ink/60"
              animate={{ rotate: [-6, 6, -6] }}
              transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
            >
              ?
            </motion.div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="h-4 text-[11px] font-bold uppercase leading-4 tracking-wide text-ink/55">
            {stage === 0 ? (
              <>
                C&apos;était signé
                <Dots />
              </>
            ) : isMine ? (
              stage >= 2 ? (
                <motion.span
                  className="inline-block rounded bg-fluo-green px-1.5 text-ink"
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 20 }}
                >
                  +{result.points} {pts(result.points)} pour toi
                </motion.span>
              ) : (
                "C'était signé… toi !"
              )
            ) : (
              "C'était signé"
            )}
          </p>
          <div className="h-7">
            {stage >= 1 ? (
              <motion.p
                className="truncate font-display text-[22px] font-extrabold leading-7"
                initial={{ clipPath: "inset(0 100% 0 0)" }}
                animate={{ clipPath: "inset(0 0% 0 0)" }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <span className="hl" style={{ ["--hl" as string]: color }}>
                  {result.authorName}
                </span>
              </motion.p>
            ) : (
              <div className="mt-1.5 h-4 w-28 rounded bg-ink/15" aria-hidden />
            )}
          </div>
        </div>

        <div className="relative flex-none">
          <motion.div
            className="flex h-[58px] min-w-[78px] flex-col items-center justify-center rounded-2xl border-[3px] border-ink px-2 shadow-[3px_3px_0_0_var(--color-ink)]"
            style={{ background: stage >= 2 ? TIER_COLORS[tier] : "var(--color-paper-2)", rotate: 4 }}
            animate={stage >= 2 ? { scale: tier === 4 ? [1, 1.28, 1] : [1, 1.14, 1] } : { scale: 1 }}
            transition={{ duration: 0.45, delay: stage >= 2 ? 0.55 : 0 }}
            aria-label={`${result.points} ${pts(result.points)}`}
          >
            <span className="font-display text-[30px] font-extrabold leading-none tabular-nums">
              {stage >= 2 ? (
                <>
                  +<CountUp value={result.points} duration={650} />
                </>
              ) : (
                "?"
              )}
            </span>
            <span className="text-[10px] font-bold uppercase leading-tight tracking-wide text-ink/70">{pts(result.points)}</span>
          </motion.div>
          {stage >= 3 && tier === 4 ? (
            <motion.span
              className="absolute -left-4 -top-4"
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: -12 }}
              transition={{ type: "spring", stiffness: 500, damping: 12 }}
            >
              <Emoji id="fire" size={30} />
            </motion.span>
          ) : null}
        </div>
      </div>

      {/* ------------------------------------------------ répartition des notes */}
      <div className="mt-3 grid grid-cols-4 gap-1.5" aria-label="Répartition des notes">
        {VOTE_OPTIONS.map((o) => {
          const count = result.breakdown[o.score];
          const isMyVote = myVote === o.score;
          return (
            <div
              key={o.score}
              className={`relative flex flex-col items-center rounded-xl border-2 px-1.5 pb-1.5 pt-1 ${isMyVote ? "border-ink bg-white" : "border-ink/15 bg-white/50"}`}
            >
              <div className="flex items-center gap-1.5" aria-label={`${o.label} : ${count}`}>
                <Emoji id={o.emoji} size={22} />
                <span className={`font-display text-[17px] font-extrabold leading-none tabular-nums ${stage >= 2 && count > 0 ? "" : "text-ink/35"}`}>
                  {stage >= 2 ? count : "·"}
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-ink/10">
                <div
                  className="h-full origin-left rounded-full border border-ink/70"
                  style={{
                    background: SCORE_COLORS[o.score],
                    transform: `scaleX(${stage >= 2 ? count / maxCount : 0})`,
                    opacity: stage >= 2 && count > 0 ? 1 : 0,
                    transition: "transform 600ms cubic-bezier(0.2, 0.9, 0.3, 1)",
                  }}
                />
              </div>
              {isMyVote ? (
                <span className="absolute -top-2 rounded bg-ink px-1 text-[9px] font-bold uppercase leading-[14px] tracking-wide text-paper">
                  Ta note
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* ------------------------------------------------ phrase d'ambiance */}
      <div className="mt-1.5 flex h-[46px] items-center justify-center gap-2 px-1">
        {stage >= 3 ? (
          <>
            {tier === 0 ? (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 12 }} className="flex-none">
                <Emoji id={votes === 0 ? "cricket" : "teddy-bear"} size={32} />
              </motion.span>
            ) : null}
            <motion.p
              className="text-balance text-center text-[21px] leading-[1.05] text-ink"
              style={{ fontFamily: "var(--font-hand)", fontWeight: 700, rotate: -1 }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {votes === 0 ? "Personne n'a noté. Le mème restera une légende urbaine." : phrase}
            </motion.p>
          </>
        ) : null}
      </div>

      {/* ------------------------------------------------ effets */}
      {stage >= 3 && tier === 4 ? (
        <motion.span
          className="pointer-events-none absolute -top-3.5 left-1/2 rounded-md border-[3px] border-red-pen bg-paper px-2 py-0.5 text-[15px] font-bold uppercase leading-none tracking-widest text-red-pen"
          style={{ fontFamily: "var(--font-type)", x: "-50%" }}
          initial={{ scale: 2.4, opacity: 0, rotate: -14 }}
          animate={{ scale: 1, opacity: 1, rotate: -5 }}
          transition={{ type: "spring", stiffness: 500, damping: 18 }}
        >
          Carton plein
        </motion.span>
      ) : null}
      {stage >= 3 && tier === 0 && !reduce ? <Hearts /> : null}
    </motion.div>
  );
}

function Dots() {
  return (
    <span aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="inline-block"
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
        >
          .
        </motion.span>
      ))}
    </span>
  );
}

/** Bide : trois petits cœurs qui s'envolent, pour la tendresse. */
function Hearts() {
  return (
    <div className="pointer-events-none absolute inset-x-0 -top-2 h-0" aria-hidden>
      {[
        { left: "18%", delay: 0, id: "red-heart", size: 22 },
        { left: "50%", delay: 0.25, id: "mending-heart", size: 26 },
        { left: "80%", delay: 0.5, id: "red-heart", size: 18 },
      ].map((h, i) => (
        <motion.span
          key={i}
          className="absolute"
          style={{ left: h.left }}
          initial={{ y: 10, opacity: 0, scale: 0.4 }}
          animate={{ y: -70, opacity: [0, 1, 1, 0], scale: 1, rotate: i % 2 ? 14 : -14 }}
          transition={{ duration: 1.9, delay: h.delay, ease: "easeOut" }}
        >
          <Emoji id={h.id} size={h.size} />
        </motion.span>
      ))}
    </div>
  );
}
