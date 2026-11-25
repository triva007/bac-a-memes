"use client";

/** Étape 3 (mème validé) et écrans d'attente (arrivé en cours de manche, spectateur). */

import { motion } from "motion/react";
import { MemeView } from "@/components/meme/MemeView";
import { Emoji } from "@/components/ui/Emoji";
import type { GameApi } from "@/features/game/props";
import type { Meme, RoomView } from "@/lib/game/types";
import type { TimePressure } from "./hooks";
import { Icon, Marker, OthersProgress, Spinner, ThemeBanner } from "./ui";

// ------------------------------------------------------------------ après validation

export interface DoneScreenProps {
  view: RoomView;
  api: GameApi;
  meme: Meme;
  onEdit: () => void;
  busy: boolean;
  clock: TimePressure;
}

export function DoneScreen({ view, api, meme, onEdit, busy, clock }: DoneScreenProps) {
  return (
    <div className="mx-auto flex h-full w-full max-w-[600px] flex-col" data-testid="done">
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-3">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-center gap-2">
          <motion.span initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: -8 }} transition={{ type: "spring", stiffness: 500, damping: 16, delay: 0.1 }}>
            <Emoji id="check-mark-button" size={32} />
          </motion.span>
          <h2 className="font-display text-[1.5rem] font-extrabold leading-none text-paper">
            Copie <Marker color="var(--color-fluo-green)">rendue</Marker> !
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.86, rotate: -5 }}
          animate={{ opacity: 1, scale: 1, rotate: -1.2 }}
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
          className="mx-auto mt-3 w-full"
          style={{ height: "min(42dvh, 400px)", filter: "drop-shadow(5px 6px 0 rgba(0,0,0,0.5))" }}
        >
          <MemeView meme={meme} mode="final" fit="contain" />
        </motion.div>

        <div className="mt-3 flex justify-center">
          <button type="button" onClick={onEdit} disabled={busy || clock.up} className="btn btn-sm btn-paper !min-h-[46px] !px-4" data-testid="edit-again">
            {busy ? <Spinner size={18} /> : <Icon name="pencil" size={18} />}
            {clock.up ? "Trop tard pour modifier" : "Modifier mon mème"}
          </button>
        </div>

        <div className="mt-5 rounded-[18px] border-2 border-paper/15 bg-ink-2/80 p-4">
          <OthersProgress view={view} api={api} />
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ attente (arrivé en cours de manche / spectateur)

export function WaitingScreen({ view, api }: { view: RoomView; api: GameApi }) {
  const spectator = view.me === null;
  const theme = view.create?.theme ?? null;
  return (
    <div className="mx-auto flex h-full w-full max-w-[600px] flex-col" data-testid="waiting">
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-5">
        <motion.div initial={{ opacity: 0, y: 14, rotate: -3 }} animate={{ opacity: 1, y: 0, rotate: -1 }} transition={{ type: "spring", stiffness: 300, damping: 22 }} className="card paper-seyes relative mx-auto max-w-md px-5 pb-5 pl-[58px] pt-6">
          <motion.span className="absolute -right-3 -top-5 block" animate={{ rotate: [8, -6, 8] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}>
            <Emoji id={spectator ? "popcorn" : "hourglass-not-done"} size={58} />
          </motion.span>
          <h2 className="font-display text-[1.55rem] font-extrabold leading-[1.05]">
            {spectator ? (
              <>
                Silence, ça <span className="hl">crée</span>…
              </>
            ) : (
              <>
                Tu joues à la <span className="hl">prochaine manche</span>
              </>
            )}
          </h2>
          <p className="mt-2 text-[1.3rem] leading-[24px] text-ink/85" style={{ fontFamily: "var(--font-hand)", fontWeight: 600 }}>
            {spectator
              ? "Les mèmes sont en préparation. Le vote arrive juste après."
              : "T'es arrivé pile pendant que les autres créent. Installe-toi : tu votes juste après, et tu crées à la manche suivante."}
          </p>
        </motion.div>

        {theme ? <ThemeBanner theme={theme} style={{ marginTop: 18 }} /> : null}

        <div className="mt-5 rounded-[18px] border-2 border-paper/15 bg-ink-2/80 p-4">
          <OthersProgress view={view} api={api} />
        </div>
      </div>
    </div>
  );
}
