/**
 * Fonctions pures des gabarits « image à légender » (pack perso, pack intégré).
 * SANS "use client" : appelées au niveau module par le registre, côté serveur aussi.
 *
 * Mise en page « mème classique » dans le canevas de 1000 px de large :
 *   bandeau blanc du haut (légende `haut`) / image entière / bandeau blanc du bas (légende `bas`),
 *   avec de fines marges blanches sur les côtés (effet cadre).
 */

export const CAPTION_FRAME = {
  /** hauteur du bandeau du haut */
  top: 200,
  /** hauteur du bandeau du bas */
  bottom: 150,
  /** marge blanche à gauche et à droite de l'image */
  side: 24,
  /** bornes de la hauteur totale du canevas */
  minHeight: 560,
  maxHeight: 1400,
} as const;

/**
 * Hauteur totale du canevas pour une image w × h : bandeaux + image à sa largeur
 * naturelle (1000 − 2 marges), bornée entre 560 et 1400. Si l'image est trop
 * haute (ou trop plate), c'est elle qui est réduite en `contain`, pas les bandeaux.
 */
export function persoCanvasHeight(w: number, h: number): number {
  const { top, bottom, side, minHeight, maxHeight } = CAPTION_FRAME;
  const imageH = w > 0 && h > 0 ? Math.round(((1000 - side * 2) * h) / w) : 1000 - side * 2;
  return Math.max(minHeight, Math.min(maxHeight, top + imageH + bottom));
}

/** Zone réservée à l'image dans un canevas de hauteur `height`. */
export function captionImageBox(height: number): { x: number; y: number; w: number; h: number } {
  const { top, bottom, side } = CAPTION_FRAME;
  return { x: side, y: top, w: 1000 - side * 2, h: Math.max(1, height - top - bottom) };
}
