"use client";

/**
 * KIT DE MÈMES — boîte à outils des gabarits (point d'entrée unique).
 * ------------------------------------------------------------------
 * Les fichiers de gabarits (src/lib/templates/library/**) n'ont ni
 * "use client" ni hooks : tout ce qui est dynamique vit dans le kit.
 *
 *   import { T, Emo, Box, Txt, Classroom, Blackboard, … } from "@/components/meme/kit";
 *
 *  - kit-core     <T> texte de champ auto-ajusté, <Emo> emoji 3D, <Box>, <Txt>, <IfField>
 *  - kit-decors   scènes (classe, couloir, cantine, cour, gymnase, chambre la nuit,
 *                 bus, bureau du CPE, salle d'examen) et mobilier
 *  - kit-formats  papiers (Seyès, copie double), bulles, post-it, tampon, stylo rouge…
 *  - kit-ui       faux écrans : messagerie, notification, vidéo verticale, commentaires,
 *                 jauges, badges, bandeau d'info, tier list…
 *
 * Toutes les coordonnées sont en px du canevas virtuel (1000 de large).
 * Tout conteneur du kit (Box, Paper, Blackboard, Phone…) ouvre un repère
 * local : ses enfants se positionnent par rapport à son coin haut-gauche.
 *
 * ATTENTION : ce module est un module client. Dans un fichier de gabarit,
 * n'utiliser ses exports QUE dans le JSX de `Render` (jamais au niveau module).
 * Les constantes C / FONT s'importent depuis "@/components/meme/palette".
 *
 * Doc et exemple complet : src/lib/templates/README.md
 */

export {
  MemeProvider,
  useMeme,
  useField,
  IfField,
  T,
  Emo,
  Box,
  Txt,
  emojiSrc,
  type MemeContextValue,
  type FieldState,
  type TProps,
  type EmoProps,
  type BoxProps,
  type TxtProps,
} from "./kit-core";

export {
  Room,
  Classroom,
  Corridor,
  Canteen,
  Yard,
  Gym,
  BedroomNight,
  Bus,
  CpeOffice,
  ExamHall,
  Blackboard,
  SchoolDesk,
  WallClock,
  Window,
  Lockers,
  WoodTable,
} from "./kit-decors";

export {
  Paper,
  Seyes,
  CopieDouble,
  Bubble,
  PostIt,
  Tape,
  Pin,
  Stamp,
  RedCircle,
  Underline,
  Sunburst,
  Halftone,
  Vignette,
  Ribbon,
  Confetti,
} from "./kit-formats";

export {
  Icon,
  StatusBar,
  Phone,
  ChatHeader,
  ChatColumn,
  ChatBubble,
  ChatNote,
  ChatInput,
  Notif,
  Badge,
  Gauge,
  StatBar,
  Avatar,
  VideoUI,
  Comment,
  NewsBanner,
  TierRow,
  LiveBadge,
  type IconName,
  type IconProps,
  type ChatTheme,
} from "./kit-ui";
