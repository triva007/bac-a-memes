"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { VOTE_OPTIONS, type Meme, type MemeResult, type RoomView } from "@/lib/game/types";
import type { GameApi, PhaseProps } from "@/features/game/props";
import { useCountdown } from "@/features/game/useRoom";
import { revealPhrase, revealRatio, revealTier } from "@/lib/content/phrases";
import { sfx } from "@/lib/sfx";
import { confettiCannons, confettiPop } from "../confetti";
import { useCues } from "../hooks";
import { PAD, STAGE_W, useStage } from "../stage";
import { Avatar, CountUp, DISPLAY, Emo, FLUO, HAND, INK, MemeFrame, PAPER, fitSize, hard } from "../ui";

const PANEL_W = 470;
const GAP = 48;

/** Garde la même référence de mème tant que son id ne change pas (la vue est rafraîchie chaque seconde). */
function useStableMeme(id: string, meme: Meme): Meme {
  const [held, setHeld] = useState({ id, meme });
  if (held.id !== id) {
    setHeld({ id, meme });
    return meme;
  }
  return held.meme;
}

export function VoteScene({ view, api }: PhaseProps) {
  if (!view.vote) return null;
  return <VoteBody view={view} vote={view.vote} api={api} />;
}

function VoteBody({ view, vote, api }: { view: RoomView; vote: NonNullable<RoomView["vote"]>; api: GameApi }) {
  const { bodyH } = useStage();
  const meme = useStableMeme(vote.memeId, vote.meme);
  const result = view.phase === "reveal" ? vote.result : null;
  const areaW = STAGE_W - PAD * 2 - PANEL_W - GAP;
  const areaH = bodyH - 8 - 40;

  // un petit « pop » à chaque nouveau mème
  useEffect(() => {
    sfx.play("pop");
  }, [vote.memeId]);

  return (
    <div style={{ position: "absolute", inset: 0, padding: `8px ${PAD}px 40px`, display: "flex", gap: GAP }}>
      <div style={{ width: areaW, height: areaH, flex: "none", display: "grid", placeItems: "center" }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={vote.memeId}
            initial={{ opacity: 0, y: 120, rotate: -5, scale: 0.86 }}
            animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, x: -260, rotate: -9, scale: 0.9, transition: { duration: 0.22, ease: "easeIn" } }}
            transition={{ type: "spring", stiffness: 210, damping: 19 }}
          >
            <MemeFrame meme={meme} maxW={areaW - 16} maxH={areaH - 16} border={7} shadow={14} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div style={{ width: PANEL_W, height: areaH, flex: "none", position: "relative" }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${vote.memeId}:${result ? "reveal" : "vote"}`}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40, transition: { duration: 0.16 } }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            style={{ position: "absolute", inset: 0 }}
          >
            {result ? (
              <RevealPanel result={result} view={view} />
            ) : (
              <VotePanel index={vote.index} count={vote.count} voted={vote.votedCount} voters={vote.votersCount} total={view.settings.voteSeconds} endsAt={view.phase === "vote" ? view.phaseEndsAt : null} api={api} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ pendant le vote

function VotePanel({ index, count, voted, voters, total, endsAt, api }: { index: number; count: number; voted: number; voters: number; total: number; endsAt: number | null; api: GameApi }) {
  const left = useCountdown(endsAt, api);
  const sec = left == null ? null : Math.ceil(left);
  const frac = left == null ? 1 : Math.max(0, Math.min(1, left / Math.max(1, total)));
  const urgent = sec != null && sec <= 5;

  useEffect(() => {
    if (sec != null && sec > 0 && sec <= 3) sfx.play("tick", 0.4);
  }, [sec]);

  // chaque vote fait monter la jauge… et la note
  const before = useRef(voted);
  useEffect(() => {
    if (voted > before.current) sfx.play("vote", voters > 0 ? Math.min(1, voted / voters) : 0.5);
    before.current = voted;
  }, [voted, voters]);

  const pct = voters > 0 ? Math.min(1, voted / voters) : 0;
  const everyone = voters > 0 && voted >= voters;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 26 }}>
      {/* numéro du mème */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 18 }}>
        <div style={{ ...DISPLAY, fontSize: 52, lineHeight: 1, color: INK, background: FLUO.pink, border: `5px solid ${INK}`, borderRadius: 18, padding: "8px 20px 10px", boxShadow: hard(6), transform: "rotate(-3deg)", marginBottom: 14 }}>
          Mème
        </div>
        <div style={{ ...DISPLAY, lineHeight: 0.85, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }} aria-label={`Mème ${index + 1} sur ${count}`}>
          <span style={{ fontSize: count >= 100 ? 120 : 150 }}>{index + 1}</span>
          <span style={{ fontSize: count >= 100 ? 62 : 76, color: "#9f9dc6" }}>/{count}</span>
        </div>
      </div>

      {/* temps restant */}
      <div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span style={{ fontSize: 32, fontWeight: 700, color: "#c9c6e6" }}>Temps pour noter</span>
          <span style={{ ...DISPLAY, fontSize: 56, lineHeight: 1, color: urgent ? FLUO.pink : PAPER, fontVariantNumeric: "tabular-nums" }} role="timer">
            {sec == null ? "" : `${sec} s`}
          </span>
        </div>
        <div style={{ marginTop: 10, height: 34, background: "#2c2a5a", border: `4px solid ${PAPER}`, borderRadius: 17, overflow: "hidden" }}>
          <div style={{ width: `${frac * 100}%`, height: "100%", background: urgent ? FLUO.pink : FLUO.yellow, transition: "width 0.28s linear, background-color 0.3s" }} />
        </div>
      </div>

      {/* jauge de votes */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          position: "relative",
          background: PAPER,
          border: `6px solid ${INK}`,
          borderRadius: 40,
          boxShadow: hard(10),
          overflow: "hidden",
          transform: "rotate(0.6deg)",
        }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={voters}
        aria-valuenow={voted}
        aria-label="Votes reçus"
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: `${4 + pct * 96}%`,
            background: FLUO.green,
            transition: "height 0.7s cubic-bezier(.3,1.5,.5,1)",
          }}
        >
          <motion.svg
            viewBox="0 0 400 24"
            preserveAspectRatio="none"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
            style={{ position: "absolute", left: 0, bottom: "100%", width: "200%", height: 26, display: "block", marginBottom: -1 }}
            aria-hidden
          >
            <path d="M0 24V12C25 0 75 0 100 12s75 12 100 0 75-12 100 0 75 12 100 0v12z" fill={FLUO.green} />
          </motion.svg>
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.span
              key={i}
              animate={{ y: [0, -150 - i * 24], opacity: [0, 0.75, 0], scale: [0.6, 1.1] }}
              transition={{ duration: 2.6 + i * 0.5, repeat: Infinity, delay: i * 0.55, ease: "easeOut" }}
              style={{ position: "absolute", left: `${12 + i * 19}%`, bottom: 6, width: 18 + (i % 3) * 8, height: 18 + (i % 3) * 8, borderRadius: "50%", border: "4px solid rgba(20,19,43,0.35)" }}
              aria-hidden
            />
          ))}
        </div>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: INK, textAlign: "center" }}>
          <motion.div
            key={voted}
            initial={{ scale: 1.3, rotate: -4 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 13 }}
            style={{ ...DISPLAY, lineHeight: 0.9, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}
          >
            <span style={{ fontSize: 170 }}>{voted}</span>
            <span style={{ fontSize: 80, opacity: 0.6 }}>/{voters}</span>
          </motion.div>
          <div style={{ ...DISPLAY, fontSize: 44, marginTop: 6 }}>{everyone ? "Tout le monde a voté !" : voted > 1 ? "ont voté" : "a voté"}</div>
        </div>
      </div>

      {/* consigne */}
      <div style={{ flex: "none" }}>
        <div style={{ ...DISPLAY, fontSize: 44, lineHeight: 1.05, textAlign: "center" }}>À vos téléphones : notez !</div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, padding: "0 6px" }}>
          {VOTE_OPTIONS.map((o, i) => (
            <motion.div
              key={o.score}
              animate={{ y: [0, -14, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: 108 }}
            >
              <Emo id={o.emoji} size={78} />
              <span style={{ fontSize: 22, fontWeight: 700, color: "#c9c6e6", whiteSpace: "nowrap" }}>{o.label}</span>
            </motion.div>
          ))}
        </div>
        <div style={{ ...HAND, fontSize: 40, lineHeight: 1, color: FLUO.yellow, textAlign: "center", marginTop: 12 }}>Qui a pondu ça ? Mystère…</div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ révélation

const TIER_TONE = [
  { label: "Câlin collectif", color: FLUO.pink, emoji: "people-hugging" },
  { label: "Sourire poli", color: FLUO.blue, emoji: "slightly-smiling-face" },
  { label: "Validé", color: FLUO.green, emoji: "clapping-hands" },
  { label: "Banger", color: FLUO.orange, emoji: "fire" },
  { label: "Carton plein", color: FLUO.yellow, emoji: "trophy" },
] as const;

function RevealPanel({ result, view }: { result: MemeResult; view: RoomView }) {
  const ratio = revealRatio(result.breakdown);
  const tier = revealTier(ratio);
  const tone = TIER_TONE[tier];
  const phrase = revealPhrase(ratio, result.memeId);
  const author = view.players.find((p) => p.id === result.authorId);
  const color = author?.color ?? FLUO.blue;
  const best = Math.max(...result.breakdown);
  const tender = tier === 0;

  useCues([
    [0, () => sfx.play("reveal")],
    [1000, () => sfx.play("points", tender ? 0 : Math.max(0.2, ratio))],
    [
      1100,
      () => {
        if (tier >= 4) confettiCannons(1.2);
        else if (tier === 3) confettiPop(0.86, 0.4, 1.1);
      },
    ],
    [1900, () => tier >= 4 && confettiPop(0.86, 0.35, 1.2)],
  ]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ ...HAND, fontSize: 58, lineHeight: 1, color: FLUO.yellow, flex: "none" }}
      >
        Un mème signé…
      </motion.div>

      {/* l'auteur */}
      <motion.div
        initial={{ opacity: 0, scale: 0.2, rotate: -18 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 13, delay: 0.7 }}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, width: "100%", flex: "none" }}
      >
        <Avatar avatar={result.authorAvatar} color={color} size={176} />
        <div
          style={{
            ...DISPLAY,
            maxWidth: "100%",
            padding: "6px 26px 10px",
            fontSize: fitSize(result.authorName, [[7, 78], [10, 66], [13, 54], [99, 44]]),
            lineHeight: 1.1,
            color: INK,
            background: PAPER,
            border: `5px solid ${INK}`,
            borderRadius: 22,
            boxShadow: hard(7),
            transform: "rotate(-2deg)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {result.authorName}
        </div>
      </motion.div>

      {/* les points */}
      <motion.div
        initial={{ opacity: 0, scale: 0.4, rotate: 10 }}
        animate={{ opacity: 1, scale: 1, rotate: 2 }}
        transition={{ type: "spring", stiffness: 320, damping: 12, delay: 1.0 }}
        style={{
          ...DISPLAY,
          display: "flex",
          alignItems: "baseline",
          gap: 14,
          flex: "none",
          padding: "4px 28px 10px",
          color: INK,
          background: tone.color,
          border: `6px solid ${INK}`,
          borderRadius: 30,
          boxShadow: hard(9),
          whiteSpace: "nowrap",
        }}
        aria-label={`${result.points} points`}
      >
        <span style={{ fontSize: 108, lineHeight: 1 }}>
          <CountUp to={result.points} prefix="+" duration={0.75} delay={1.05} />
        </span>
        <span style={{ fontSize: 44 }}>{result.points > 1 ? "points" : "point"}</span>
      </motion.div>

      {/* répartition des notes */}
      <div style={{ display: "flex", gap: 12, width: "100%", justifyContent: "center", flex: "none" }}>
        {VOTE_OPTIONS.map((o, i) => {
          const n = result.breakdown[o.score];
          const top = n > 0 && n === best;
          return (
            <motion.div
              key={o.score}
              initial={{ opacity: 0, y: 30, scale: 0.7 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 16, delay: 1.35 + i * 0.09 }}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0,
                padding: "6px 0 6px",
                color: INK,
                background: top ? FLUO.yellow : PAPER,
                border: `4px solid ${INK}`,
                borderRadius: 20,
                boxShadow: hard(5),
                opacity: n === 0 ? 0.55 : 1,
              }}
              aria-label={`${o.label} : ${n}`}
            >
              <Emo id={o.emoji} size={54} style={n === 0 ? { filter: "grayscale(0.7)", opacity: 0.6 } : undefined} />
              <span style={{ ...DISPLAY, fontSize: 44, lineHeight: 1, opacity: n === 0 ? 0.45 : 1 }}>{n}</span>
            </motion.div>
          );
        })}
      </div>

      {/* la réaction */}
      <motion.div
        initial={{ opacity: 0, y: 30, rotate: 2 }}
        animate={{ opacity: 1, y: 0, rotate: -1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 1.7 }}
        className="paper-seyes"
        style={{
          position: "relative",
          width: "100%",
          flex: "0 1 300px",
          minHeight: 0,
          padding: "26px 22px 12px 62px",
          marginTop: 8,
          overflow: "visible",
          color: INK,
          border: `5px solid ${INK}`,
          borderRadius: 26,
          boxShadow: hard(8),
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          style={{
            ...DISPLAY,
            position: "absolute",
            left: 22,
            top: -22,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "4px 16px 6px",
            fontSize: 28,
            background: tone.color,
            border: `4px solid ${INK}`,
            borderRadius: 14,
            transform: "rotate(-3deg)",
            whiteSpace: "nowrap",
          }}
        >
          <Emo id={tone.emoji} size={36} />
          {tone.label}
        </div>
        <div style={{ ...HAND, fontSize: fitSize(phrase, [[40, 52], [60, 46], [85, 40], [999, 34]]), lineHeight: 1.05 }}>{phrase}</div>
        {tender ? <Hearts /> : null}
      </motion.div>
    </div>
  );
}

/** Bide : des petits cœurs qui montent, parce qu'on charrie mais on aime. */
function Hearts() {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }} aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 0, scale: 0.5 }}
          animate={{ opacity: [0, 1, 0], y: -190 - i * 30, scale: 1, x: (i % 2 ? 1 : -1) * 18 }}
          transition={{ duration: 2.2, delay: 2 + i * 0.35, repeat: Infinity, repeatDelay: 0.6, ease: "easeOut" }}
          style={{ position: "absolute", right: 20 + i * 62, bottom: 6 }}
        >
          <Emo id={i % 2 ? "pink-heart" : "red-heart"} size={44} />
        </motion.div>
      ))}
    </div>
  );
}
