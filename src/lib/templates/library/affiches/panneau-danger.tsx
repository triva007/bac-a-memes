import type { MemeTemplate } from "../../types";
import { Box, Emo, IfField, T, Yard } from "@/components/meme/kit";
import { C } from "@/components/meme/palette";
import { Svg } from "../_lot-c-kit";

const TRI = "500,112 212,612 788,612";

function Bolt({ x, y }: { x: number; y: number }) {
  return <Box x={x} y={y} w={20} h={20} radius="50%" bg="radial-gradient(circle at 35% 30%, #f4f4f8, #8d90a0)" border="2px solid rgba(20,19,43,0.5)" />;
}

function Render() {
  return (
    <>
      <Yard w={1000} h={1180} floorY={0.84} />
      <Box x={0} y={0} w={1000} h={1180} bg="linear-gradient(180deg, rgba(255,255,255,0.25), rgba(255,255,255,0) 40%)" />
      {/* poteau */}
      <Box x={476} y={560} w={48} h={620} bg="linear-gradient(90deg, #7f8494, #d9dce6 45%, #8f94a4)" shadow="10px 0 14px rgba(20,15,30,0.25)" />
      <Emo id="face-screaming-in-fear" x={792} y={990} size={170} shadow="ground" />

      {/* triangle de danger */}
      <Svg w={1000} h={700}>
        <polygon points={TRI} transform="translate(10 14)" fill="rgba(20,15,30,0.3)" stroke="rgba(20,15,30,0.3)" strokeWidth={104} strokeLinejoin="round" />
        <polygon points={TRI} fill="#fff" stroke="#fff" strokeWidth={104} strokeLinejoin="round" />
        <polygon points={TRI} fill="#fff" stroke="#d8232a" strokeWidth={80} strokeLinejoin="round" />
        <polygon points={TRI} fill="#fff" stroke="#fff" strokeWidth={6} strokeLinejoin="round" />
        {/* point d'exclamation */}
        <path d="M468,250 Q500,232 532,250 L518,468 Q500,480 482,468 Z" fill={C.ink} />
        <circle cx={500} cy={538} r={34} fill={C.ink} />
        <path d="M250,560 L500,128" stroke="rgba(255,255,255,0.0)" />
      </Svg>

      {/* panonceau principal */}
      <Box x={96} y={708} w={808} h={258} radius={26} bg="#fff" border={`10px solid ${C.ink}`} shadow="10px 14px 0 rgba(20,15,30,0.3)">
        <T id="danger" x={30} y={14} w={728} h={210} font="display" upper max={98} min={38} lh={1.02} color={C.ink} />
        <Bolt x={384} y={2} />
        <Bolt x={384} y={216} />
      </Box>
      {/* panonceau de précision */}
      <IfField id="precision">
        <Box x={226} y={990} w={548} h={130} radius={20} bg="#fff" border={`9px solid ${C.ink}`} shadow="8px 12px 0 rgba(20,15,30,0.3)">
          <T id="precision" x={22} y={10} w={486} h={92} font="display" upper max={60} min={28} lh={1.02} color={C.ink} />
        </Box>
      </IfField>
    </>
  );
}

const template: MemeTemplate = {
  id: "panneau-danger",
  name: "Le panneau de danger",
  category: "affiches",
  width: 1000,
  height: 1180,
  fields: [
    { id: "danger", label: "Attention à…", placeholder: "Prof de maths de mauvaise humeur", maxLength: 56 },
    { id: "precision", label: "Petit panneau du dessous", placeholder: "Sur toute la semaine", maxLength: 30, optional: true },
  ],
  Render,
};

export default template;
