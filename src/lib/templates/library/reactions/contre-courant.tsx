import type { MemeTemplate } from "../../types";
import { Corridor } from "@/components/meme/kit";
import { Dessin, Legende, Perso } from "../_lot-d-kit";

const GRIS = ["#8a8fa3", "#737a92", "#9aa0b2", "#7f869c"];
const PNJ = ["neutral-face", "expressionless-face", "neutral-face", "face-without-mouth", "neutral-face"];

/** Le couloir entre deux cours : la foule de PNJ part d'un côté, un seul remonte le courant. */
function Render() {
  return (
    <>
      <Corridor w={1000} h={640} floorY={0.7} />

      {/* la foule : trois rangs serrés, tous penchés dans le même sens */}
      {[0, 112, 224, 336, 448].map((px, i) => (
        <Perso key={px} id={PNJ[i]} x={px} y={166} size={126} corps={GRIS[i % 4]} corpsH={1.2} rotate={-7} />
      ))}
      {[-46, 96, 238, 380].map((px, i) => (
        <Perso key={px} id={PNJ[(i + 2) % 5]} x={px} y={226} size={158} corps={GRIS[(i + 1) % 4]} corpsH={1.2} rotate={-7} />
      ))}
      {[-72, 116, 304].map((px, i) => (
        <Perso key={px} id={PNJ[(i + 1) % 5]} x={px} y={316} size={206} corps={GRIS[(i + 2) % 4]} corpsH={1.3} sac="#555b70" rotate={-8} />
      ))}

      {/* traits de vitesse de celui qui remonte */}
      <Dessin w={1000} h={640}>
        {[
          [536, 236, 96],
          [506, 292, 150],
          [548, 348, 104],
          [522, 404, 130],
          [560, 520, 90],
          [530, 574, 120],
        ].map(([lx, ly, lw]) => (
          <rect key={ly} x={lx} y={ly} width={lw} height={12} rx={6} fill="#fff" opacity={0.85} />
        ))}
      </Dessin>
      <Perso id="grinning-face-with-sweat" x={654} y={150} size={304} corps="#ff5fa2" corpsH={1.3} sac="#7b5cff" rotate={9} />

      <Legende id="foule" x={20} y={8} w={610} h={150} max={76} min={38} />
      <Legende id="moi" x={420} y={484} w={562} h={146} max={72} min={38} valign="bottom" />
    </>
  );
}

const template: MemeTemplate = {
  id: "contre-courant",
  name: "À contre-courant",
  category: "reactions",
  width: 1000,
  height: 640,
  fields: [
    { id: "foule", label: "La foule", placeholder: "Les PNJ qui vont en cours", maxLength: 50 },
    { id: "moi", label: "Celui à contre-courant", placeholder: "Moi qui ai oublié mon sac au self", maxLength: 50 },
  ],
  Render,
};

export default template;
