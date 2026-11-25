import type { MemeTemplate } from "../../types";
import { Bubble, CpeOffice, Emo, IfField, T } from "@/components/meme/kit";
import { Perso } from "../_lot-d-kit";

/** Le bureau du CPE : la question qui tombe, et l'élève qui transpire. */
function Render() {
  return (
    <>
      <CpeOffice w={1000} h={1150} floorY={0.66}>
        <Perso id="face-with-raised-eyebrow" x={346} y={470} size={308} corps="#3d5a8a" corpsH={0.6} cravate="#e5383b" />
      </CpeOffice>

      {/* l'élève, au premier plan */}
      <Perso id="anxious-face-with-sweat" x={556} y={700} size={410} corps="#5df2a0" corpsH={0.6} corpsW={1.14} />
      <Emo id="sweat-droplets" x={868} y={640} size={130} rotate={8} />

      <Bubble x={36} y={40} w={600} h={300} tail="bottom-right">
        <T id="question" x={34} y={24} w={532} h={252} font="display" max={70} min={34} lh={1.08} />
      </Bubble>

      <IfField id="pensee">
        <Bubble kind="thought" x={30} y={904} w={470} h={206} tail="right">
          <T id="pensee" x={30} y={20} w={410} h={166} font="display" max={56} min={30} lh={1.08} />
        </Bubble>
      </IfField>
    </>
  );
}

const template: MemeTemplate = {
  id: "convoque-cpe",
  name: "Convoqué chez le CPE",
  category: "reactions",
  width: 1000,
  height: 1150,
  fields: [
    { id: "question", label: "Ce que dit le CPE", placeholder: "Tu m'expliques tes 14 retards en novembre ?", maxLength: 80 },
    { id: "pensee", label: "Ce que pense l'élève", placeholder: "T'es cuit. T'es complètement cuit.", maxLength: 60, optional: true },
  ],
  Render,
};

export default template;
