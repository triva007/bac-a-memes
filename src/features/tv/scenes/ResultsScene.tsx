"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { MemeResult, RoomView } from "@/lib/game/types";
import type { PhaseProps } from "@/features/game/props";
import { useCountdown } from "@/features/game/useRoom";
import { sfx } from "@/lib/sfx";
import { confettiPop } from "../confetti";
import { Leaderboard, type BoardRow } from "../Leaderboard";
import { useCues, useSequence } from "../hooks";
import { PAD, STAGE_W, useStage } from "../stage";
import { Avatar, Chip, DISPLAY, Emo, FLUO, HAND, INK, MemeFrame, PAPER, fitSize, hard } from "../ui";

const TOP_MS = 7500;
const BOARD_MS = 12500;

export function ResultsScene({ view, api }: PhaseProps) {
  const results = view.results;
  // les mèmes de la manche sont figés à l'arrivée sur l'écran : pas de saut si la vue se rafraîchit
  const [entries] = useState<MemeResult[]>(() => results?.entries.slice(0, 3) ?? []);
  const hasTop = entries.length > 0;
  const step = useSequence(hasTop ? [TOP_MS, BOARD_MS] : [BOARD_MS], 0);
  const showTop = hasTop && step === 0;
  const left = useCountdown(view.phaseEndsAt, api);

  if (!results) return null;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={showTop ? "top" : `board-${step}`}
          initial={{ opacity: 0, x: 80 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -80, transition: { duration: 0.22 } }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          style={{ position: "absolute", inset: 0, padding: `8px ${PAD}px 40px` }}
        >
          {showTop ? <TopMemes entries={entries} view={view} /> : <Board view={view} secondsLeft={left} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ------------------------------------------------------------------ top 3 des mèmes de la manche

function TopMemes({ entries, view }: { entries: MemeResult[]; view: RoomView }) {
  const { bodyH } = useStage();
  const innerH = bodyH - 8 - 40;
  const innerW = STAGE_W - PAD * 2;
  const titleH = 112;
  const [first, second, third] = entries;

  useCues([
    [250, () => entries.length > 2 && sfx.play("pop")],
    [900, () => entries.length > 1 && sfx.play("pop")],
    [1250, () => sfx.play("reveal")],
    [
      1950,
      () => {
        confettiPop(0.5, 0.55, 1.5);
        sfx.play("points", 1);
      },
    ],
  ]);

  const solo = entries.length === 1;
  const winW = solo ? 1100 : 840;
  const sideW = (innerW - winW - 2 * 36) / 2;
  const winH = innerH - titleH - 150;
  const sideH = Math.min(winH - 110, 560);
  const color = (r: MemeResult) => view.players.find((p) => p.id === r.authorId)?.color ?? FLUO.blue;

  return (
    <div style={{ height: innerH, display: "flex", flexDirection: "column" }}>
      <div style={{ height: titleH, flex: "none", display: "flex", alignItems: "center", gap: 26 }}>
        <Emo id="trophy" size={84} />
        <h1 style={{ ...DISPLAY, fontSize: 84, lineHeight: 1, margin: 0, whiteSpace: "nowrap" }}>
          {solo ? "Le mème de la manche" : "Les mèmes de la manche"}
        </h1>
        <Chip color={FLUO.blue} size={34} style={{ transform: "rotate(-2deg)", marginLeft: 8 }}>
          Manche {view.round}/{view.totalRounds}
        </Chip>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 36 }}>
        {second ? <TopCard entry={second} rank={2} color={color(second)} maxW={sideW} maxH={sideH} delay={0.9} /> : solo ? null : <div style={{ width: sideW }} />}
        <TopCard entry={first} rank={1} color={color(first)} maxW={winW} maxH={winH} delay={1.95} />
        {third ? <TopCard entry={third} rank={3} color={color(third)} maxW={sideW} maxH={sideH} delay={0.25} /> : solo ? null : <div style={{ width: sideW }} />}
      </div>
    </div>
  );
}

const RANK_MEDAL = { 1: "1st-place-medal", 2: "2nd-place-medal", 3: "3rd-place-medal" } as const;

function TopCard({ entry, rank, color, maxW, maxH, delay }: { entry: MemeResult; rank: 1 | 2 | 3; color: string; maxW: number; maxH: number; delay: number }) {
  const big = rank === 1;
  const avatar = big ? 116 : 80;
  return (
    <motion.div
      initial={{ opacity: 0, y: big ? 160 : 90, scale: big ? 0.6 : 0.8, rotate: big ? -4 : rank === 2 ? -6 : 6 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotate: big ? 0 : rank === 2 ? -1.5 : 1.5 }}
      transition={{ type: "spring", stiffness: big ? 200 : 240, damping: big ? 13 : 18, delay }}
      style={{ width: maxW, flex: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: big ? 20 : 16 }}
    >
      <MemeFrame meme={entry.meme} maxW={maxW} maxH={maxH} border={big ? 7 : 5} shadow={big ? 14 : 9}>
        <div style={{ position: "absolute", left: big ? -34 : -24, top: big ? -40 : -28, transform: "rotate(-12deg)" }}>
          <Emo id={RANK_MEDAL[rank]} size={big ? 124 : 84} />
        </div>
      </MemeFrame>
      <div style={{ display: "flex", alignItems: "center", gap: big ? 20 : 14, maxWidth: "100%", height: big ? 124 : 88 }}>
        <Avatar avatar={entry.authorAvatar} color={color} size={avatar} />
        <div
          style={{
            ...DISPLAY,
            minWidth: 0,
            padding: big ? "6px 24px 10px" : "4px 16px 6px",
            fontSize: big ? fitSize(entry.authorName, [[9, 68], [12, 56], [99, 46]]) : fitSize(entry.authorName, [[8, 42], [12, 34], [99, 28]]),
            lineHeight: 1.1,
            color: INK,
            background: PAPER,
            border: `${big ? 5 : 4}px solid ${INK}`,
            borderRadius: big ? 22 : 16,
            boxShadow: hard(big ? 7 : 5),
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {entry.authorName}
        </div>
        <div
          style={{
            ...DISPLAY,
            flex: "none",
            padding: big ? "6px 22px 10px" : "4px 14px 6px",
            fontSize: big ? 62 : 38,
            lineHeight: 1.1,
            color: INK,
            background: big ? FLUO.yellow : FLUO.green,
            border: `${big ? 5 : 4}px solid ${INK}`,
            borderRadius: big ? 22 : 16,
            boxShadow: hard(big ? 7 : 5),
            transform: "rotate(3deg)",
            whiteSpace: "nowrap",
          }}
        >
          {entry.points} pts
        </div>
      </div>
    </motion.div>
  );
}

// ------------------------------------------------------------------ classement général

function Board({ view, secondsLeft }: { view: RoomView; secondsLeft: number | null }) {
  const { bodyH } = useStage();
  const innerH = bodyH - 8 - 40;
  const titleH = 112;
  const roundPoints = view.results?.roundPoints;
  const isLast = view.results?.isLastRound ?? false;
  const players = view.players;

  const rows = useMemo<BoardRow[]>(() => {
    const list = players
      .filter((p) => p.connected || p.score > 0)
      .map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, color: p.color, score: p.score, prev: Math.max(0, p.score - (roundPoints?.[p.id] ?? 0)), connected: p.connected }));
    return list.sort((a, b) => b.score - a.score);
  }, [players, roundPoints]);

  const sec = secondsLeft == null ? null : Math.ceil(secondsLeft);

  return (
    <div style={{ height: innerH, display: "flex", flexDirection: "column" }}>
      <div style={{ height: titleH, flex: "none", display: "flex", alignItems: "center", gap: 26 }}>
        <Emo id="bar-chart" size={80} />
        <h1 style={{ ...DISPLAY, fontSize: 84, lineHeight: 1, margin: 0, whiteSpace: "nowrap" }}>
          Classement{" "}
          <span style={{ color: INK, background: FLUO.yellow, padding: "0 0.14em", borderRadius: 14, display: "inline-block", transform: "rotate(-1.5deg)" }}>général</span>
        </h1>
        <div style={{ ...HAND, fontSize: 50, lineHeight: 1, color: "#c9c6e6", marginLeft: 8, whiteSpace: "nowrap" }}>
          après la manche {view.round}/{view.totalRounds}
        </div>
        <div style={{ marginLeft: "auto" }}>
          {sec != null ? (
            <Chip color={isLast ? FLUO.pink : PAPER} size={32} style={{ transform: "rotate(1.5deg)" }}>
              <Emo id={isLast ? "trophy" : "stopwatch"} size={40} />
              {isLast ? `Podium dans ${sec} s` : `Manche suivante dans ${sec} s`}
            </Chip>
          ) : null}
        </div>
      </div>
      <Leaderboard rows={rows} width={STAGE_W - PAD * 2} height={innerH - titleH - 8} animated />
    </div>
  );
}
