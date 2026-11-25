import type { MemeTemplate } from "../../types";
import { Badge, Box, Emo, Halftone, Sunburst, T } from "@/components/meme/kit";
import { C } from "@/components/meme/palette";

const ROW_H = 300;

const LEVELS = [
  { id: "n1", emoji: "slightly-smiling-face", size: 170, bg: "linear-gradient(135deg, #cfeaff, #9fd3ff)", rays: ["#bfe2ff", "#a9d7ff"], paper: "#fbf7ec", badge: C.blue, rotate: 0 },
  { id: "n2", emoji: "face-with-raised-eyebrow", size: 192, bg: "linear-gradient(135deg, #fff3a6, #ffe14a)", rays: ["#ffe94a", "#ffdb2e"], paper: "#fbf7ec", badge: "#f2c200", rotate: -3 },
  { id: "n3", emoji: "anxious-face-with-sweat", size: 214, bg: "linear-gradient(135deg, #ffc089, #ff8a2e)", rays: ["#ffa24f", "#ff8a2e"], paper: "#fbf7ec", badge: C.orange, rotate: 4 },
  { id: "n4", emoji: "exploding-head", size: 262, bg: "linear-gradient(135deg, #ff6a6a, #d91e36)", rays: ["#ff4d5e", "#d91e36"], paper: "#fff1ee", badge: C.redPen, rotate: -6 },
] as const;

function Render() {
  return (
    <>
      <Box w={1000} h={1200} bg={C.ink} />
      {LEVELS.map((l, i) => {
        const y = i * ROW_H;
        return (
          <Box key={l.id} x={0} y={y} w={1000} h={ROW_H - 8} clip>
            <Box w={640} h={ROW_H - 8} bg={l.paper} />
            <Box x={640} w={360} h={ROW_H - 8} bg={l.bg} />
            <Sunburst x={640} w={360} h={ROW_H - 8} colors={[l.rays[0], l.rays[1]]} rays={8 + i * 4} opacity={0.35 + i * 0.2} />
            <Halftone x={640} w={360} h={ROW_H - 8} color="rgba(255,255,255,0.22)" size={26} />
            <Box x={632} w={10} h={ROW_H - 8} bg={C.ink} />
            <Emo id={l.emoji} x={820 - l.size / 2} y={(ROW_H - 8) / 2 - l.size / 2} size={l.size} rotate={l.rotate} />
            {i === 3 ? (
              <>
                <Emo id="collision" x={648} y={8} size={110} />
                <Emo id="fire" x={900} y={184} size={100} />
              </>
            ) : null}
            <Badge x={26} y={22} bg={l.badge} color={i === 1 ? C.ink : "#fff"} size={26}>
              {`Niveau ${i + 1}`}
            </Badge>
            <T id={l.id} x={28} y={74} w={580} h={ROW_H - 100} font="display" max={66} min={34} align="left" lh={1.06} />
          </Box>
        );
      })}
    </>
  );
}

const template: MemeTemplate = {
  id: "escalade",
  name: "Les 4 niveaux",
  category: "cases",
  width: 1000,
  height: 1192,
  fields: [
    { id: "n1", label: "Niveau 1 (tranquille)", placeholder: "Oublier sa trousse", maxLength: 50 },
    { id: "n2", label: "Niveau 2", placeholder: "Oublier son DM", maxLength: 50 },
    { id: "n3", label: "Niveau 3", placeholder: "Oublier qu'il y avait contrôle", maxLength: 50 },
    { id: "n4", label: "Niveau 4 (catastrophe)", placeholder: "Oublier qu'on est lundi", maxLength: 50 },
  ],
  Render,
};

export default template;
