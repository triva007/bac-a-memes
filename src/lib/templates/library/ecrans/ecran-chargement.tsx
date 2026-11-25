import type { MemeTemplate } from "../../types";
import { Box, Emo, Gauge, Halftone, T, Txt, Vignette } from "@/components/meme/kit";

function Render() {
  return (
    <>
      <Box w={1000} h={640} bg="radial-gradient(120% 90% at 30% 20%, #3b2a9e 0%, #1c1654 45%, #0b0920 100%)" />
      <Halftone w={1000} h={640} color="rgba(255,255,255,0.05)" size={26} />
      <Vignette w={1000} h={640} strength={0.5} />

      <Txt x={50} y={34} size={30} font="display" color="#ffe94a" ls={0.1}>
        NIVEAU 47 · LUNDI, 8 H 00
      </Txt>
      {/* roue de chargement */}
      <svg aria-hidden width={70} height={70} viewBox="0 0 70 70" style={{ position: "absolute", left: 884, top: 20 }}>
        <circle cx={35} cy={35} r={27} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={9} />
        <path d="M35 8a27 27 0 0 1 27 27" fill="none" stroke="#ffe94a" strokeWidth={9} strokeLinecap="round" />
      </svg>

      <Txt x={50} y={98} size={46} font="display" color="rgba(255,255,255,0.85)" ls={0.06}>
        CHARGEMENT DE…
      </Txt>
      <T id="quoi" x={50} y={150} w={900} h={150} font="meme" upper max={132} min={50} align="left" color="#ffe94a" shadow="0 6px 0 rgba(0,0,0,0.35)" />

      <Emo id="snail" x={44} y={270} size={86} />
      <Gauge x={50} y={350} w={724} h={60} value={0.04} color="#ff5fa2" stripes track="rgba(255,255,255,0.14)" border="4px solid rgba(255,255,255,0.85)" />
      <Txt x={780} y={322} w={176} align="right" size={100} font="meme" color="#fff" lh={1} style={{ whiteSpace: "nowrap" }}>
        3 %
      </Txt>

      {/* l'astuce du bas */}
      <Box x={50} y={444} w={900} h={170} radius={26} bg="rgba(255,255,255,0.1)" style={{ borderLeft: "12px solid #ffe94a" }}>
        <Emo id="light-bulb" x={14} y={42} size={84} />
        <Txt x={112} y={14} size={29} font="display" color="#ffe94a" ls={0.12}>
          ASTUCE
        </Txt>
        <T id="astuce" x={112} y={50} w={760} h={110} font="sans" weight={600} max={46} min={28} align="left" valign="top" color="#fff" lh={1.16} />
      </Box>
    </>
  );
}

const template: MemeTemplate = {
  id: "ecran-chargement",
  name: "L'écran de chargement",
  category: "ecrans",
  width: 1000,
  height: 640,
  fields: [
    { id: "quoi", label: "Chargement de…", placeholder: "la motivation", maxLength: 28 },
    { id: "astuce", label: "L'astuce du bas", placeholder: "Dormir en cours ne recharge pas la barre d'aura.", maxLength: 90 },
  ],
  Render,
};

export default template;
