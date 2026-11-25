import type { MemeTemplate } from "../../types";
import { Box, Emo, StatusBar, T, Txt } from "@/components/meme/kit";
import { Chip, Glyph } from "../_lot-b-kit";

const INK = "#14132b";
const MUTED = "rgba(20,19,43,0.58)";
const LINE = "#7b5cff";
const RED = "#e5383b";

/** Fond de plan stylisé : pâtés de maisons, rivière, parc, trajet en pointillés. */
function Plan() {
  return (
    <svg aria-hidden width={1000} height={360} viewBox="0 0 1000 360" style={{ position: "absolute", left: 0, top: 0 }}>
      <rect width={1000} height={360} fill="#e6ebdf" />
      <path d="M-20 300C160 250 260 330 420 290S720 190 1020 250V380H-20z" fill="#a9d7f5" />
      <rect x={236} y={34} width={270} height={112} rx={12} fill="#bfe5b0" />
      <circle cx={290} cy={84} r={24} fill="#8fcf7c" />
      <circle cx={370} cy={100} r={30} fill="#8fcf7c" />
      <circle cx={452} cy={78} r={20} fill="#8fcf7c" />
      {[
        [40, 60, 150, 90],
        [560, 36, 180, 60],
        [60, 190, 120, 70],
        [330, 190, 160, 60],
        [800, 150, 150, 70],
      ].map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} rx={10} fill="#d3d8cb" />
      ))}
      <g fill="none" stroke="#fff" strokeLinecap="round">
        <path d="M-10 170H1010" strokeWidth={30} />
        <path d="M210 -10V370" strokeWidth={24} />
        <path d="M530 -10V230L770 370" strokeWidth={24} />
        <path d="M530 124H1010" strokeWidth={22} />
      </g>
      <path d="M130 250V170H530V124H800" fill="none" stroke="#fff" strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M130 250V170H530V124H800" fill="none" stroke={LINE} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 22" />
      {[
        [210, 170],
        [530, 170],
        [690, 124],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={15} fill="#fff" stroke={LINE} strokeWidth={8} />
      ))}
    </svg>
  );
}

function Stop({ y, time, id, sub }: { y: number; time: string; id: string; sub: string }) {
  return (
    <Box y={y} w={1000} h={186}>
      <Txt x={36} y={46} size={38} weight={700} color={MUTED}>
        {time}
      </Txt>
      <div style={{ position: "absolute", left: 176, top: 44, width: 44, height: 44, borderRadius: "50%", background: "#fff", border: `9px solid ${LINE}`, boxSizing: "border-box" }} />
      <T id={id} x={250} y={6} w={706} h={120} font="sans" weight={800} max={54} min={30} align="left" color={INK} lh={1.1} />
      <Txt x={250} y={134} size={29} weight={500} color={MUTED}>
        {sub}
      </Txt>
    </Box>
  );
}

function Render() {
  return (
    <>
      <Plan />
      <StatusBar time="07:25" color={INK} battery={0.64} />
      <Emo id="bed" x={72} y={212} size={110} />
      <Emo id="school" x={790} y={66} size={124} />

      <Box y={316} w={1000} h={964} bg="#fff" radius="46px 46px 0 0" shadow="0 -10px 30px rgba(20,19,43,0.22)">
        <Box x={445} y={16} w={110} h={10} radius={5} bg="rgba(20,19,43,0.18)" />
        <Txt x={40} y={44} size={66} font="display" color={INK}>
          Du lit au lycée
        </Txt>
        <Txt x={0} y={30} w={960} align="right" size={84} font="meme" color={LINE} lh={1}>
          47 min
        </Txt>
        <div style={{ position: "absolute", left: 40, top: 132, display: "flex", gap: 14 }}>
          <Chip inline bg="#ece8ff" color={LINE} size={30}>
            <Glyph name="walk" inline size={34} color={LINE} />3 arrêts
          </Chip>
          <Chip inline bg="#ecebf3" color={INK} size={30}>
            Arrivée 8 h 12
          </Chip>
          <Chip inline bg={RED} size={30}>
            Cours à 8 h 00
          </Chip>
        </div>

        {/* la ligne */}
        <Box x={192} y={250} w={12} h={640} radius={6} bg={LINE} />

        <Box y={212} w={1000} h={84}>
          <Txt x={36} y={20} size={38} weight={700} color={MUTED}>
            07:25
          </Txt>
          <div style={{ position: "absolute", left: 176, top: 18, width: 44, height: 44, borderRadius: "50%", background: LINE }} />
          <Txt x={250} y={14} size={44} weight={800} color={INK}>
            Mon lit
          </Txt>
          <Txt x={420} y={22} size={32} weight={500} color={MUTED}>
            (départ difficile)
          </Txt>
        </Box>

        <Stop y={296} time="07:41" id="e1" sub="Correspondance : 12 min" />
        <Stop y={482} time="07:53" id="e2" sub="Détour : obligatoire" />
        <Stop y={668} time="08:05" id="e3" sub="Attente : indéterminée" />

        <Box y={856} w={1000} h={96}>
          <Txt x={36} y={22} size={38} weight={800} color={RED}>
            08:12
          </Txt>
          <div style={{ position: "absolute", left: 172, top: 14, width: 52, height: 52, borderRadius: "50%", background: RED, border: "8px solid #fff", boxSizing: "border-box", boxShadow: `0 0 0 5px ${RED}` }} />
          <Txt x={250} y={16} size={42} weight={800} color={INK}>
            Salle 204 · « Vous avez un mot ? »
          </Txt>
        </Box>
      </Box>
    </>
  );
}

const template: MemeTemplate = {
  id: "itineraire-lycee",
  name: "L'itinéraire",
  category: "ecrans",
  width: 1000,
  height: 1280,
  fields: [
    { id: "e1", label: "1er arrêt", placeholder: "Arrêt Snooze : 3 rappels ignorés", maxLength: 55 },
    { id: "e2", label: "2e arrêt", placeholder: "Boulangerie : pain au chocolat stratégique", maxLength: 55 },
    { id: "e3", label: "3e arrêt", placeholder: "Portail fermé, mode PNJ activé", maxLength: 55 },
  ],
  Render,
};

export default template;
