/**
 * Constantes partagées du kit de mèmes (SANS "use client" : utilisables partout,
 * y compris au niveau module dans les fichiers de gabarits).
 */

export type FontKey = "meme" | "display" | "sans" | "hand" | "hand2" | "type" | "news";

/** Piles de polices de la charte (écrites en dur : fiables aussi à l'export PNG). */
export const FONT: Record<FontKey, string> = {
  /** Anton — légendes de mèmes, titres choc */
  meme: '"Anton", Impact, "Arial Narrow Bold", sans-serif',
  /** Bricolage Grotesque — titres ronds et gras */
  display: '"Bricolage Grotesque Variable", "Arial Black", system-ui, sans-serif',
  /** Inter — interfaces, texte courant */
  sans: '"Inter Variable", system-ui, -apple-system, "Segoe UI", sans-serif',
  /** Caveat — écriture manuscrite rapide (stylo) */
  hand: '"Caveat Variable", "Patrick Hand", "Comic Sans MS", cursive',
  /** Patrick Hand — écriture d'élève appliquée, craie */
  hand2: '"Patrick Hand", "Caveat Variable", "Comic Sans MS", cursive',
  /** Special Elite — machine à écrire, tampons, administration */
  type: '"Special Elite", "Courier New", monospace',
  /** Playfair Display — presse, diplômes */
  news: '"Playfair Display", Georgia, "Times New Roman", serif',
};

/** Graisse par défaut de chaque police. */
export const FONT_WEIGHT: Record<FontKey, number> = {
  meme: 400,
  display: 800,
  sans: 600,
  hand: 600,
  hand2: 400,
  type: 400,
  news: 900,
};

/** Couleurs de la charte + encres/papiers utiles aux gabarits. */
export const C = {
  ink: "#14132b",
  ink2: "#1e1d40",
  ink3: "#2c2a5a",
  paper: "#fbf7ec",
  paper2: "#f1ead6",
  rule: "#b9d4f0",
  margin: "#f28b82",
  yellow: "#ffe94a",
  pink: "#ff5fa2",
  green: "#5df2a0",
  blue: "#5cc8ff",
  orange: "#ff9a3d",
  violet: "#7b5cff",
  redPen: "#e5383b",
  bluePen: "#2338a8",
  blackPen: "#22223a",
  greenPen: "#1f8a4c",
  chalk: "#f6f3e7",
  muted: "#8f8db3",
  white: "#ffffff",
  black: "#000000",
} as const;

/** Largeur du canevas virtuel (toujours 1000). */
export const CANVAS_W = 1000;
