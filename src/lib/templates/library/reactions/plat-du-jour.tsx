import type { MemeTemplate } from "../../types";
import { Box, Canteen, Emo, Paper, T, Txt } from "@/components/meme/kit";
import { Dessin, Legende, Ombre } from "../_lot-d-kit";

/** La file du self : gros plan sur le plateau, et la tête de celui qui découvre LE plat. */
function Render() {
  return (
    <>
      <Canteen w={1000} h={900} floorY={1} />
      {/* la file derrière */}
      <Emo id="weary-face" x={-46} y={196} size={210} opacity={0.96} />
      <Emo id="face-with-hand-over-mouth" x={836} y={206} size={210} />
      <Emo id="nauseated-face" x={316} y={96} size={368} />

      {/* rampe inox */}
      <Box y={500} w={1000} h={700} bg="repeating-linear-gradient(180deg, rgba(255,255,255,0.5) 0 6px, rgba(255,255,255,0) 6px 58px, rgba(20,19,43,0.22) 58px 64px), linear-gradient(180deg, #cfd5dc 0%, #a7afba 100%)" shadow="inset 0 22px 26px rgba(20,19,43,0.3)" />

      {/* plateau */}
      <Box x={36} y={548} w={928} h={474} radius={64} bg="linear-gradient(170deg, #f2a65a 0%, #e0863a 100%)" shadow="0 16px 0 rgba(90,45,10,0.45), 0 30px 34px rgba(20,19,43,0.4), inset 0 0 0 16px rgba(255,255,255,0.22), inset 0 0 0 20px rgba(120,60,10,0.2)" />
      {/* assiette */}
      <Box x={82} y={580} w={410} h={410} radius="50%" bg="radial-gradient(circle at 40% 34%, #ffffff 0%, #f1f0ea 60%, #dcdad0 100%)" shadow="0 10px 0 rgba(90,45,10,0.3), inset 0 0 0 30px rgba(255,255,255,0.9), inset 0 0 0 34px rgba(20,19,43,0.1)" />
      <Emo id="curry-rice" x={128} y={622} size={320} filter="hue-rotate(58deg) saturate(0.75) brightness(0.92)" />
      {/* fumet douteux */}
      <Dessin x={150} y={540} w={300} h={140}>
        {[40, 130, 220].map((sx, i) => (
          <path key={sx} d={`M${sx} 130 q-26 -30 0 -58 q26 -28 0 -58`} fill="none" stroke={i === 1 ? "rgba(140,190,80,0.85)" : "rgba(255,255,255,0.75)"} strokeWidth={12} strokeLinecap="round" />
        ))}
      </Dessin>
      <Emo id="fly" x={432} y={560} size={104} rotate={24} />

      {/* le chevalet du plat du jour */}
      <Ombre x={560} y={786} w={390} h={50} />
      <Paper x={566} y={578} w={366} h={226} rotate={2} radius={10}>
        <Box w={366} h={58} radius="10px 10px 0 0" bg="#14132b" />
        <Txt x={0} y={9} w={366} align="center" size={36} font="display" color="#ffe94a" ls={0.08}>
          PLAT DU JOUR
        </Txt>
        <T id="plat" x={18} y={66} w={330} h={150} font="hand2" color="#14132b" max={78} min={32} lh={1.04} />
      </Paper>
      <Emo id="baguette-bread" x={560} y={828} size={170} rotate={-8} />
      <Emo id="green-apple" x={770} y={842} size={140} />

      <Legende id="bas" y={1034} h={152} max={84} valign="bottom" />
    </>
  );
}

const template: MemeTemplate = {
  id: "plat-du-jour",
  name: "Le plat du self",
  category: "reactions",
  width: 1000,
  height: 1200,
  fields: [
    { id: "plat", label: "Le plat du jour", placeholder: "Poisson pané du lundi (on est jeudi)", maxLength: 50 },
    { id: "bas", label: "Légende du bas", placeholder: "Le chef a pas cuisiné, là", maxLength: 60 },
  ],
  Render,
};

export default template;
