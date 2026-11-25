import { PERSO_FIELDS, PERSO_PREFIX } from "@/lib/game/types";
import type { MemeTemplate, TemplateField } from "./types";
import { LOT_B } from "./library/lot-b";
import { LOT_C } from "./library/lot-c";
import { LOT_D } from "./library/lot-d";

import interroSurprise from "./library/reactions/interro-surprise";
import revisions2h from "./library/reactions/revisions-2h";
import missionEchouee from "./library/reactions/mission-echouee";
import bulletin from "./library/ecole/bulletin";
import copieNotee from "./library/ecole/copie-notee";
import motCarnet from "./library/ecole/mot-carnet";
import lignesTableau from "./library/ecole/lignes-tableau";
import groupeClasse from "./library/ecrans/groupe-classe";
import notif23h58 from "./library/ecrans/notif-23h58";
import povVideo from "./library/ecrans/pov-video";
import alerteInfo from "./library/ecrans/alerte-info";
import attentesRealite from "./library/cases/attentes-realite";
import escalade from "./library/cases/escalade";
import compteurAura from "./library/cases/compteur-aura";
import tierList from "./library/cases/tier-list";
import uneJournal from "./library/affiches/une-journal";
import avisDeRecherche from "./library/affiches/avis-de-recherche";
import fichePnj from "./library/affiches/fiche-pnj";

/**
 * Registre de tous les gabarits. Un fichier par gabarit dans `./library/<catégorie>/<id>.tsx`
 * (export par défaut = `MemeTemplate`). Voir README.md.
 * Les ids sont définitifs : ne JAMAIS renommer un id une fois livré.
 */
export const TEMPLATES: MemeTemplate[] = [
  // --- reactions
  interroSurprise,
  revisions2h,
  missionEchouee,
  // --- ecole
  bulletin,
  copieNotee,
  motCarnet,
  lignesTableau,
  // --- ecrans
  groupeClasse,
  notif23h58,
  povVideo,
  alerteInfo,
  // --- cases
  attentesRealite,
  escalade,
  compteurAura,
  tierList,
  // --- affiches
  uneJournal,
  avisDeRecherche,
  fichePnj,
  // --- lots ajoutés par d'autres agents (ne pas retirer)
  ...LOT_B,
  ...LOT_C,
  ...LOT_D,
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
