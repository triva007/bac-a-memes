import type { MemeTemplate } from "../../types";
import { Blackboard, Classroom, CopieDouble, Emo, RedCircle, SchoolDesk, T, Txt, Underline } from "@/components/meme/kit";
import { C } from "@/components/meme/palette";
import { Legende, Perso } from "../_lot-d-kit";

/** Le prof rend les copies : son grand sourire, la note, et la tête de l'élève. */
function Render() {
  return (
    <>
      <Classroom w={1000} h={1200} floorY={0.74} />
      <Blackboard x={430} y={150} w={640} h={330}>
        <Txt x={40} y={30} size={56} font="hand2" color={C.chalk} opacity={0.85}>
          Correction du contrôle
        </Txt>
        <Txt x={40} y={110} size={44} font="hand2" color={C.chalk} opacity={0.6}>
          Moyenne de la classe : 7,2
        </Txt>
      </Blackboard>

      {/* le prof */}
      <Perso id="beaming-face-with-smiling-eyes" x={30} y={196} size={400} corps="#3d5a8a" corpsH={1.5} corpsW={1.1} cravate="#e5383b" />

      {/* l'élève à sa table */}
      <Emo id="backpack" x={70} y={930} size={210} rotate={-8} shadow="ground" />
      <Perso id="face-holding-back-tears" x={540} y={730} size={390} corps="#ff9a3d" corpsH={0.7} />
      <SchoolDesk x={420} y={1056} w={640} />

      {/* la copie tendue */}
      <CopieDouble x={352} y={372} w={560} h={400} rotate={5} cell={44} margin={110}>
        <RedCircle x={300} y={14} w={236} h={124} />
        <T id="note" x={316} y={26} w={204} h={100} font="hand" color={C.redPen} max={96} min={36} nowrap />
        <Underline x={130} y={170} w={150} />
        <T id="appreciation" x={128} y={176} w={410} h={206} font="hand" color={C.redPen} max={70} min={34} align="left" valign="top" />
      </CopieDouble>
      <Emo id="pinching-hand" x={300} y={500} size={150} rotate={-30} flip />

      <Legende id="haut" y={12} h={150} max={80} />
    </>
  );
}

const template: MemeTemplate = {
  id: "rendu-des-copies",
  name: "Le prof rend les copies",
  category: "reactions",
  width: 1000,
  height: 1200,
  fields: [
    { id: "note", label: "La note", placeholder: "3/20", maxLength: 8, kind: "note" },
    { id: "appreciation", label: "Le commentaire du prof", placeholder: "Tu as cuisiné… mais c'est immangeable", maxLength: 60 },
    { id: "haut", label: "Légende du haut", placeholder: "« J'ai été généreux sur celle-là »", maxLength: 60, optional: true },
  ],
  Render,
};

export default template;
