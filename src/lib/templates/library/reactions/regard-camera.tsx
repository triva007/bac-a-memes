import type { MemeTemplate } from "../../types";
import { Box, Emo, Halftone, Vignette } from "@/components/meme/kit";
import { Dessin, Legende, Ombre } from "../_lot-d-kit";

/** Le regard caméra : un seul visage énorme, fond de studio neutre. « Moi quand… » */
function Render() {
  return (
    <>
      <Box w={1000} h={1000} bg="radial-gradient(80% 62% at 50% 46%, #8f9ad8 0%, #5b63b3 46%, #2c2a5a 100%)" />
      <Halftone w={1000} h={1000} color="rgba(255,255,255,0.1)" size={26} />
      {/* sol du studio */}
      <Box y={760} w={1000} h={240} bg="linear-gradient(180deg, rgba(20,19,43,0) 0%, rgba(20,19,43,0.5) 100%)" />
      <Ombre x={230} y={760} w={540} h={110} o={0.5} />
      <Emo id="neutral-face" x={180} y={172} size={640} />
      {/* cadre de mise au point */}
      <Dessin w={1000} h={1000}>
        {[
          "M170 262 V182 H250",
          "M750 182 H830 V262",
          "M830 722 V802 H750",
          "M250 802 H170 V722",
        ].map((d) => (
          <path key={d} d={d} fill="none" stroke="#ffe94a" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
        ))}
      </Dessin>
      <Vignette w={1000} h={1000} strength={0.5} />

      <Legende id="haut" y={18} h={160} max={92} />
      <Legende id="bas" y={822} h={162} max={92} valign="bottom" />
    </>
  );
}

const template: MemeTemplate = {
  id: "regard-camera",
  name: "Le regard caméra",
  category: "reactions",
  width: 1000,
  height: 1000,
  fields: [
    { id: "haut", label: "Légende du haut", placeholder: "Moi quand le prof dit « c'est facile »", maxLength: 70 },
    { id: "bas", label: "Légende du bas", placeholder: "Et que personne a compris", maxLength: 70, optional: true },
  ],
  Render,
};

export default template;
