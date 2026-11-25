"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { GameApi } from "@/features/game/props";
import { roundTitle } from "@/lib/content/phrases";
import type { RoomView } from "@/lib/game/types";
import { sfx } from "@/lib/sfx";

const SHOW_MS = 2300;
/** On n'annonce la manche que si elle vient de commencer (pas après un rechargement en cours de création). */
const FRESH_MS = 5000;

/**
 * Interstitiel « Manche N » à l'entrée de chaque phase de création.
 * À monter avec `key={manche}` : chaque nouvelle manche rejoue l'annonce.
 */
export function RoundIntro({ view, api }: { view: RoomView; api: GameApi }) {
  const [visible, setVisible] = useState(() => {
    if (view.phaseEndsAt == null) return true;
    const startedAt = view.phaseEndsAt - view.settings.createSeconds * 1000;
    return api.serverNow() - startedAt < FRESH_MS;
  });
  // figés au montage : l'annonce ne doit pas changer si la vue évolue pendant qu'elle s'affiche
  const [frozen] = useState(() => ({
    round: view.round,
    total: view.totalRounds,
    title: roundTitle(view.round, view.totalRounds, `${view.code}:${view.round}`),
  }));

  useEffect(() => {
    if (!visible) return;
    sfx.play("start");
    const t = setTimeout(() => setVisible(false), SHOW_MS);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.button
          type="button"
          key="intro"
          onClick={() => setVisible(false)}
          aria-label={`Manche ${frozen.round} sur ${frozen.total} : ${frozen.title}. Toucher pour passer.`}
          className="bg-grid absolute inset-0 z-20 flex cursor-pointer flex-col items-center justify-center overflow-hidden px-6 text-center outline-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
          transition={{ duration: 0.15 }}
        >
          <motion.span
            initial={{ scale: 0.4, rotate: -14, opacity: 0 }}
            animate={{ scale: 1, rotate: -3, opacity: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 17, delay: 0.05 }}
            className="block whitespace-nowrap rounded-[20px] border-[4px] border-ink bg-fluo-yellow px-5 pb-1 pt-2 font-display text-[clamp(2.5rem,12.5vw,5.5rem)] font-extrabold uppercase leading-none tracking-tight text-ink shadow-[7px_7px_0_0_var(--color-fluo-pink)]"
          >
            Manche {frozen.round}
            <span className="ml-1 text-[0.45em] tracking-normal text-ink/55">/{frozen.total}</span>
          </motion.span>
          <motion.span
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 22, delay: 0.3 }}
            className="mt-6 block max-w-[18ch] font-display text-[clamp(1.5rem,6.5vw,2.4rem)] font-extrabold leading-[1.1] text-paper"
          >
            {frozen.title}
          </motion.span>
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
