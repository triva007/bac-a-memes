import type { MemeTemplate } from "../../types";
import { Bubble, Emo, T, Txt, Yard } from "@/components/meme/kit";
import { Legende, Ombre, Perso, Voile } from "../_lot-d-kit";

/** La cour : tout le groupe est mort de rire, et lui arrive après la blague. */
function Render() {
  return (
    <>
      <Yard w={1000} h={1000} floorY={0.56} />

      {/* le groupe qui rigole */}
      <Txt x={36} y={300} size={84} font="meme" color="#ffe94a" rotate={-10} shadow="0 6px 0 #14132b, 0 0 0 #14132b" style={{ WebkitTextStroke: "3px #14132b" }}>
        HA HA
      </Txt>
      <Txt x={330} y={356} size={62} font="meme" color="#fff" rotate={8} style={{ WebkitTextStroke: "3px #14132b" }} shadow="0 5px 0 #14132b">
        HA !
      </Txt>
      <Perso id="grinning-squinting-face" x={300} y={440} size={210} corps="#4b9fc4" corpsH={1.26} sol />
      <Perso id="face-with-tears-of-joy" x={92} y={452} size={236} corps="#f0a23c" corpsH={1.2} sol />
      <Ombre x={300} y={850} w={300} h={64} />
      <Emo id="rolling-on-the-floor-laughing" x={322} y={672} size={232} rotate={-14} />
      <Ombre x={-30} y={884} w={250} h={56} />
      <Emo id="squinting-face-with-tongue" x={-28} y={720} size={206} rotate={12} />

      {/* celui qui arrive après */}
      <Perso id="confused-face" x={624} y={400} size={320} corps="#7b5cff" corpsH={1.06} sac="#ff5fa2" sol />
      <Emo id="white-question-mark" x={880} y={300} size={120} rotate={14} />
      <Emo id="red-question-mark" x={560} y={350} size={96} rotate={-16} />

      <Bubble x={380} y={36} w={584} h={212} tail="bottom-right">
        <T id="bulle" x={30} y={20} w={524} h={172} font="display" max={66} min={32} lh={1.08} />
      </Bubble>

      <Voile id="bas" y={800} h={200} />
      <Legende id="bas" y={848} h={140} max={82} valign="bottom" />
    </>
  );
}

const template: MemeTemplate = {
  id: "blague-pas-comprise",
  name: "Celui qui a raté la blague",
  category: "reactions",
  width: 1000,
  height: 1000,
  fields: [
    { id: "bulle", label: "Ce qu'il dit en arrivant", placeholder: "Attendez, pourquoi vous rigolez ?", maxLength: 70 },
    { id: "bas", label: "Légende du bas", placeholder: "Arrivé pile après la chute", maxLength: 60, optional: true },
  ],
  Render,
};

export default template;
