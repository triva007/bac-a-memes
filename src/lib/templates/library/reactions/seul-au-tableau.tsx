import type { MemeTemplate } from "../../types";
import { Classroom, Emo, WallClock, Window } from "@/components/meme/kit";
import { Legende, Perso, Rangee, Voile } from "../_lot-d-kit";

/** L'exposé vu depuis le tableau : toute la classe fixe l'orateur. */
function Render() {
  return (
    <>
      <Classroom w={1000} h={1000} floorY={0.34} />
      <Window x={44} y={34} w={236} h={200} />
      <Window x={330} y={34} w={236} h={200} />
      <WallClock x={812} y={52} size={128} time="10:05" />

      {/* dernier rang */}
      <Perso id="neutral-face" x={22} y={206} size={112} corps="#5a7bd6" />
      <Perso id="yawning-face" x={176} y={200} size={112} corps="#e0a03c" />
      <Perso id="face-with-raised-eyebrow" x={330} y={206} size={112} corps="#3fa987" />
      <Perso id="unamused-face" x={548} y={202} size={112} corps="#d96a8f" />
      <Perso id="face-with-monocle" x={704} y={206} size={112} corps="#8b6fd9" />
      <Perso id="expressionless-face" x={860} y={200} size={112} corps="#4b9fc4" />
      <Rangee x={-10} y={322} w={1020} h={70} />

      {/* rang du milieu */}
      <Perso id="smirking-face" x={-8} y={300} size={160} corps="#e06b6b" />
      <Perso id="face-with-open-eyes-and-hand-over-mouth" x={190} y={306} size={160} corps="#4b9fc4" />
      <Perso id="grinning-squinting-face" x={420} y={296} size={160} corps="#f0a23c" />
      <Perso id="face-with-raised-eyebrow" x={650} y={306} size={160} corps="#6b7480" />
      <Perso id="thinking-face" x={846} y={300} size={160} corps="#3fa987" />
      <Rangee x={-10} y={470} w={1020} h={90} />
      <Emo id="mobile-phone" x={536} y={372} size={104} rotate={12} />

      {/* premier rang */}
      <Perso id="face-with-rolling-eyes" x={-34} y={452} size={220} corps="#8b6fd9" />
      <Perso id="sleeping-face" x={196} y={470} size={200} corps="#5a7bd6" rotate={-8} />
      <Perso id="face-with-hand-over-mouth" x={610} y={470} size={200} corps="#d96a8f" />
      <Perso id="nerd-face" x={812} y={452} size={220} corps="#e0a03c" />
      <Rangee x={-10} y={684} w={1020} h={128} />

      {/* l'orateur, seul face à tout le monde */}
      <Perso id="flushed-face" x={300} y={452} size={400} corps="#ff5fa2" corpsH={1} corpsW={1.12} />
      <Emo id="sweat-droplets" x={642} y={470} size={120} rotate={10} />
      <Emo id="page-facing-up" x={598} y={782} size={170} rotate={14} />

      <Legende id="haut" y={18} h={178} />
      <Voile id="bas" y={800} h={200} />
      <Legende id="bas" y={850} h={136} max={80} valign="bottom" />
    </>
  );
}

const template: MemeTemplate = {
  id: "seul-au-tableau",
  name: "Seul devant la classe",
  category: "reactions",
  width: 1000,
  height: 1000,
  fields: [
    { id: "haut", label: "Légende du haut", placeholder: "Moi qui commence l'exposé préparé dans le bus", maxLength: 80 },
    { id: "bas", label: "Légende du bas", placeholder: "« Euh… du coup… voilà »", maxLength: 60, optional: true },
  ],
  Render,
};

export default template;
