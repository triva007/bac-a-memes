"use client";

/**
 * PACK PERSO — images ajoutées par les joueurs, utilisées comme gabarits
 * (`templateId = "perso:<imageId>"`, champs fixes haut / bas).
 * `MemeView` et `TemplateThumb` lisent l'URL et les dimensions dans ce contexte.
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { PERSO_PREFIX, type CustomImage } from "@/lib/game/types";
import { T, useMeme } from "./kit-core";

interface PersoImagesValue {
  code: string;
  images: CustomImage[];
  resolveUrl?: (imageId: string) => string;
}

const PersoImagesContext = createContext<PersoImagesValue | null>(null);

export interface PersoImagesProviderProps {
  /** code de la salle (sert à construire l'URL des images) */
  code: string;
  /** pack perso de la salle (`RoomView.images`) */
  images: CustomImage[];
  /** remplace l'URL par défaut `/api/rooms/<code>/images/<id>` (tests, galerie de dev) */
  resolveUrl?: (imageId: string) => string;
  children: ReactNode;
}

export function PersoImagesProvider({ code, images, resolveUrl, children }: PersoImagesProviderProps) {
  const value = useMemo(() => ({ code, images, resolveUrl }), [code, images, resolveUrl]);
  return <PersoImagesContext.Provider value={value}>{children}</PersoImagesContext.Provider>;
}

export function isPersoTemplateId(templateId: string): boolean {
  return templateId.startsWith(PERSO_PREFIX);
}

/** Hauteur du canevas (largeur 1000) pour une image w × h : son ratio, borné entre 560 et 1400. */
export function persoCanvasHeight(w: number, h: number): number {
  if (!(w > 0) || !(h > 0)) return 1000;
  return Math.max(560, Math.min(1400, Math.round((1000 * h) / w)));
}

export interface PersoImageInfo {
  id: string;
  url: string;
  /** hauteur du canevas virtuel */
  height: number;
}

/** Image perso correspondant à un templateId "perso:<id>", ou null (pas de contexte / image supprimée). */
export function usePersoImage(templateId: string): PersoImageInfo | null {
  const ctx = useContext(PersoImagesContext);
  if (!ctx || !isPersoTemplateId(templateId)) return null;
  const id = templateId.slice(PERSO_PREFIX.length);
  const img = ctx.images.find((i) => i.id === id);
  if (!img) return null;
  const url = ctx.resolveUrl ? ctx.resolveUrl(id) : `/api/rooms/${encodeURIComponent(ctx.code)}/images/${encodeURIComponent(id)}`;
  return { id, url, height: persoCanvasHeight(img.w, img.h) };
}

/** Rendu du gabarit perso : image entière (contain) sur elle-même floutée, légendes haut / bas. */
export function PersoRender({ url, height }: { url: string; height: number }) {
  const { mode } = useMeme();
  const loading = mode === "edit" ? "eager" : "lazy";
  const capH = Math.round(Math.min(300, height * 0.3));
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: "#0d0c1f", overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt=""
          aria-hidden
          draggable={false}
          decoding="async"
          loading={loading}
          style={{ position: "absolute", left: -80, top: -80, width: 1160, maxWidth: "none", height: height + 160, objectFit: "cover", filter: "blur(38px) brightness(0.5) saturate(1.25)", pointerEvents: "none" }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt=""
          draggable={false}
          decoding="async"
          loading={loading}
          style={{ position: "absolute", left: 0, top: 0, width: 1000, maxWidth: "none", height, objectFit: "contain", pointerEvents: "none", userSelect: "none" }}
        />
      </div>
      <T id="haut" x={36} y={22} w={928} h={capH} font="meme" max={104} min={44} upper outline valign="top" />
      <T id="bas" x={36} y={height - capH - 26} w={928} h={capH} font="meme" max={104} min={44} upper outline valign="bottom" />
    </>
  );
}
