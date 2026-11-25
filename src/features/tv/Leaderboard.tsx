"use client";

import { motion } from "motion/react";
import { useEffect } from "react";
import { sfx } from "@/lib/sfx";
import { useSequence } from "./hooks";
import { CountUp, DISPLAY, Emo, FLUO, INK, PAPER } from "./ui";

export interface BoardRow {
  id: string;
  name: string;
  avatar: string;
  color: string;
  /** score actuel */
  score: number;
  /** score avant la manche (= score si pas d'animation) */
  prev: number;
  connected: boolean;
}

const MEDALS = ["1st-place-medal", "2nd-place-medal", "3rd-place-medal"];

/**
 * Classement en barres. `rows` est déjà trié (ordre final). Avec `animated`, on part
 * de l'ordre et des scores d'avant la manche : les barres poussent, les points de la
 * manche s'ajoutent, puis les lignes se réordonnent.
 * Lisible jusqu'à 40 joueurs : 1, 2 ou 3 colonnes selon l'effectif.
 */
export function Leaderboard({ rows, width, height, animated }: { rows: BoardRow[]; width: number; height: number; animated: boolean }) {
  const step = useSequence(animated ? [1000, 1700, 1] : [1], null);
  const stage = animated ? step : 2;

  useEffect(() => {
    if (!animated) return;
    if (stage === 1) sfx.play("points", 0.8);
    if (stage === 2) sfx.play("pop");
  }, [animated, stage]);

  const n = rows.length;
  const cols = n <= 10 ? 1 : n <= 30 ? 2 : 3;
  const perCol = Math.max(1, Math.ceil(n / cols));
  const maxRowH = cols === 1 ? 108 : cols === 2 ? 92 : 66;
  const slot = Math.min(maxRowH, height / perCol);
  const gap = Math.max(5, Math.round(slot * 0.15));
  const h = Math.floor(slot - gap);
  const colGap = cols === 1 ? 0 : 36;
  const colW = cols === 1 ? Math.min(width, 1240) : (width - colGap * (cols - 1)) / cols;
  const left0 = cols === 1 ? (width - colW) / 2 : 0;

  const finalIndex = new Map(rows.map((r, i) => [r.id, i]));
  const before = [...rows].sort((a, b) => b.prev - a.prev || (finalIndex.get(a.id) ?? 0) - (finalIndex.get(b.id) ?? 0));
  const beforeIndex = new Map(before.map((r, i) => [r.id, i]));
  const max = Math.max(1, ...rows.map((r) => r.score));

  const rankW = Math.round(h * 0.95);
  const cardW = colW - rankW - 8;
  const avatarD = h - 10;
  // la barre s'arrête avant la zone du score : le nombre reste toujours sur fond papier
  const scoreW = Math.round(h * 1.5);

  return (
    <div style={{ position: "relative", width, height }} role="list" aria-label="Classement">
      {rows.map((r) => {
        const index = (stage < 2 ? beforeIndex.get(r.id) : finalIndex.get(r.id)) ?? 0;
        const col = Math.floor(index / perCol);
        const x = left0 + col * (colW + colGap);
        const y = (index % perCol) * slot;
        const shown = stage === 0 ? r.prev : r.score;
        const delta = r.score - r.prev;
        const frac = Math.max(0, shown / max);
        const barW = avatarD + 14 + frac * (cardW - avatarD - 26 - scoreW);
        return (
          <motion.div
            key={r.id}
            role="listitem"
            initial={false}
            animate={{ x, y }}
            transition={{ type: "spring", stiffness: 150, damping: 21 }}
            style={{ position: "absolute", left: 0, top: 0, width: colW, height: h, display: "flex", alignItems: "center", gap: 8, zIndex: stage === 2 ? n - index : undefined }}
          >
            <div style={{ ...DISPLAY, width: rankW, flex: "none", textAlign: "center", fontSize: Math.round(h * 0.52), lineHeight: 1, color: PAPER, fontVariantNumeric: "tabular-nums" }}>
              {stage === 2 && index < 3 && r.score > 0 ? <Emo id={MEDALS[index]} size={Math.round(h * 0.92)} style={{ display: "inline-block", verticalAlign: "middle" }} /> : index + 1}
            </div>
            <div
              style={{
                position: "relative",
                width: cardW,
                height: h,
                flex: "none",
                background: PAPER,
                border: `${h > 50 ? 4 : 3}px solid ${INK}`,
                borderRadius: Math.round(h * 0.32),
                boxShadow: `${h > 50 ? 5 : 3}px ${h > 50 ? 5 : 3}px 0 0 rgba(0,0,0,0.55)`,
                overflow: "hidden",
                opacity: r.connected ? 1 : 0.6,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: barW,
                  background: r.color,
                  borderRight: `3px solid ${INK}`,
                  borderRadius: `0 ${Math.round(h * 0.3)}px ${Math.round(h * 0.3)}px 0`,
                  transition: "width 1.1s cubic-bezier(.2,1.25,.35,1)",
                }}
              />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", gap: Math.round(h * 0.2), padding: `0 ${Math.round(h * 0.26)}px 0 ${Math.round(h * 0.1)}px`, color: INK }}>
                <div style={{ width: avatarD - 6, height: avatarD - 6, flex: "none", borderRadius: "50%", background: "rgba(255,255,255,0.75)", border: `${h > 50 ? 3 : 2}px solid ${INK}`, display: "grid", placeItems: "center" }}>
                  <Emo id={r.avatar} size={Math.round((avatarD - 6) * 0.7)} />
                </div>
                <div style={{ ...DISPLAY, flex: 1, minWidth: 0, fontSize: Math.round(h * 0.47), lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                {animated && delta > 0 && stage >= 1 ? (
                  <motion.div
                    initial={{ scale: 0, rotate: -12 }}
                    animate={{ scale: 1, rotate: -3 }}
                    transition={{ type: "spring", stiffness: 420, damping: 13 }}
                    style={{ ...DISPLAY, flex: "none", fontSize: Math.round(h * 0.38), lineHeight: 1, padding: `${Math.round(h * 0.09)}px ${Math.round(h * 0.18)}px`, background: FLUO.green, border: `${h > 50 ? 3 : 2}px solid ${INK}`, borderRadius: Math.round(h * 0.2) }}
                  >
                    +{delta}
                  </motion.div>
                ) : null}
                <div style={{ ...DISPLAY, flex: "none", minWidth: Math.round(h * 1.1), textAlign: "right", fontSize: Math.round(h * 0.56), lineHeight: 1 }}>
                  {animated ? <CountUp from={r.prev} to={shown} duration={1} /> : r.score}
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
