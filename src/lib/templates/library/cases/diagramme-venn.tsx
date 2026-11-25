import type { MemeTemplate } from "../../types";
import { Box, Halftone, T, Txt } from "@/components/meme/kit";
import { C } from "@/components/meme/palette";
import { Svg } from "../_lot-c-kit";

const R = 322;
const AX = 336;
const BX = 664;
const CY = 478;
/** demi-hauteur de la lentille (intersection) */
const LENS = Math.round(Math.sqrt(R * R - ((BX - AX) / 2) ** 2) * 10) / 10;

function Render() {
  const lens = `M500,${CY - LENS} A${R},${R} 0 0 1 500,${CY + LENS} A${R},${R} 0 0 1 500,${CY - LENS} Z`;
  return (
    <>
      <Box x={0} y={0} w={1000} h={890} bg={C.paper} />
      <Halftone w={1000} h={890} color="rgba(20,19,43,0.08)" size={24} />
      <T text="LE DIAGRAMME QUI EXPLIQUE TOUT" x={40} y={16} w={920} h={112} font="meme" max={84} min={44} nowrap color={C.ink} ls={0.02} />

      <Svg w={1000} h={890}>
        <circle cx={AX + 8} cy={CY + 12} r={R} fill="rgba(20,19,43,0.2)" />
        <circle cx={BX + 8} cy={CY + 12} r={R} fill="rgba(20,19,43,0.2)" />
        <circle cx={AX} cy={CY} r={R} fill={C.yellow} />
        <circle cx={BX} cy={CY} r={R} fill={C.blue} />
        <path d={lens} fill={C.green} />
        <circle cx={AX} cy={CY} r={R} fill="none" stroke={C.ink} strokeWidth={9} />
        <circle cx={BX} cy={CY} r={R} fill="none" stroke={C.ink} strokeWidth={9} />
      </Svg>

      <T id="a" x={56} y={318} w={278} h={320} font="display" max={66} min={28} lh={1.04} color={C.ink} />
      <T id="b" x={666} y={318} w={278} h={320} font="display" max={66} min={28} lh={1.04} color={C.ink} />
      <T id="milieu" x={380} y={330} w={240} h={296} font="meme" upper max={64} min={30} lh={1.08} color={C.ink} />

      <Txt x={40} y={826} w={920} size={28} font="sans" weight={700} color={C.ink3} align="center">
        Démontré en perm, sans calculatrice.
      </Txt>
    </>
  );
}

const template: MemeTemplate = {
  id: "diagramme-venn",
  name: "Le diagramme de Venn",
  category: "cases",
  width: 1000,
  height: 890,
  fields: [
    { id: "a", label: "Cercle de gauche", placeholder: "Mon chat à 15 h", maxLength: 36 },
    { id: "b", label: "Cercle de droite", placeholder: "Moi en cours de philo", maxLength: 36 },
    { id: "milieu", label: "Le point commun (au milieu)", placeholder: "Dormir les yeux ouverts", maxLength: 30 },
  ],
  Render,
};

export default template;
