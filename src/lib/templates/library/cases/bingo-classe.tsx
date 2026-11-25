import type { MemeTemplate } from "../../types";
import { Box, Halftone, T, Txt } from "@/components/meme/kit";
import { C } from "@/components/meme/palette";

/** 9 cases, ligne par ligne : un id de champ (case du joueur) ou un texte pré-rempli. */
const CELLS: ({ field: string } | { text: string; daub?: boolean })[] = [
  { field: "c1" },
  { text: "«\u00a0C'est noté\u00a0?\u00a0»", daub: true },
  { text: "Le projo refuse de s'allumer" },
  { text: "«\u00a0J'ai pas vu le message sur le groupe\u00a0»" },
  { field: "c2" },
  { text: "Trousse rangée 10 min avant la sonnerie", daub: true },
  { text: "«\u00a0On peut faire cours dehors\u00a0?\u00a0»" },
  { text: "Un téléphone sonne. Personne ne bouge." },
  { field: "c3" },
];

const CELL = 286;
const GAP = 14;

function Render() {
  return (
    <>
      <Box x={0} y={0} w={1000} h={1200} bg={`linear-gradient(170deg, ${C.violet}, #4a2fd0)`} />
      <Halftone w={1000} h={1200} color="rgba(255,255,255,0.1)" size={26} />
      <T text="BINGO DE LA CLASSE" x={40} y={22} w={920} h={132} font="meme" max={124} min={60} nowrap color={C.yellow} outline={C.ink} ls={0.02} />
      <Txt x={40} y={160} w={920} size={30} font="sans" color="#fff" align="center" weight={700}>
        3 cases alignées = tu cries BINGO (dans ta tête)
      </Txt>

      <Box x={40} y={226} w={920} h={920} radius={38} bg="#fff" border={`8px solid ${C.ink}`} shadow={`10px 12px 0 ${C.ink}`}>
        {CELLS.map((cell, i) => {
          const x = 9 + (i % 3) * (CELL + GAP);
          const y = 9 + Math.floor(i / 3) * (CELL + GAP);
          const mine = "field" in cell;
          return (
            <Box key={i} x={x} y={y} w={CELL} h={CELL} radius={24} bg={mine ? C.yellow : "#efeaff"} border={`6px solid ${C.ink}`}>
              {mine ? (
                <>
                  <Txt x={0} y={6} w={274} size={30} align="center" color="rgba(20,19,43,0.35)">
                    ★
                  </Txt>
                  <T id={cell.field} x={14} y={34} w={246} h={222} font="display" max={62} min={28} lh={1.04} color={C.ink} />
                </>
              ) : (
                <>
                  <T text={cell.text} x={16} y={16} w={242} h={242} font="display" weight={700} max={46} min={24} lh={1.1} color={C.ink3} />
                  {cell.daub ? <Box x={30} y={30} w={214} h={214} radius="50%" bg="rgba(255,95,162,0.2)" border="10px solid rgba(255,95,162,0.75)" style={{ mixBlendMode: "multiply" }} /> : null}
                </>
              )}
            </Box>
          );
        })}
      </Box>
    </>
  );
}

const template: MemeTemplate = {
  id: "bingo-classe",
  name: "Le bingo de la classe",
  category: "cases",
  width: 1000,
  height: 1200,
  fields: [
    { id: "c1", label: "Case en haut à gauche", placeholder: "Le prof dit «\u00a0sortez une feuille\u00a0»", maxLength: 44 },
    { id: "c2", label: "Case du milieu", placeholder: "Quelqu'un arrive en retard avec un croissant", maxLength: 44 },
    { id: "c3", label: "Case en bas à droite", placeholder: "Le délégué sort une masterclass d'excuse", maxLength: 44 },
  ],
  Render,
};

export default template;
