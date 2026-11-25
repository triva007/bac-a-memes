"use client";

/** Cartes partagées : vignette de gabarit (sélecteur, bibliothèque) et carte « situation » manuscrite. */

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { TemplateThumb } from "@/components/meme/MemeView";
import { isPersoTemplateId } from "@/components/meme/perso";
import { PERSO_PREFIX, type CustomImage } from "@/lib/game/types";
import { getTemplate } from "@/lib/templates";
import { Icon, keepFocus } from "./ui";

/** Nom affiché sous une vignette. */
export function templateName(templateId: string, images: readonly CustomImage[]): string {
  if (isPersoTemplateId(templateId)) {
    const img = images.find((i) => i.id === templateId.slice(PERSO_PREFIX.length));
    return img ? `Image de ${img.byName}` : "Image du pack";
  }
  return getTemplate(templateId)?.name ?? "Gabarit";
}

const TILTS = [-1.2, 0.9, 0.7, -0.8, -0.6, 1.1];

export interface TemplateCardProps {
  templateId: string;
  name: string;
  /** position dans la grille : sert à l'inclinaison et au décalage de l'animation de distribution */
  index: number;
  selected?: boolean;
  badge?: ReactNode;
  /** rend la vignette tout de suite (main du joueur) au lieu d'attendre qu'elle approche de l'écran */
  eager?: boolean;
  /** joue l'animation de distribution des cartes */
  deal?: boolean;
  disabled?: boolean;
  onPick: (templateId: string) => void;
}

export function TemplateCard({ templateId, name, index, selected = false, badge, eager = false, deal = false, disabled = false, onPick }: TemplateCardProps) {
  const tilt = TILTS[index % TILTS.length];
  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={() => onPick(templateId)}
      data-template-card={templateId}
      aria-label={`Choisir le gabarit « ${name} »`}
      aria-pressed={selected}
      initial={deal ? { opacity: 0, y: 46, rotate: tilt * 7, scale: 0.82 } : false}
      animate={{ opacity: 1, y: 0, rotate: tilt, scale: 1 }}
      whileTap={{ scale: 0.95, rotate: 0 }}
      transition={{ type: "spring", stiffness: 430, damping: 27, delay: deal ? 0.05 + index * 0.06 : 0 }}
      className={`relative flex h-full w-full touch-manipulation flex-col overflow-hidden rounded-[16px] border-[3px] border-ink bg-paper text-left text-ink shadow-hard-light outline-none focus-visible:ring-4 focus-visible:ring-fluo-blue ${
        selected ? "ring-4 ring-fluo-green" : ""
      }`}
    >
      <span className="relative block aspect-[8/7] w-full bg-ink-2">
        <span className="absolute inset-[5px] block">
          <TemplateThumb templateId={templateId} fit="contain" eager={eager} />
        </span>
        {badge ? (
          <span className="absolute left-1.5 top-1.5 rounded-md border-2 border-ink bg-fluo-yellow px-1.5 py-0.5 font-display text-[0.66rem] font-extrabold uppercase leading-none tracking-wide text-ink">
            {badge}
          </span>
        ) : null}
        {selected ? (
          <span className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full border-[2.5px] border-ink bg-fluo-green text-ink">
            <Icon name="check" size={16} stroke={4} />
          </span>
        ) : null}
      </span>
      <span className="flex flex-1 items-center border-t-[3px] border-ink px-2 py-1.5 font-display text-[0.82rem] font-extrabold leading-[1.15]">
        <span className="line-clamp-2">{name}</span>
      </span>
    </motion.button>
  );
}

// ------------------------------------------------------------------ carte situation

const SITUATION_TILTS = [-1.4, 1, -0.6];

/**
 * Carte « situation » façon mot griffonné sur une feuille de cahier.
 * Avec `onUse` c'est un bouton (éditeur : insère le texte dans le champ actif).
 */
export function SituationCard({ text, index, onUse, className = "" }: { text: string; index: number; onUse?: (text: string) => void; className?: string }) {
  const tilt = SITUATION_TILTS[index % SITUATION_TILTS.length];
  const body = (
    <>
      <span aria-hidden className="absolute -top-[7px] left-1/2 h-[14px] w-[58px] -translate-x-1/2 rotate-[-2deg] rounded-[3px] bg-fluo-yellow/85 shadow-[0_1px_0_rgba(0,0,0,0.25)]" />
      <span className="block text-[1.32rem] leading-[24px] text-ink" style={{ fontFamily: "var(--font-hand)", fontWeight: 600 }}>
        {text}
      </span>
      {onUse ? (
        <span className="mt-1 flex items-center justify-end gap-1 font-display text-[0.68rem] font-extrabold uppercase tracking-wide text-violet">
          <Icon name="plus" size={12} stroke={3.6} />
          Utiliser
        </span>
      ) : null}
    </>
  );
  const cls = `paper-seyes relative block w-[236px] flex-none snap-start rounded-[12px] border-[3px] border-ink pb-2 pl-[54px] pr-3 pt-[13px] text-left shadow-hard-light ${className}`;
  const style = { rotate: `${tilt}deg`, backgroundPosition: "0 0, 0 10px, 0 0" };
  if (!onUse) {
    return (
      <div className={cls} style={style} data-situation>
        {body}
      </div>
    );
  }
  return (
    <button
      type="button"
      {...keepFocus}
      onClick={() => onUse(text)}
      className={`${cls} touch-manipulation outline-none transition-transform focus-visible:ring-4 focus-visible:ring-fluo-blue active:translate-x-[2px] active:translate-y-[2px]`}
      style={style}
      data-situation
      aria-label={`Utiliser cette idée : ${text}`}
    >
      {body}
    </button>
  );
}
