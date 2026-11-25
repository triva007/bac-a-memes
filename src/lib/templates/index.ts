import { PERSO_FIELDS, PERSO_PREFIX } from "@/lib/game/types";
import type { MemeTemplate, TemplateField } from "./types";

import interroSurprise from "./library/reactions/interro-surprise";

/**
 * Registre de tous les gabarits. Un fichier par gabarit dans `./library/<catégorie>/<id>.tsx`
 * (export par défaut = `MemeTemplate`). Voir README.md.
 * Les ids sont définitifs : ne JAMAIS renommer un id une fois livré.
 */
export const TEMPLATES: MemeTemplate[] = [
  // --- reactions
  interroSurprise,
];

const BY_ID = new Map(TEMPLATES.map((t) => [t.id, t]));

export function getTemplate(id: string): MemeTemplate | undefined {
  return BY_ID.get(id);
}

/** Champs du gabarit « pack perso » (image d'un joueur + légende haut / bas). */
export const PERSO_TEMPLATE_FIELDS: TemplateField[] = PERSO_FIELDS.map((f) => ({
  id: f.id,
  label: f.id === "haut" ? "Texte du haut" : "Texte du bas",
  placeholder: f.id === "haut" ? "TEXTE DU HAUT" : "TEXTE DU BAS",
  maxLength: f.maxLength,
  optional: true,
}));

/**
 * Champs à saisir pour n'importe quel `templateId` : gabarit du registre ou
 * gabarit perso ("perso:<imageId>"). Tableau vide si le gabarit est inconnu.
 * (Gabarit perso : les deux champs sont optionnels, mais il en faut au moins un.)
 */
export function getMemeFields(templateId: string): TemplateField[] {
  if (templateId.startsWith(PERSO_PREFIX)) return PERSO_TEMPLATE_FIELDS;
  return getTemplate(templateId)?.fields ?? [];
}
