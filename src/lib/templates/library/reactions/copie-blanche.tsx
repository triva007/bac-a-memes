import type { MemeTemplate } from "../../types";
import { CopieDouble, Emo, ExamHall, Paper, SchoolDesk, T } from "@/components/meme/kit";
import { C } from "@/components/meme/palette";
import { Legende, Perso } from "../_lot-d-kit";

/** La salle d'examen : la copie (presque) blanche, la panique, et le voisin qui en est à la page 4. */
function Render() {
  return (
    <>
      <ExamHall w={1000} h={1000} floorY={0.3} time="08:07" />

      {/* le voisin qui gratte */}
      <Perso id="nerd-face" x={670} y={286} size={250} corps="#4b9fc4" corpsH={0.62} />
      <SchoolDesk x={596} y={524} w={390} />
      {[0, 1, 2, 3].map((i) => (
        <Paper key={i} x={610 + i * 42} y={476 + (i % 2) * 10} w={120} h={150} rotate={-14 + i * 9} radius={4}>
          {[18, 40, 62, 84, 106].map((ly) => (
            <div key={ly} style={{ position: "absolute", left: 12, top: ly, width: 96 - ((ly + i * 20) % 34), height: 7, borderRadius: 4, background: "rgba(35,56,168,0.7)" }} />
          ))}
        </Paper>
      ))}
      <Emo id="writing-hand" x={822} y={452} size={156} />

      {/* celui qui sèche */}
      <Perso id="face-screaming-in-fear" x={76} y={196} size={384} corps="#ff9a3d" corpsH={0.62} />
      <SchoolDesk x={24} y={610} w={548} />
      <CopieDouble x={64} y={548} w={470} h={278} rotate={-3} cell={44} margin={96}>
        <T id="copie" x={110} y={18} w={340} h={242} font="hand" color={C.bluePen} max={72} min={34} align="left" valign="top" />
      </CopieDouble>
      <Emo id="pen" x={470} y={690} size={130} rotate={18} />

      <Legende id="bas" y={846} h={142} max={82} valign="bottom" />
    </>
  );
}

const template: MemeTemplate = {
  id: "copie-blanche",
  name: "La copie blanche",
  category: "reactions",
  width: 1000,
  height: 1000,
  fields: [
    { id: "copie", label: "Écrit sur la copie", placeholder: "Nom, prénom, classe… et c'est tout", maxLength: 60 },
    { id: "bas", label: "Légende du bas", placeholder: "Au bout de 2 h d'épreuve", maxLength: 60 },
  ],
  Render,
};

export default template;
