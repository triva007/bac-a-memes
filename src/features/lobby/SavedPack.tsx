"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Emoji } from "@/components/ui/Emoji";
import { Icon } from "@/components/ui/Icon";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { sfx } from "@/lib/sfx";
import { PACK_MAX, clearPack, forgetImage, type PackMeta } from "./packStore";

const COLLAPSED = 8;
const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/**
 * Encart « Mon pack mémorisé » : les images gardées sur l'appareil, à renvoyer
 * en un tap dans la salle du jour. Retirer une image d'ici ne touche pas à la salle.
 */
export function SavedPack({
  pack,
  isInRoom,
  busy,
  progress,
  blockedReason,
  notice,
  onSend,
}: {
  pack: PackMeta[];
  /** l'image mémorisée est déjà dans la salle */
  isInRoom: (id: string) => boolean;
  /** un envoi (pack ou fichiers) est en cours */
  busy: boolean;
  /** avancement de l'envoi du pack, sinon null */
  progress: { done: number; total: number } | null;
  /** pourquoi on ne peut rien envoyer maintenant (ajout désactivé, limite atteinte…), sinon null */
  blockedReason: string | null;
  /** bilan du dernier envoi */
  notice: string | null;
  onSend: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [target, setTarget] = useState<PackMeta | null>(null);
  const [targetOpen, setTargetOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  if (pack.length === 0) return null;

  const pending = pack.filter((p) => !isInRoom(p.id)).length;
  const already = pack.length - pending;
  const shown = expanded ? pack : pack.slice(0, COLLAPSED);
  const sending = progress !== null;

  return (
    <section className="card p-3.5" aria-labelledby="titre-pack-memorise">
      <div className="flex items-center gap-2">
        <Emoji id="package" size={26} />
        <h2 id="titre-pack-memorise" className="min-w-0 flex-1 font-display text-[1.12rem] font-extrabold leading-tight">
          Mon pack mémorisé <span className="whitespace-nowrap font-sans text-[0.86rem] font-bold text-ink/55">({plural(pack.length, "image", "images")})</span>
        </h2>
      </div>
      <p className="mt-0.5 text-[0.86rem] font-medium leading-snug text-ink/65">
        Gardé sur ce téléphone{pack.length >= PACK_MAX ? ` (plein : ${PACK_MAX} images max)` : ""}. Recharge-le dans chaque nouvelle partie.
      </p>

      <button type="button" className="btn mt-3 w-full !px-3 !text-[1rem]" onClick={onSend} disabled={busy || pending === 0 || blockedReason !== null}>
        {sending ? (
          <>
            Envoi… {progress.done}/{progress.total}
          </>
        ) : pending === 0 ? (
          <>
            <Icon name="check" size={20} strokeWidth={3} />
            Ton pack est dans la partie
          </>
        ) : (
          "Ajouter mon pack à cette partie"
        )}
      </button>
      {sending ? (
        <div className="mt-2 h-3 overflow-hidden rounded-full border-2 border-ink bg-white" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}>
          <div className="h-full bg-fluo-yellow transition-[width] duration-300" style={{ width: `${Math.max(6, (progress.done / progress.total) * 100)}%` }} />
        </div>
      ) : null}
      <p className="mt-2 text-[0.8rem] font-semibold leading-snug text-ink/60" aria-live="polite">
        {pending > 0 && blockedReason
          ? blockedReason
          : pending > 0
            ? `${plural(pending, "image", "images")} à ajouter${already > 0 ? `, ${already} déjà dans la partie` : ""}.`
            : "Rien à renvoyer pour l'instant."}
      </p>
      {notice ? (
        <p role="status" className="mt-2 rounded-xl border-[2.5px] border-ink bg-fluo-orange/35 px-3 py-2 text-[0.88rem] font-bold leading-snug">
          {notice}
        </p>
      ) : null}

      <ul className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
        <AnimatePresence initial={false} mode="popLayout">
          {shown.map((p) => {
            const inRoom = isInRoom(p.id);
            return (
              <motion.li key={p.id} layout initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ type: "spring", stiffness: 420, damping: 26 }}>
                <button
                  type="button"
                  onClick={() => {
                    setTarget(p);
                    setTargetOpen(true);
                  }}
                  aria-label={`Image mémorisée${inRoom ? ", déjà dans la partie" : ""}. Voir ou retirer du pack`}
                  className="relative block aspect-square w-full overflow-hidden rounded-xl border-[2.5px] border-ink bg-ink-3 outline-none focus-visible:ring-4 focus-visible:ring-fluo-blue active:scale-95"
                >
                  {p.thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.thumb} alt="" decoding="async" draggable={false} className="h-full w-full object-cover" />
                  ) : (
                    <span className="grid h-full w-full place-items-center text-paper/60">
                      <Icon name="image" size={22} />
                    </span>
                  )}
                  {inRoom ? (
                    <span className="absolute bottom-1 right-1 grid h-5 w-5 place-items-center rounded-full border-2 border-ink bg-fluo-green text-ink" aria-hidden>
                      <Icon name="check" size={11} strokeWidth={4} />
                    </span>
                  ) : null}
                </button>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      <div className="mt-1.5 flex items-center justify-between gap-2">
        {pack.length > COLLAPSED ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="-ml-2 flex min-h-[44px] items-center gap-1 rounded-lg px-2 text-[0.86rem] font-bold text-ink/75 underline decoration-2 underline-offset-2 outline-none hover:text-ink focus-visible:ring-4 focus-visible:ring-fluo-blue"
          >
            {expanded ? "Replier" : `Voir les ${pack.length}`}
            <Icon name="chevron-down" size={16} className={expanded ? "rotate-180" : ""} />
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => setConfirmClear(true)}
          disabled={busy}
          className="-mr-2 flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 text-[0.86rem] font-bold text-red-pen outline-none hover:bg-red-pen/10 focus-visible:ring-4 focus-visible:ring-fluo-blue disabled:opacity-40"
        >
          <Icon name="trash" size={16} />
          Vider mon pack
        </button>
      </div>

      <Modal
        open={targetOpen && target !== null && pack.some((p) => p.id === target.id)}
        onClose={() => setTargetOpen(false)}
        title="Dans ton pack mémorisé"
        size="sm"
        footer={
          <div className="flex gap-3">
            <button type="button" className="btn btn-paper flex-1" onClick={() => setTargetOpen(false)}>
              Garder
            </button>
            <button
              type="button"
              className="btn btn-pink flex-1"
              disabled={busy}
              onClick={() => {
                if (!target) return;
                sfx.play("tap");
                setTargetOpen(false);
                void forgetImage(target.id);
              }}
            >
              <Icon name="trash" size={19} />
              Retirer
            </button>
          </div>
        }
      >
        {target ? (
          <div className="flex flex-col items-center gap-2">
            {target.thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={target.thumb} alt="Image mémorisée" className="max-h-[42dvh] w-[min(100%,260px)] rounded-xl border-[3px] border-ink bg-ink-3 object-contain" />
            ) : null}
            <p className="text-center text-[0.86rem] font-medium text-ink/65">
              La retirer l&apos;efface de ce téléphone{isInRoom(target.id) ? ", mais elle reste dans la partie en cours" : ""}.
            </p>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={confirmClear}
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          sfx.play("tap");
          setConfirmClear(false);
          void clearPack();
        }}
        title={"Vider ton pack ?"}
        confirmLabel="Tout effacer"
        cancelLabel="Garder"
      >
        {plural(pack.length, "image mémorisée sera effacée", "images mémorisées seront effacées")} de ce téléphone. Celles déjà ajoutées à la partie y restent.
      </ConfirmDialog>
    </section>
  );
}
