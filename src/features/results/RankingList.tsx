"use client";

/**
 * Classement compact (lisible à 30+ joueurs) : médailles pour le top 3, ligne
 * du joueur surlignée, points de la manche, réordonnancement animé quand
 * l'ordre des lignes change.
 */
import type { Ref } from "react";
import { motion } from "motion/react";
import { Emoji } from "@/components/ui/Emoji";
import type { PlayerView } from "@/lib/game/types";
import { Avatar, CountUp, MEDALS } from "@/features/vote/shared";

export interface RankRow {
  player: PlayerView;
  /** rang avec ex æquo */
  rank: number;
  score: number;
  /** points gagnés pendant la manche ("+N") */
  gain?: number;
  /** places gagnées (> 0) ou perdues (< 0) */
  move?: number;
}

export function RankingList({
  rows,
  meId,
  myRowRef,
  className,
}: {
  rows: RankRow[];
  meId: string | null;
  myRowRef?: Ref<HTMLLIElement>;
  className?: string;
}) {
  return (
    <ol className={`card overflow-hidden ${className ?? ""}`} aria-label="Classement général">
      {rows.map((row, i) => {
        const p = row.player;
        const me = p.id === meId;
        const medal = row.rank <= 3 && row.score > 0 ? MEDALS[row.rank - 1] : null;
        return (
          <motion.li
            key={p.id}
            ref={me ? myRowRef : undefined}
            layout="position"
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            data-me={me || undefined}
            className={[
              "relative flex h-10 items-center gap-2 pl-1.5 pr-2.5",
              i > 0 ? "border-t border-rule" : "",
              me ? "z-[1] bg-fluo-yellow shadow-[inset_0_0_0_2px_var(--color-ink)]" : "bg-paper",
            ].join(" ")}
          >
            <span className="flex w-8 flex-none items-center justify-center font-display text-[15px] font-extrabold tabular-nums text-ink/70">
              {medal ? <Emoji id={medal} size={24} alt={`${row.rank}`} /> : row.rank}
            </span>
            <Avatar avatar={p.avatar} color={p.color} size={28} className={p.connected ? "" : "opacity-50 grayscale"} />
            <span className={`min-w-0 flex-1 truncate text-[15px] leading-tight ${me ? "font-extrabold" : "font-semibold"} ${p.connected ? "" : "text-ink/45"}`}>
              {p.name}
              {me ? <span className="ml-1 text-[12px] font-bold text-ink/60">(toi)</span> : null}
              {!p.connected ? <span className="ml-1 text-[11px] font-medium text-ink/45">parti</span> : null}
            </span>
            {row.move ? (
              <span
                className={`flex-none text-[11px] font-extrabold tabular-nums ${row.move > 0 ? "text-[#0b8a4b]" : "text-red-pen"}`}
                aria-label={row.move > 0 ? `gagne ${row.move} place${row.move > 1 ? "s" : ""}` : `perd ${-row.move} place${row.move < -1 ? "s" : ""}`}
              >
                {row.move > 0 ? "▲" : "▼"}
                {Math.abs(row.move)}
              </span>
            ) : null}
            {row.gain !== undefined ? (
              <span
                className={`flex-none rounded-md px-1.5 py-0.5 text-[12px] font-extrabold tabular-nums leading-none ${
                  row.gain > 0 ? "border border-ink/80 bg-fluo-green text-ink" : "text-ink/35"
                }`}
              >
                +{row.gain}
              </span>
            ) : null}
            <span className="w-9 flex-none text-right font-display text-[17px] font-extrabold tabular-nums leading-none">
              <CountUp value={row.score} from={row.score} duration={700} />
            </span>
          </motion.li>
        );
      })}
    </ol>
  );
}
