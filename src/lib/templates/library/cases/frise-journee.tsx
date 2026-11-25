import type { MemeTemplate } from "../../types";
import { Box, Emo, Gauge, T, Txt } from "@/components/meme/kit";
import { C } from "@/components/meme/palette";

const ROWS = [
  { id: "h8", hour: "8 h", emoji: "smiling-face-with-sunglasses", bg: "linear-gradient(90deg, #fff1a3, #ffe46b)", ink: C.ink, level: 1, bar: C.greenPen },
  { id: "h10", hour: "10 h", emoji: "face-with-diagonal-mouth", bg: "linear-gradient(90deg, #ffd9a8, #ffbd73)", ink: C.ink, level: 0.6, bar: "#e0a800" },
  { id: "h12", hour: "12 h", emoji: "melting-face", bg: "linear-gradient(90deg, #ffb9c9, #ff8fae)", ink: C.ink, level: 0.28, bar: C.orange },
  { id: "h16", hour: "16 h", emoji: "skull", bg: `linear-gradient(90deg, ${C.ink3}, ${C.ink})`, ink: "#fff", level: 0.05, bar: C.redPen },
] as const;

const TOP = 150;
const ROW_H = 292;

function Render() {
  return (
    <>
      <Box x={0} y={0} w={1000} h={TOP} bg={C.ink} />
      <T text="MA JOURNÉE AU LYCÉE" x={40} y={14} w={920} h={122} font="meme" max={104} min={50} nowrap color={C.yellow} ls={0.02} />
      {ROWS.map((r, i) => {
        const y = TOP + i * ROW_H;
        return (
          <Box key={r.id} x={0} y={y} w={1000} h={ROW_H} bg={r.bg} style={{ borderTop: `8px solid ${C.ink}` }}>
            {/* fil de la frise */}
            <Box x={124} y={0} w={12} h={ROW_H} bg={i === 3 ? "rgba(255,255,255,0.35)" : "rgba(20,19,43,0.3)"} />
            <Box x={36} y={64} w={188} h={104} radius={52} bg={i === 3 ? C.yellow : C.ink} border={`6px solid ${i === 3 ? "#fff" : C.ink}`}>
              <Txt x={0} y={8} w={176} size={68} font="meme" color={i === 3 ? C.ink : "#fff"} align="center">
                {r.hour}
              </Txt>
            </Box>
            {/* batterie sociale */}
            <Gauge x={42} y={190} w={160} h={40} value={r.level} color={r.bar} radius={10} border={`5px solid ${i === 3 ? "#fff" : C.ink}`} track={i === 3 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.7)"} />
            <Box x={202} y={200} w={12} h={20} radius="0 6px 6px 0" bg={i === 3 ? "#fff" : C.ink} />
            <Emo id={r.emoji} x={252} y={30} size={226} />
            <T id={r.id} x={510} y={26} w={456} h={232} font="display" max={74} min={32} lh={1.04} align="left" color={r.ink} />
          </Box>
        );
      })}
    </>
  );
}

const template: MemeTemplate = {
  id: "frise-journee",
  name: "La frise de la journée",
  category: "cases",
  width: 1000,
  height: TOP + 4 * ROW_H,
  fields: [
    { id: "h8", label: "8 h (frais)", placeholder: "Aujourd'hui je suis sérieux", maxLength: 42 },
    { id: "h10", label: "10 h (ça se gâte)", placeholder: "2 h de physique. L'aura fond.", maxLength: 42 },
    { id: "h12", label: "12 h (critique)", placeholder: "40 min de queue à la cantine", maxLength: 42 },
    { id: "h16", label: "16 h (fin de vie)", placeholder: "PNJ complet. Je rentre dormir.", maxLength: 42 },
  ],
  Render,
};

export default template;
