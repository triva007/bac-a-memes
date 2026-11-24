/**
 * Cartes "situation" : des amorces pour inspirer les joueurs.
 * Jetons remplacés à la distribution : {prof} = un prof saisi par l'hôte,
 * {eleve} = le prénom d'un joueur (ou d'un nom ajouté par l'hôte).
 */
export interface Situation {
  id: string;
  text: string;
}

export const SITUATIONS: Situation[] = [
  { id: "s1", text: "Quand {prof} dit « sortez une feuille »" },
  { id: "s2", text: "{eleve} qui arrive avec 20 minutes de retard" },
  { id: "s3", text: "La classe quand le prof est absent" },
];

export interface SituationContext {
  profs: string[];
  eleves: string[];
}

/** Remplace {prof} / {eleve}. `rand` renvoie un nombre dans [0, 1). */
export function resolveSituation(text: string, ctx: SituationContext, rand: () => number): string {
  const pick = (list: string[], fallback: string) =>
    list.length ? list[Math.floor(rand() * list.length)] : fallback;
  return text
    .replaceAll("{prof}", pick(ctx.profs, "le prof"))
    .replaceAll("{eleve}", pick(ctx.eleves, "quelqu'un"));
}
