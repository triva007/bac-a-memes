import type { MemeTemplate } from "../../types";
import { Box, IfField, T, Txt } from "@/components/meme/kit";
import { C } from "@/components/meme/palette";
import { Svg } from "../_lot-c-kit";

const CX = 500;
const CY = 536;
const R = 262;
const PARTS = [
  { id: "a", pct: 65, color: C.pink },
  { id: "b", pct: 27, color: C.yellow },
  { id: "c", pct: 8, color: C.green },
] as const;

const r1 = (n: number) => Math.round(n * 10) / 10;
/** point du cercle à l'angle `a` (degrés, 0 = en haut, sens horaire) */
const pt = (a: number, r: number): [number, number] => [r1(CX + r * Math.sin((a * Math.PI) / 180)), r1(CY - r * Math.cos((a * Math.PI) / 180))];
function slice(a0: number, a1: number): string {
  const [x0, y0] = pt(a0, R);
  const [x1, y1] = pt(a1, R);
  return `M${CX},${CY} L${x0},${y0} A${R},${R} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1},${y1} Z`;
}

const TITLE = { x: 50, y: 36, w: 900, h: 146, font: "display", upper: true, max: 78, min: 36, lh: 1.02, color: C.ink } as const;

function Render() {
  const a1 = (PARTS[0].pct / 100) * 360;
  const a2 = a1 + (PARTS[1].pct / 100) * 360;
  const [lax, lay] = pt(a1 / 2, R * 0.56);
  const [lbx, lby] = pt((a1 + a2) / 2, R * 0.6);
  const [lcx, lcy] = pt((a2 + 360) / 2, R * 1.2);
  return (
    <>
      <Box x={0} y={0} w={1000} h={1250} bg={C.paper} />
      <Box x={0} y={0} w={1000} h={1250} bg="linear-gradient(rgba(20,19,43,0.05) 2px, transparent 2px) 0 0 / 100% 50px, linear-gradient(90deg, rgba(20,19,43,0.05) 2px, transparent 2px) 0 0 / 50px 100%" />
      <Box x={0} y={0} w={1000} h={18} bg={C.violet} />

      <IfField id="titre">
        <T id="titre" {...TITLE} />
      </IfField>
      <IfField id="titre" not>
        <T text="Répartition de mon temps en cours" {...TITLE} />
      </IfField>

      <Svg w={1000} h={1250}>
        <circle cx={CX + 10} cy={CY + 16} r={R + 4} fill="rgba(20,19,43,0.22)" />
        <path d={slice(0, a1)} fill={PARTS[0].color} stroke={C.ink} strokeWidth={9} strokeLinejoin="round" />
        <path d={slice(a1, a2)} fill={PARTS[1].color} stroke={C.ink} strokeWidth={9} strokeLinejoin="round" />
        <path d={slice(a2, 360)} fill={PARTS[2].color} stroke={C.ink} strokeWidth={9} strokeLinejoin="round" />
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={C.ink} strokeWidth={9} />
      </Svg>
      <Txt x={lax - 130} y={lay - 58} w={260} size={104} font="meme" color="#fff" align="center" shadow={`0 6px 0 ${C.ink}, 0 0 0 ${C.ink}`} style={{ WebkitTextStroke: `5px ${C.ink}`, paintOrder: "stroke fill" }}>
        65 %
      </Txt>
      <Txt x={lbx - 110} y={lby - 44} w={220} size={76} font="meme" color={C.ink} align="center">
        27 %
      </Txt>
      <Txt x={lcx - 110} y={lcy - 36} w={220} size={58} font="meme" color={C.ink} align="center">
        8 %
      </Txt>

      {PARTS.map((p, i) => {
        const y = 836 + i * 120;
        return (
          <Box key={p.id} x={0} y={y} w={1000} h={110}>
            <Box x={50} y={0} w={160} h={108} radius={22} bg={p.color} border={`7px solid ${C.ink}`} shadow={`6px 7px 0 ${C.ink}`}>
              <Txt x={0} y={12} w={146} size={62} font="meme" color={C.ink} align="center">
                {p.pct} %
              </Txt>
            </Box>
            <T id={p.id} x={240} y={0} w={712} h={110} font="display" max={64} min={30} lh={1.04} align="left" color={C.ink} />
          </Box>
        );
      })}
      <Txt x={50} y={1200} w={900} size={24} font="sans" color={C.muted} align="center">
        Source : étude menée au fond de la classe, près du radiateur.
      </Txt>
    </>
  );
}

const template: MemeTemplate = {
  id: "camembert",
  name: "Le camembert",
  category: "cases",
  width: 1000,
  height: 1250,
  fields: [
    { id: "titre", label: "Titre du graphique", placeholder: "Répartition de mon temps en cours", maxLength: 48, optional: true },
    { id: "a", label: "La grosse part (65 %)", placeholder: "Regarder l'heure toutes les 2 min", maxLength: 40 },
    { id: "b", label: "La part moyenne (27 %)", placeholder: "Dessiner dans la marge", maxLength: 40 },
    { id: "c", label: "La mini-part (8 %)", placeholder: "Écouter (par accident)", maxLength: 40 },
  ],
  Render,
};

export default template;
