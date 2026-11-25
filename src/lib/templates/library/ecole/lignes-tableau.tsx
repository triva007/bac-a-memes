import type { MemeTemplate } from "../../types";
import { Blackboard, Box, Emo, T, Txt } from "@/components/meme/kit";
import { C } from "@/components/meme/palette";

const LINES = [
  { y: 14, opacity: 1, rotate: 0 },
  { y: 126, opacity: 0.96, rotate: 0.3 },
  { y: 238, opacity: 0.9, rotate: -0.4 },
  { y: 350, opacity: 0.8, rotate: 0.5 },
  { y: 462, opacity: 0.58, rotate: -1.4 },
];

function Render() {
  return (
    <>
      <Box w={1000} h={800} bg="linear-gradient(180deg, #fbf1dc, #f1e0be)" />
      <Blackboard x={24} y={24} w={952} h={672} color="black">
        {LINES.map((l, i) => (
          <Box key={i} x={26} y={l.y} w={i === 4 ? 470 : 864} h={106} clip>
            <T id="phrase" w={864} h={106} font="hand2" color={C.chalk} max={74} min={30} align="left" nowrap rotate={l.rotate} shadow="0 0 8px rgba(255,255,255,0.22)" style={{ opacity: l.opacity }} />
          </Box>
        ))}
        <Txt x={30} y={572} size={40} font="hand2" color="#ffd84a" rotate={-2} opacity={0.9}>
          … encore 95 fois
        </Txt>
      </Blackboard>
      <Emo id="writing-hand" x={640} y={520} size={150} rotate={-12} />
      <Emo id="weary-face" x={742} y={500} size={250} />
    </>
  );
}

const template: MemeTemplate = {
  id: "lignes-tableau",
  name: "Les lignes au tableau",
  category: "ecole",
  width: 1000,
  height: 800,
  fields: [{ id: "phrase", label: "La phrase à copier 100 fois", placeholder: "Je ne dois pas dire « présent » pour mon voisin", maxLength: 48 }],
  Render,
};

export default template;
