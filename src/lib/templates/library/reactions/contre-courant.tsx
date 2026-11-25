import type { MemeTemplate } from "../../types";
import { Corridor, Emo } from "@/components/meme/kit";
import { Dessin, Legende, Perso } from "../_lot-d-kit";

const GRIS = ["#8a8fa3", "#7b8196", "#9aa0b2", "#858ba0"];

/** Le couloir entre deux cours : la foule de PNJ dans un sens, un seul dans l'autre. */
function Render() {
  return (
    <>
      <Corridor w={1000} h={640} floorY={0.7} />
      {/* flèches au sol : le sens de la foule, et l'autre */}
      <Dessin w={1000} h={640}>
        {[70, 210, 350].map((ax) => (
          <polygon key={ax} points={`${ax + 70},520 ${ax + 110},520 ${ax + 40},566 ${ax + 130},612 ${ax + 90},612 ${ax},566`} fill="rgba(255,255,255,0.4)" />
        ))}
        <polygon points="700,548 760,548 850,586 760,624 700,624 790,586" fill="#ffe94a" opacity={0.9} />
      </Dessin>

      {/* la foule, rang du fond */}
      {[-24, 96, 216, 336, 456].map((px, i) => (
        <Perso key={px} id={["neutral-face", "expressionless-face", "neutral-face", "face-without-mouth", "neutral-face"][i]} x={px} y={188} size={132} corps={GRIS[i % 4]} corpsH={1.5} sac="#5b6072" />
      ))}
      {/* la foule, premier rang */}
      {[-40, 122, 284, 430].map((px, i) => (
        <Perso key={px} id={["neutral-face", "neutral-face", "expressionless-face", "neutral-face"][i]} x={px} y={236} size={172} corps={GRIS[(i + 1) % 4]} corpsH={1.42} sac="#4f5466" sol />
      ))}
      <Emo id="dashing-away" x={566} y={318} size={96} flip />

      {/* celui qui remonte le courant */}
      <Emo id="dashing-away" x={548} y={430} size={120} />
      <Perso id="grinning-face-with-sweat" x={650} y={150} size={300} corps="#ff5fa2" corpsH={1.12} sac="#7b5cff" sol />

      <Legende id="foule" x={24} y={12} w={590} h={164} max={76} min={38} />
      <Legende id="moi" x={400} y={478} w={580} h={150} max={72} min={38} valign="bottom" />
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
    { id: "foule", label: "La foule", placeholder: "Tout le lycée qui va en cours", maxLength: 50 },
    { id: "moi", label: "Celui à contre-courant", placeholder: "Moi qui ai oublié mon sac au self", maxLength: 50 },
  ],
  Render,
};

export default template;
