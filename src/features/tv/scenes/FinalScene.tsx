"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { VOTE_OPTIONS, type Award, type MemeResult, type PlayerView, type RoomView } from "@/lib/game/types";
import type { PhaseProps } from "@/features/game/props";
import { lastPlacePhrase, podiumPhrase, type PodiumRank } from "@/lib/content/phrases";
import { sfx } from "@/lib/sfx";
import { confettiCannons, confettiPop, confettiRain } from "../confetti";
import { Leaderboard, type BoardRow } from "../Leaderboard";
import { useCues, useSequence } from "../hooks";
import { PAD, STAGE_W, useStage } from "../stage";
import { Avatar, Chip, CountUp, DISPLAY, Emo, FLUO, HAND, HandLine, INK, MemeFrame, PAPER, fitSize, hard, plural } from "../ui";

type Step =
  | { kind: "podium"; stage: "intro" | "third" | "second" | "first" | "last"; ms: number }
  | { kind: "award"; index: number; ms: number }
  | { kind: "gallery"; index: number; ms: number }
  | { kind: "recap"; ms: number };

const GALLERY_MAX = 12;

interface FinalData {
  ranked: PlayerView[];
  awards: Award[];
  gallery: MemeResult[];
}

export function FinalScene({ view }: PhaseProps) {
  const final = view.final;
  // la cérémonie est figée à l'arrivée : un rafraîchissement de la vue ne la fait pas sauter
  const [data] = useState<FinalData | null>(() => {
    if (!final) return null;
    const byId = new Map(view.players.map((p) => [p.id, p]));
    return {
      ranked: final.ranking.map((id) => byId.get(id)).filter((p): p is PlayerView => p != null),
      awards: final.awards,
      gallery: final.gallery.filter((g) => g.points > 0 || final.gallery.length <= 3).slice(0, GALLERY_MAX),
    };
  });

  const { steps, loopFrom } = useMemo(() => {
    const list: Step[] = [];
    if (!data) return { steps: list, loopFrom: 0 };
    const n = data.ranked.length;
    if (n > 0) {
      list.push({ kind: "podium", stage: "intro", ms: 2800 });
      if (n >= 3) list.push({ kind: "podium", stage: "third", ms: 4600 });
      if (n >= 2) list.push({ kind: "podium", stage: "second", ms: 4600 });
      list.push({ kind: "podium", stage: "first", ms: 8500 });
      if (n >= 4) list.push({ kind: "podium", stage: "last", ms: 6500 });
    }
    data.awards.forEach((_, index) => list.push({ kind: "award", index, ms: 7500 }));
    const loop = list.length;
    data.gallery.forEach((_, index) => list.push({ kind: "gallery", index, ms: 8000 }));
    list.push({ kind: "recap", ms: 14000 });
    return { steps: list, loopFrom: loop };
  }, [data]);

  const durations = useMemo(() => steps.map((s) => s.ms), [steps]);
  const index = useSequence(durations, loopFrom);
  const step = steps[index];
  if (!data || !step) return null;

  const key = step.kind === "podium" ? "podium" : step.kind === "gallery" ? "gallery" : step.kind === "award" ? `award-${step.index}` : "recap";

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40, transition: { duration: 0.22 } }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{ position: "absolute", inset: 0, padding: `8px ${PAD}px 40px` }}
        >
          {step.kind === "podium" ? (
            <Podium ranked={data.ranked} stage={step.stage} code={view.code} />
          ) : step.kind === "award" ? (
            <Diploma award={data.awards[step.index]} index={step.index} count={data.awards.length} view={view} gallery={view.final?.gallery ?? data.gallery} />
          ) : step.kind === "gallery" ? (
            <GallerySlide entries={data.gallery} index={step.index} view={view} />
          ) : (
            <Recap ranked={data.ranked} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ------------------------------------------------------------------ podium

const STAGE_ORDER = ["intro", "third", "second", "first", "last"] as const;
const PODIUM_LINES: Record<(typeof STAGE_ORDER)[number], string> = {
  intro: "Roulement de tambour…",
  third: "Médaille de bronze…",
  second: "Médaille d'argent…",
  first: "Et la mention très bien avec félicitations du jury revient à…",
  last: "",
};

function Podium({ ranked, stage, code }: { ranked: PlayerView[]; stage: (typeof STAGE_ORDER)[number]; code: string }) {
  const { bodyH } = useStage();
  const innerH = bodyH - 8 - 40;
  const headH = 168;
  const at = STAGE_ORDER.indexOf(stage);
  const shown = (rank: PodiumRank) => (rank === 3 ? at >= 1 : rank === 2 ? at >= 2 : at >= 3);
  const last = ranked.length >= 4 ? ranked[ranked.length - 1] : null;

  // sons et confettis de chaque palier
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let stopRain: (() => void) | null = null;
    if (stage === "intro") sfx.play("start");
    if (stage === "third" || stage === "second") {
      sfx.play("reveal");
      timers.push(setTimeout(() => confettiPop(stage === "third" ? 0.78 : 0.22, 0.55, 0.8), 760));
    }
    if (stage === "first") {
      sfx.play("reveal");
      timers.push(
        setTimeout(() => {
          sfx.play("fanfare");
          confettiCannons(1.4);
          stopRain = confettiRain(4200);
        }, 820),
      );
    }
    if (stage === "last") sfx.play("points", 0.3);
    return () => {
      timers.forEach(clearTimeout);
      stopRain?.();
    };
  }, [stage]);

  const places: { rank: PodiumRank; player: PlayerView | undefined }[] = [
    { rank: 2, player: ranked[1] },
    { rank: 1, player: ranked[0] },
    { rank: 3, player: ranked[2] },
  ];
  const extra = Math.max(0, innerH - 928);
  const blockH = { 1: 360 + extra * 0.45, 2: 280 + extra * 0.35, 3: 230 + extra * 0.25 } as const;

  return (
    <div style={{ height: innerH, display: "flex", flexDirection: "column" }}>
      <div style={{ height: headH, flex: "none", position: "relative" }}>
        <AnimatePresence mode="wait" initial={false}>
          {stage === "last" && last ? (
            <motion.div
              key="last"
              initial={{ opacity: 0, y: -60, rotate: -2 }}
              animate={{ opacity: 1, y: 0, rotate: -0.6 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
              style={{
                position: "absolute",
                left: 80,
                right: 80,
                top: 4,
                height: headH - 22,
                padding: "0 34px",
                display: "flex",
                alignItems: "center",
                gap: 26,
                color: INK,
                background: PAPER,
                border: `6px solid ${INK}`,
                borderRadius: 34,
                boxShadow: hard(10),
              }}
            >
              <Avatar avatar={last.avatar} color={last.color} size={112} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ ...DISPLAY, fontSize: 48, lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  Et un câlin collectif pour <span style={{ background: `linear-gradient(transparent 52%, ${FLUO.pink} 52%)`, padding: "0 0.1em" }}>{last.name}</span>
                </div>
                <div style={{ ...HAND, fontSize: 46, lineHeight: 1.05, color: "#4a4870", marginTop: 4 }}>{lastPlacePhrase(`${code}:${last.id}`)}</div>
              </div>
              <motion.div animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 1.4, repeat: Infinity }} style={{ flex: "none" }}>
                <Emo id="people-hugging" size={104} />
              </motion.div>
            </motion.div>
          ) : (
            <motion.div key="title" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <h1 style={{ ...DISPLAY, fontSize: 92, lineHeight: 1, margin: 0, whiteSpace: "nowrap" }}>
                Le podium du{" "}
                <span style={{ color: INK, background: FLUO.yellow, padding: "0 0.14em", borderRadius: 16, display: "inline-block", transform: "rotate(-1.5deg)" }}>Bac à Mèmes</span>
              </h1>
              <HandLine text={PODIUM_LINES[stage]} size={56} style={{ marginTop: 10, textAlign: "center", whiteSpace: "nowrap" }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 30 }}>
        {places.map(({ rank, player }) =>
          player ? (
            <PodiumPlace key={rank} rank={rank} player={player} revealed={shown(rank)} blockH={Math.round(blockH[rank])} phrase={podiumPhrase(rank, `${code}:${player.id}`)} />
          ) : ranked.length >= 2 ? (
            <div key={rank} style={{ width: 500 }} />
          ) : null,
        )}
      </div>
    </div>
  );
}

const PLACE_STYLE = {
  1: { color: FLUO.yellow, medal: "1st-place-medal", avatar: 236, name: 76 },
  2: { color: FLUO.blue, medal: "2nd-place-medal", avatar: 180, name: 58 },
  3: { color: FLUO.orange, medal: "3rd-place-medal", avatar: 168, name: 54 },
} as const;

function PodiumPlace({ rank, player, revealed, blockH, phrase }: { rank: PodiumRank; player: PlayerView; revealed: boolean; blockH: number; phrase: string }) {
  const s = PLACE_STYLE[rank];
  const width = rank === 1 ? 560 : 500;
  return (
    <div style={{ width, flex: "none", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ height: s.avatar + s.name * 1.5 + 34, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", marginBottom: 14 }}>
        {revealed ? (
          <motion.div
            initial={{ opacity: 0, y: -260, scale: 0.4, rotate: rank === 1 ? -14 : 12 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 13, delay: 0.72 }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, maxWidth: width }}
          >
            <div style={{ position: "relative" }}>
              <Avatar avatar={player.avatar} color={player.color} size={s.avatar} />
              {rank === 1 ? (
                <motion.div
                  initial={{ y: -120, opacity: 0, rotate: -30 }}
                  animate={{ y: 0, opacity: 1, rotate: -14 }}
                  transition={{ type: "spring", stiffness: 300, damping: 11, delay: 1.25 }}
                  style={{ position: "absolute", left: -26, top: -74 }}
                >
                  <Emo id="crown" size={130} />
                </motion.div>
              ) : null}
            </div>
            <div
              style={{
                ...DISPLAY,
                maxWidth: width - 20,
                padding: "4px 24px 8px",
                fontSize: fitSize(player.name, [[8, s.name], [12, Math.round(s.name * 0.82)], [99, Math.round(s.name * 0.68)]]),
                lineHeight: 1.12,
                color: INK,
                background: PAPER,
                border: `5px solid ${INK}`,
                borderRadius: 22,
                boxShadow: hard(7),
                transform: `rotate(${rank === 1 ? -1.5 : rank === 2 ? 1.5 : -1}deg)`,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {player.name}
            </div>
          </motion.div>
        ) : (
          <motion.div
            animate={{ rotate: [-4, 4, -4] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
            style={{
              ...DISPLAY,
              width: s.avatar * 0.8,
              height: s.avatar * 0.8,
              borderRadius: "50%",
              border: "6px dashed rgba(251,247,236,0.45)",
              display: "grid",
              placeItems: "center",
              fontSize: s.avatar * 0.42,
              color: "rgba(251,247,236,0.55)",
            }}
            aria-hidden
          >
            ?
          </motion.div>
        )}
      </div>

      {/* la marche */}
      <div
        style={{
          width: "100%",
          height: blockH,
          padding: "16px 24px",
          background: PAPER,
          color: INK,
          border: `6px solid ${INK}`,
          borderBottom: "none",
          borderRadius: "28px 28px 0 0",
          boxShadow: hard(10),
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, flex: "none" }}>
          <Emo id={s.medal} size={rank === 1 ? 96 : 78} />
          <div style={{ ...DISPLAY, fontSize: rank === 1 ? 84 : 64, lineHeight: 1, background: s.color, border: `5px solid ${INK}`, borderRadius: 20, padding: "2px 22px 8px", transform: "rotate(-2deg)", whiteSpace: "nowrap" }}>
            {revealed ? <CountUp to={player.score} duration={0.9} delay={0.9} suffix=" pts" /> : rank === 1 ? "1er" : `${rank}e`}
          </div>
        </div>
        {revealed ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5, duration: 0.4 }}
            style={{ ...HAND, fontSize: fitSize(phrase, [[45, rank === 1 ? 50 : 42], [70, rank === 1 ? 44 : 37], [999, rank === 1 ? 40 : 33]]), lineHeight: 1.02, textAlign: "center", color: "#33315c" }}
          >
            {phrase}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ récompenses (« diplômes »)

function Diploma({ award, index, count, view, gallery }: { award: Award; index: number; count: number; view: RoomView; gallery: MemeResult[] }) {
  const { bodyH } = useStage();
  const innerH = bodyH - 8 - 40;
  const innerW = STAGE_W - PAD * 2;
  const player = view.players.find((p) => p.id === award.playerId);
  const entry = award.memeId ? gallery.find((g) => g.memeId === award.memeId) : undefined;
  const sideW = entry ? 600 : 0;
  const cardW = entry ? innerW - sideW - 50 : 1280;
  const cardH = Math.min(innerH - 24, 880);

  useCues([
    [120, () => sfx.play("submit")],
    [900, () => sfx.play("points", 0.7)],
    [950, () => confettiPop(entry ? 0.36 : 0.5, 0.5, 0.9)],
  ]);

  return (
    <div style={{ height: innerH, display: "flex", alignItems: "center", justifyContent: "center", gap: 50 }}>
      <motion.div
        initial={{ rotate: -5, scale: 0.85 }}
        animate={{ rotate: -1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        style={{ width: cardW, height: cardH, flex: "none", position: "relative", background: PAPER, color: INK, border: `7px solid ${INK}`, borderRadius: 30, boxShadow: hard(14), padding: 18 }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            border: `3px solid ${INK}`,
            outline: `2px solid ${INK}`,
            outlineOffset: -12,
            borderRadius: 16,
            padding: "40px 56px 34px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div style={{ fontFamily: "var(--font-type)", fontSize: 30, letterSpacing: "0.22em", textTransform: "uppercase", color: "#4a4870", whiteSpace: "nowrap" }}>
            Académie du Bac à Mèmes · diplôme n° {index + 1}/{count}
          </div>
          <motion.div initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: -6 }} transition={{ type: "spring", stiffness: 280, damping: 11, delay: 0.25 }} style={{ marginTop: 14 }}>
            <Emo id={award.emoji} size={150} />
          </motion.div>
          <h1
            style={{
              fontFamily: "var(--font-news)",
              fontWeight: 900,
              fontSize: fitSize(award.title, [[14, 112], [20, 92], [28, 76], [99, 62]]),
              lineHeight: 1.02,
              margin: "8px 0 0",
            }}
          >
            {award.title}
          </h1>
          <div style={{ ...HAND, fontSize: 46, lineHeight: 1, color: "#4a4870", marginTop: 18 }}>décerné avec les honneurs à</div>
          <motion.div
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 13, delay: 0.9 }}
            style={{ display: "flex", alignItems: "center", gap: 22, marginTop: 14, maxWidth: "100%" }}
          >
            <Avatar avatar={player?.avatar ?? "star"} color={player?.color ?? FLUO.blue} size={120} />
            <div style={{ ...DISPLAY, fontSize: fitSize(award.playerName, [[8, 100], [12, 84], [99, 66]]), lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              <span style={{ background: `linear-gradient(transparent 55%, ${FLUO.yellow} 55%)`, padding: "0 0.12em" }}>{award.playerName}</span>
            </div>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4 }}
            style={{ ...HAND, fontSize: fitSize(award.description, [[70, 54], [110, 46], [999, 40]]), lineHeight: 1.08, margin: "auto 0 0", maxWidth: 1000, paddingBottom: 6 }}
          >
            {award.description}
          </motion.p>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 2.4, rotate: 10 }}
          animate={{ opacity: 0.9, scale: 1, rotate: 12 }}
          transition={{ type: "spring", stiffness: 380, damping: 16, delay: 1.9 }}
          style={{
            position: "absolute",
            right: 44,
            top: 110,
            fontFamily: "var(--font-type)",
            fontSize: 34,
            lineHeight: 1.1,
            textAlign: "center",
            color: "#e5383b",
            border: "6px solid #e5383b",
            borderRadius: 16,
            padding: "10px 18px 6px",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
          aria-hidden
        >
          Vu et
          <br />
          approuvé
        </motion.div>
      </motion.div>

      {entry ? (
        <motion.div
          initial={{ opacity: 0, x: 120, rotate: 8 }}
          animate={{ opacity: 1, x: 0, rotate: 2 }}
          transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.5 }}
          style={{ width: sideW, flex: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}
        >
          <MemeFrame meme={entry.meme} maxW={sideW} maxH={innerH - 130} border={6} shadow={12} />
          <Chip color={FLUO.green} size={34}>
            La pièce à conviction · {entry.points} pts
          </Chip>
        </motion.div>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------ diaporama des meilleurs mèmes

function GallerySlide({ entries, index, view }: { entries: MemeResult[]; index: number; view: RoomView }) {
  const { bodyH } = useStage();
  const innerH = bodyH - 8 - 40;
  const panelW = 500;
  const areaW = STAGE_W - PAD * 2 - panelW - 48;
  const entry = entries[Math.min(index, entries.length - 1)];
  if (!entry) return null;
  const author = view.players.find((p) => p.id === entry.authorId);
  const votes = entry.breakdown.reduce((a, b) => a + b, 0);

  return (
    <div style={{ height: innerH, display: "flex", gap: 48 }}>
      <div style={{ width: areaW, height: innerH, flex: "none", display: "grid", placeItems: "center" }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={entry.memeId}
            initial={{ opacity: 0, x: 200, rotate: 5, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, rotate: index % 2 ? 0.8 : -0.8, scale: 1 }}
            exit={{ opacity: 0, x: -220, rotate: -6, transition: { duration: 0.25, ease: "easeIn" } }}
            transition={{ type: "spring", stiffness: 190, damping: 20 }}
          >
            <MemeFrame meme={entry.meme} maxW={areaW - 20} maxH={innerH - 20} border={7} shadow={14} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div style={{ width: panelW, flex: "none", display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Emo id="framed-picture" size={76} />
          <h1 style={{ ...DISPLAY, fontSize: 76, lineHeight: 1, margin: 0 }}>
            Le{" "}
            <span style={{ color: INK, background: FLUO.pink, padding: "0 0.14em", borderRadius: 14, display: "inline-block", transform: "rotate(-2deg)" }}>best-of</span>
          </h1>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={entry.memeId}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            transition={{ duration: 0.35, delay: 0.25 }}
            style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}
          >
            <div style={{ ...DISPLAY, fontSize: 150, lineHeight: 0.9, whiteSpace: "nowrap", alignSelf: "flex-start" }}>
              <span style={{ fontSize: 70, color: "#9f9dc6" }}>n°</span>
              {index + 1}
              <span style={{ fontSize: 60, color: "#9f9dc6" }}> /{entries.length}</span>
            </div>
            <Avatar avatar={entry.authorAvatar} color={author?.color ?? FLUO.blue} size={200} />
            <div
              style={{
                ...DISPLAY,
                maxWidth: "100%",
                padding: "6px 26px 10px",
                fontSize: fitSize(entry.authorName, [[7, 84], [10, 68], [13, 56], [99, 46]]),
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
              {entry.authorName}
            </div>
            <div style={{ ...DISPLAY, display: "flex", alignItems: "baseline", gap: 12, padding: "6px 28px 12px", color: INK, background: FLUO.yellow, border: `6px solid ${INK}`, borderRadius: 28, boxShadow: hard(8), transform: "rotate(2deg)", whiteSpace: "nowrap" }}>
              <span style={{ fontSize: 104, lineHeight: 1 }}>{entry.points}</span>
              <span style={{ fontSize: 44 }}>{entry.points > 1 ? "points" : "point"}</span>
            </div>
            <div style={{ display: "flex", gap: 12, width: "100%" }}>
              {VOTE_OPTIONS.map((o) => (
                <div key={o.score} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 0 6px", color: INK, background: PAPER, border: `4px solid ${INK}`, borderRadius: 18, opacity: entry.breakdown[o.score] ? 1 : 0.5 }}>
                  <Emo id={o.emoji} size={54} />
                  <span style={{ ...DISPLAY, fontSize: 42, lineHeight: 1 }}>{entry.breakdown[o.score]}</span>
                </div>
              ))}
            </div>
            <div style={{ ...HAND, fontSize: 42, lineHeight: 1, color: "#c9c6e6" }}>
              manche {entry.round} · {plural(votes, "vote", "votes")}
            </div>
          </motion.div>
        </AnimatePresence>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", flex: "none", height: 20 }} aria-hidden>
          {entries.map((e, i) => (
            <span key={e.memeId} style={{ width: i === index ? 46 : 18, height: 18, borderRadius: 9, background: i === index ? FLUO.yellow : "rgba(251,247,236,0.3)", transition: "width 0.3s, background-color 0.3s" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ classement final

function Recap({ ranked }: { ranked: PlayerView[] }) {
  const { bodyH } = useStage();
  const innerH = bodyH - 8 - 40;
  const titleH = 112;
  const rows: BoardRow[] = ranked.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, color: p.color, score: p.score, prev: p.score, connected: true }));
  const winner = ranked[0];
  return (
    <div style={{ height: innerH, display: "flex", flexDirection: "column" }}>
      <div style={{ height: titleH, flex: "none", display: "flex", alignItems: "center", gap: 26 }}>
        <Emo id="trophy" size={84} />
        <h1 style={{ ...DISPLAY, fontSize: 84, lineHeight: 1, margin: 0, whiteSpace: "nowrap" }}>
          Classement{" "}
          <span style={{ color: INK, background: FLUO.yellow, padding: "0 0.14em", borderRadius: 14, display: "inline-block", transform: "rotate(-1.5deg)" }}>final</span>
        </h1>
        {winner ? (
          <div style={{ ...HAND, fontSize: 52, lineHeight: 1, color: "#c9c6e6", marginLeft: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>
            bravo {winner.name}, major de promo !
          </div>
        ) : null}
      </div>
      <Leaderboard rows={rows} width={STAGE_W - PAD * 2} height={innerH - titleH - 8} animated={false} />
    </div>
  );
}
