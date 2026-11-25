import type { MemeTemplate } from "../types";

import carteLyceen from "./ecole/carte-lyceen";
import motExcuse from "./ecole/mot-excuse";
import panneauAffichage from "./ecole/panneau-affichage";
import reglementInterieur from "./ecole/reglement-interieur";

import bingoClasse from "./cases/bingo-classe";
import camembert from "./cases/camembert";
import courbeMotivation from "./cases/courbe-motivation";
import diagrammeVenn from "./cases/diagramme-venn";
import friseJournee from "./cases/frise-journee";

import etiquetteComposition from "./affiches/etiquette-composition";
import panneauDanger from "./affiches/panneau-danger";
import ticketDeCaisse from "./affiches/ticket-de-caisse";

/** Gabarits du lot C — papiers du lycée, affiches et formats à cases. */
export const LOT_C: MemeTemplate[] = [
  // --- ecole
  motExcuse,
  carteLyceen,
  reglementInterieur,
  panneauAffichage,
  // --- cases
  camembert,
  courbeMotivation,
  bingoClasse,
  friseJournee,
  diagrammeVenn,
  // --- affiches
  panneauDanger,
  ticketDeCaisse,
  etiquetteComposition,
];
