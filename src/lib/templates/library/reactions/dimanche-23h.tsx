import type { MemeTemplate } from "../../types";
import { BedroomNight, Box, Emo, Seyes, T, Tape, Txt, Underline } from "@/components/meme/kit";
import { C } from "@/components/meme/palette";
import { Dessin, Legende } from "../_lot-d-kit";

/** Dimanche soir : la liste des devoirs au mur, et lui sous la couette. */
function Render() {
  return (
    <>
      <BedroomNight w={1000} h={700} floorY={0.8} clock="23:07" />
      <Box y={690} w={1000} h={560} bg="linear-gradient(180deg, #2a1d40 0%, #1a1533 100%)" />
      <Emo id="backpack" x={520} y={380} size={200} rotate={6} filter="brightness(0.82)" />

      {/* la liste scotchée au mur */}
      <Seyes x={300} y={92} w={400} h={330} rotate={-2} cell={40} margin={56} style={{ filter: "brightness(0.93)" }}>
        <Txt x={74} y={18} size={52} font="hand" color={C.redPen}>
          Pour demain :
        </Txt>
        <Underline x={72} y={74} w={250} />
        <T id="devoirs" x={72} y={92} w={312} h={226} font="hand" color={C.bluePen} max={62} min={32} align="left" valign="top" />
      </Seyes>
      <Tape x={420} y={68} w={160} h={46} rotate={-4} />

      {/* le lit au premier plan */}
      <Box x={-40} y={650} w={1080} h={90} radius={30} bg="linear-gradient(180deg, #54407c, #3b2a5e)" shadow="0 10px 0 rgba(0,0,0,0.3)" />
      <Box x={40} y={700} w={520} h={300} radius={110} rotate={-5} bg="linear-gradient(170deg, #e9ebff 0%, #b9bdf0 100%)" shadow="0 14px 0 rgba(10,8,30,0.35), inset 0 -24px 30px rgba(60,60,140,0.25)" />
      {/* lueur du téléphone */}
      <Box x={150} y={640} w={620} h={520} radius="50%" bg="radial-gradient(closest-side, rgba(150,210,255,0.38), rgba(150,210,255,0))" />
      <Emo id="face-with-peeking-eye" x={130} y={668} size={350} rotate={-10} />
      {/* la couette */}
      <Dessin y={880} w={1000} h={370}>
        <path d="M-20 140 C60 40 180 70 300 96 C420 122 470 30 620 22 C780 14 900 60 1020 30 V380 H-20 Z" fill="#14132b" opacity={0.3} transform="translate(0 -12)" />
        <path d="M-20 140 C60 40 180 70 300 96 C420 122 470 30 620 22 C780 14 900 60 1020 30 V380 H-20 Z" fill="#6a56c8" />
        <path d="M-20 140 C60 40 180 70 300 96 C420 122 470 30 620 22 C780 14 900 60 1020 30 V86 C900 112 780 68 620 76 C470 84 420 174 300 150 C180 126 60 96 -20 196 Z" fill="#8f7be6" />
        {[
          [120, 250],
          [330, 300],
          [560, 210],
          [770, 280],
          [920, 180],
          [450, 180],
          [690, 340],
          [220, 340],
        ].map(([sx, sy], i) => (
          <circle key={i} cx={sx} cy={sy} r={i % 2 ? 9 : 13} fill={i % 3 === 0 ? "#ffe94a" : "#b9aef5"} opacity={0.7} />
        ))}
      </Dessin>
      <Emo id="mobile-phone" x={500} y={742} size={190} rotate={16} shadow="glow" />

      <Legende id="bas" y={1084} h={152} max={84} valign="bottom" />
    </>
  );
}

const template: MemeTemplate = {
  id: "dimanche-23h",
  name: "Dimanche, 23 h",
  category: "reactions",
  width: 1000,
  height: 1250,
  fields: [
    { id: "devoirs", label: "La liste des devoirs", placeholder: "DM de maths, dissert de philo, exposé d'anglais", maxLength: 70, multiline: true },
    { id: "bas", label: "Légende du bas", placeholder: "« Encore une vidéo et je m'y mets »", maxLength: 60 },
  ],
  Render,
};

export default template;
