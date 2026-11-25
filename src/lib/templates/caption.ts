/**
 * Fonctions pures des gabarits « image à légender » (pack perso, pack intégré).
 * SANS "use client" : appelées au niveau module par le registre, côté serveur aussi.
 */

/** Hauteur du canevas (largeur 1000) pour une image w × h : son ratio, borné entre 560 et 1400. */
export function persoCanvasHeight(w: number, h: number): number {
  if (!(w > 0) || !(h > 0)) return 1000;
  return Math.max(560, Math.min(1400, Math.round((1000 * h) / w)));
}
