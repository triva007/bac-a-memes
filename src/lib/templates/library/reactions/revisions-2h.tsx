import type { MemeTemplate } from "../../types";
import { BedroomNight, Bubble, Emo, T } from "@/components/meme/kit";

function Render() {
  return (
    <>
      <BedroomNight w={1000} h={1000} floorY={0.77} clock="02:07" />
      <Emo id="hot-beverage" x={238} y={668} size={120} />
      <Emo id="face-with-spiral-eyes" x={356} y={452} size={340} />
      <Bubble kind="thought" x={250} y={96} w={700} h={290} tail="bottom-left">
        <T id="pensee" x={44} y={28} w={612} h={234} font="display" max={66} min={34} lh={1.1} />
      </Bubble>
      <T id="bas" x={40} y={826} w={920} h={156} font="meme" max={84} min={40} upper outline valign="bottom" />
    </>
  );
}

const template: MemeTemplate = {
  id: "revisions-2h",
  name: "Réviser à 2 h du mat",
  category: "reactions",
  width: 1000,
  height: 1000,
  fields: [
    { id: "pensee", label: "Ce qu'il se dit", placeholder: "Si je dors maintenant, ça fait 4 h de sommeil", maxLength: 80 },
    { id: "bas", label: "Légende du bas", placeholder: "La veille du bac blanc", maxLength: 60, optional: true },
  ],
  Render,
};

export default template;
