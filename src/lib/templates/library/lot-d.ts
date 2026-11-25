import type { MemeTemplate } from "../types";

import blaguePasComprise from "./reactions/blague-pas-comprise";
import bus7h12 from "./reactions/bus-7h12";
import conseilDeClasse from "./reactions/conseil-de-classe";
import contreCourant from "./reactions/contre-courant";
import convoqueCpe from "./reactions/convoque-cpe";
import copieBlanche from "./reactions/copie-blanche";
import dernierChoisi from "./reactions/dernier-choisi";
import dimanche23h from "./reactions/dimanche-23h";
import faceAFace from "./reactions/face-a-face";
import fondDeClasse from "./reactions/fond-de-classe";
import platDuJour from "./reactions/plat-du-jour";
import regardCamera from "./reactions/regard-camera";
import renduDesCopies from "./reactions/rendu-des-copies";
import seulAuTableau from "./reactions/seul-au-tableau";

/** Gabarits du lot D (scènes de réaction) — un import par gabarit, ajouté ici par l'agent du lot. */
export const LOT_D: MemeTemplate[] = [
  // --- gros plans
  regardCamera,
  faceAFace,
  // --- en classe
  seulAuTableau,
  fondDeClasse,
  renduDesCopies,
  copieBlanche,
  // --- dans le lycée
  contreCourant,
  platDuJour,
  convoqueCpe,
  dernierChoisi,
  blaguePasComprise,
  conseilDeClasse,
  // --- avant / après les cours
  bus7h12,
  dimanche23h,
];
