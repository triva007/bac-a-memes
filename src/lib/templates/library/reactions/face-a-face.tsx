import type { MemeTemplate } from "../../types";
import { Box, Emo, Halftone, Vignette } from "@/components/meme/kit";
import { Dessin, Legende } from "../_lot-d-kit";

/** Deux visages en très gros plan, chacun sa moitié d'écran : « Lui / Moi », sans texte imposé. */
function Render() {
  return (
    <>
      <Box w={1000} h={700} bg="linear-gradient(160deg, #37b6ff 0%, #2456d6 100%)" />
      <Box w={1000} h={700} bg="linear-gradient(200deg, #ffb13d 0%, #ff4f8b 100%)" style={{ clipPath: "polygon(56% 0, 100% 0, 100% 100%, 44% 100%)" }} />
      <Halftone w={1000} h={700} color="rgba(255,255,255,0.16)" size={24} />
      {/* éclair de séparation */}
      <Dessin w={1000} h={700}>
        <polygon points="546,-10 574,-10 512,300 548,318 454,710 426,710 482,392 446,374" fill="#14132b" opacity={0.35} transform="translate(10 8)" />
        <polygon points="546,-10 574,-10 512,300 548,318 454,710 426,710 482,392 446,374" fill="#fdfcf7" stroke="#14132b" strokeWidth={7} strokeLinejoin="round" />
      </Dessin>

      <Emo id="smiling-face-with-sunglasses" x={22} y={36} size={452} rotate={-6} />
      <Emo id="clown-face" x={528} y={36} size={452} rotate={6} />
      <Vignette w={1000} h={700} strength={0.42} />

      <Legende id="gauche" x={16} y={500} w={404} h={186} max={78} min={38} valign="bottom" />
      <Legende id="droite" x={486} y={500} w={498} h={186} max={78} min={38} valign="bottom" />
    </>
  );
}

const template: MemeTemplate = {
  id: "face-a-face",
  name: "Le face-à-face",
  category: "reactions",
  width: 1000,
  height: 700,
  fields: [
    { id: "gauche", label: "Sous le visage de gauche", placeholder: "Lui : a tout révisé", maxLength: 45 },
    { id: "droite", label: "Sous le visage de droite", placeholder: "Moi : « ça va le faire »", maxLength: 45 },
  ],
  Render,
};

export default template;
