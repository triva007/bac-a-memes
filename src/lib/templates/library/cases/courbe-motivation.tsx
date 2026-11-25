import type { MemeTemplate } from "../../types";
import { Box, Emo, IfField, T } from "@/components/meme/kit";
import { C } from "@/components/meme/palette";
import { HandArrow, Lbl, Svg } from "../_lot-c-kit";

const GRID =
  "linear-gradient(rgba(226,120,40,0.42) 2px, transparent 2px) 0 10px / 100% 100px, linear-gradient(90deg, rgba(226,120,40,0.42) 2px, transparent 2px) 10px 0 / 100px 100%, linear-gradient(rgba(226,120,40,0.2) 1px, transparent 1px) 0 10px / 100% 20px, linear-gradient(90deg, rgba(226,120,40,0.2) 1px, transparent 1px) 10px 0 / 20px 100%, #fffaf0";

const CURVE = "M112,420 C130,300 165,262 200,262 C262,262 292,628 402,684 C520,730 760,726 940,738";
const MONTHS: [string, number][] = [
  ["SEPT.", 150],
  ["NOV.", 340],
  ["JANV.", 530],
  ["MARS", 720],
  ["JUIN", 890],
];

const TITLE = { x: 40, y: 22, w: 920, h: 108, font: "display", upper: true, max: 66, min: 34, lh: 1.02, color: C.ink } as const;

function Render() {
  return (
    <>
      <Box x={0} y={0} w={1000} h={880} style={{ background: GRID }} />
      <IfField id="titre">
        <T id="titre" {...TITLE} />
      </IfField>
      <IfField id="titre" not>
        <T text="Ma motivation au fil de l'année" {...TITLE} />
      </IfField>

      <Svg w={1000} h={880}>
        {/* aire sous la courbe */}
        <path d={`${CURVE} L940,780 L112,780 Z`} fill="rgba(229,56,59,0.14)" />
        {/* axes */}
        <path d="M92,790 V168 M70,196 L92,160 L114,196" fill="none" stroke={C.ink} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M88,786 H966 M936,764 L972,786 L936,808" fill="none" stroke={C.ink} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
        {MONTHS.map(([, x]) => (
          <path key={x} d={`M${x},776 V798`} stroke={C.ink} strokeWidth={6} strokeLinecap="round" />
        ))}
        {/* la courbe */}
        <path d={CURVE} fill="none" stroke="#fff" strokeWidth={22} strokeLinecap="round" />
        <path d={CURVE} fill="none" stroke={C.redPen} strokeWidth={13} strokeLinecap="round" />
        <circle cx={200} cy={262} r={15} fill="#fff" stroke={C.redPen} strokeWidth={8} />
        <circle cx={700} cy={728} r={15} fill="#fff" stroke={C.redPen} strokeWidth={8} />
      </Svg>
      {MONTHS.map(([m, x]) => (
        <Lbl key={m} x={x - 70} y={808} w={140} size={30} color={C.ink} align="center">
          {m}
        </Lbl>
      ))}
      <div
        style={{
          position: "absolute",
          left: 8,
          top: 300,
          width: 60,
          height: 400,
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
          textAlign: "center",
          fontFamily: '"Inter Variable", system-ui, sans-serif',
          fontWeight: 800,
          fontSize: 30,
          letterSpacing: "0.12em",
          color: C.ink,
          whiteSpace: "nowrap",
        }}
      >
        MOTIVATION
      </div>

      <Emo id="star-struck" x={150} y={150} size={96} />
      <Emo id="skull" x={856} y={632} size={100} />

      {/* annotation 1 : le pic */}
      <T id="pic" x={340} y={148} w={420} h={190} font="hand" weight={700} color={C.bluePen} max={100} min={48} lh={0.98} align="left" />
      <HandArrow x1={330} y1={236} x2={232} y2={258} bend={-0.18} />
      {/* annotation 2 : la chute */}
      <T id="chute" x={470} y={396} w={490} h={200} font="hand" weight={700} color={C.bluePen} max={100} min={48} lh={0.98} />
      <HandArrow x1={712} y1={606} x2={702} y2={700} bend={0.14} />
    </>
  );
}

const template: MemeTemplate = {
  id: "courbe-motivation",
  name: "La courbe",
  category: "cases",
  width: 1000,
  height: 880,
  fields: [
    { id: "titre", label: "Titre de la courbe", placeholder: "Ma motivation au fil de l'année", maxLength: 44, optional: true },
    { id: "pic", label: "Le pic (tout en haut)", placeholder: "J'achète 12 surligneurs et un agenda", maxLength: 46 },
    { id: "chute", label: "La chute (tout en bas)", placeholder: "Premier DS de maths : t'es cuit", maxLength: 46 },
  ],
  Render,
};

export default template;
