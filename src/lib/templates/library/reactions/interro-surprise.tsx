import type { MemeTemplate } from "../../types";
import { Blackboard, Classroom, Emo, SchoolDesk, T, WallClock } from "@/components/meme/kit";

function Render() {
  return (
    <>
      <Classroom w={1000} h={1000} floorY={0.68} />
      <Blackboard x={50} y={46} w={760} h={420}>
        <T id="tableau" x={26} y={20} w={672} h={344} font="hand2" color="#f6f3e7" max={104} min={44} lh={1.08} shadow="0 0 10px rgba(255,255,255,0.25)" />
      </Blackboard>
      <WallClock x={846} y={56} size={118} time="08:02" />
      <Emo id="smirking-face" x={742} y={250} size={236} />
      <Emo id="anxious-face-with-sweat" x={610} y={520} size={220} />
      <SchoolDesk x={548} y={690} w={350} />
      <Emo id="melting-face" x={92} y={452} size={360} />
      <SchoolDesk x={30} y={742} w={490} />
      <T id="bas" x={40} y={806} w={920} h={176} font="meme" max={88} min={40} upper outline valign="bottom" />
    </>
  );
}

const template: MemeTemplate = {
  id: "interro-surprise",
  name: "L'annonce au tableau",
  category: "reactions",
  width: 1000,
  height: 1000,
  fields: [
    { id: "tableau", label: "Écrit au tableau", placeholder: "Interro surprise, sortez une feuille", maxLength: 70 },
    { id: "bas", label: "Légende du bas", placeholder: "Moi qui ai révisé le mauvais chapitre", maxLength: 80 },
  ],
  Render,
};

export default template;
