import type { MemeTemplate } from "../types";

import meteoSemaine from "./cases/meteo-semaine";
import mailEnt from "./ecole/mail-ent";
import voeuxOrientation from "./ecole/voeux-orientation";
import alarmesReveil from "./ecrans/alarmes-reveil";
import appelsManques from "./ecrans/appels-manques";
import avisUneEtoile from "./ecrans/avis-une-etoile";
import commentairesVideo from "./ecrans/commentaires-video";
import ecranChargement from "./ecrans/ecran-chargement";
import itineraireLycee from "./ecrans/itineraire-lycee";
import playlistJournee from "./ecrans/playlist-journee";
import profilReseau from "./ecrans/profil-reseau";
import succesDeverrouille from "./ecrans/succes-deverrouille";

/** Gabarits du lot B (« écrans et culture internet ») — un import par gabarit. */
export const LOT_B: MemeTemplate[] = [
  // --- ecrans
  commentairesVideo,
  avisUneEtoile,
  succesDeverrouille,
  alarmesReveil,
  playlistJournee,
  appelsManques,
  ecranChargement,
  profilReseau,
  itineraireLycee,
  // --- ecole
  voeuxOrientation,
  mailEnt,
  // --- cases
  meteoSemaine,
];
