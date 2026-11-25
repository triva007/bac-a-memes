import type { MemeTemplate } from "../../types";
import { Box, Emo, Gym } from "@/components/meme/kit";
import { Etiquette, Legende, Perso } from "../_lot-d-kit";

const BLEU = "#3f6fd1";
const ROUGE = "#e2504a";

/** Le cours d'EPS : les deux équipes sont faites, il n'en reste qu'un. */
function Render() {
  return (
    <>
      <Gym w={1000} h={720} floorY={0.56} />
      {/* projecteur sur le dernier */}
      <Box x={300} y={120} w={400} h={600} bg="linear-gradient(180deg, rgba(255,250,210,0) 0%, rgba(255,250,210,0.34) 100%)" style={{ clipPath: "polygon(38% 0, 62% 0, 100% 100%, 0 100%)" }} />

      {/* équipe bleue */}
      <Perso id="smiling-face-with-sunglasses" x={96} y={226} size={130} corps={BLEU} corpsH={1.5} />
      <Perso id="grinning-face" x={-20} y={252} size={140} corps={BLEU} corpsH={1.5} />
      <Perso id="face-with-rolling-eyes" x={176} y={282} size={160} corps={BLEU} corpsH={1.4} sol />
      <Perso id="smirking-face" x={24} y={316} size={176} corps={BLEU} corpsH={1.34} sol />
      <Emo id="backhand-index-pointing-right" x={230} y={452} size={110} />

      {/* équipe rouge */}
      <Perso id="face-with-monocle" x={774} y={226} size={130} corps={ROUGE} corpsH={1.5} />
      <Perso id="winking-face" x={880} y={252} size={140} corps={ROUGE} corpsH={1.5} />
      <Perso id="unamused-face" x={664} y={282} size={160} corps={ROUGE} corpsH={1.4} sol />
      <Perso id="face-with-raised-eyebrow" x={800} y={316} size={176} corps={ROUGE} corpsH={1.34} sol />
      <Emo id="backhand-index-pointing-left" x={660} y={452} size={110} />

      {/* le dernier choisi */}
      <Perso id="pleading-face" x={372} y={226} size={256} corps="#f6f2e8" corpsH={1.06} sol />
      <Emo id="basketball" x={612} y={560} size={96} shadow="ground" />

      <Etiquette id="nom" x={300} y={598} w={400} h={112} rotate={-2} />
      <Legende id="haut" y={12} h={176} max={84} />
    </>
  );
}

const template: MemeTemplate = {
  id: "dernier-choisi",
  name: "Le dernier choisi en EPS",
  category: "reactions",
  width: 1000,
  height: 720,
  fields: [
    { id: "haut", label: "Légende du haut", placeholder: "« Non mais prenez-le, vous »", maxLength: 70 },
    { id: "nom", label: "Le dernier choisi", placeholder: "Moi", maxLength: 22, optional: true, kind: "name" },
  ],
  Render,
};

export default template;
