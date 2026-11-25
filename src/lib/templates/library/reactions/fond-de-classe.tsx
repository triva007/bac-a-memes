import type { MemeTemplate } from "../../types";
import { Box, Classroom, Emo, WallClock } from "@/components/meme/kit";
import { Etiquette, Legende, Perso, Rangee } from "../_lot-d-kit";

/** Le dernier rang vu depuis le bureau du prof : le dormeur, le gourmand, l'écran. */
function Render() {
  return (
    <>
      <Classroom w={1000} h={700} floorY={0.9} />
      {/* portemanteaux du fond */}
      <Box x={0} y={182} w={1000} h={16} bg="linear-gradient(180deg, #c99a62, #a87240)" shadow="0 5px 0 rgba(40,25,15,0.2)" />
      {[120, 330, 540, 750, 930].map((px) => (
        <Box key={px} x={px} y={190} w={16} h={26} radius={8} bg="#6b7480" />
      ))}
      <Emo id="backpack" x={470} y={196} size={150} />
      <Emo id="scarf" x={278} y={196} size={110} />
      <WallClock x={874} y={30} size={104} time="16:42" />

      {/* le dormeur */}
      <Box x={50} y={408} w={280} h={90} radius="130px 130px 0 0 / 80px 80px 0 0" bg="linear-gradient(180deg, #7391e6, #4a67c0)" shadow="inset 0 18px 20px rgba(10,8,30,0.25)" />

      {/* le gourmand */}
      <Perso id="face-savoring-food" x={382} y={222} size={240} corps="#f0a23c" />

      {/* celui qui scrolle */}
      <Perso id="face-with-hand-over-mouth" x={708} y={228} size={236} corps="#3fa987" />

      <Rangee x={-10} y={474} w={1020} h={240} />

      {/* ce qui traîne sur la table */}
      <Emo id="sleeping-face" x={52} y={262} size={262} rotate={-16} />
      <Emo id="zzz" x={258} y={176} size={116} rotate={-6} />
      <Emo id="open-book" x={330} y={388} size={150} rotate={-8} />
      <Emo id="sandwich" x={548} y={372} size={136} rotate={10} />
      <Emo id="mobile-phone" x={676} y={372} size={128} rotate={-14} shadow="glow" />

      <Etiquette id="nom1" x={40} y={568} w={300} h={100} rotate={-3} />
      <Etiquette id="nom2" x={664} y={564} w={300} h={100} rotate={2} color="#5df2a0" />

      <Legende id="haut" y={12} h={166} max={84} />
    </>
  );
}

const template: MemeTemplate = {
  id: "fond-de-classe",
  name: "Le fond de la classe",
  category: "reactions",
  width: 1000,
  height: 700,
  fields: [
    { id: "haut", label: "Légende du haut", placeholder: "« Le fond, vous suivez ? »", maxLength: 70 },
    { id: "nom1", label: "Celui qui dort", placeholder: "Le dormeur", maxLength: 22, optional: true, kind: "name" },
    { id: "nom2", label: "Celui sur son téléphone", placeholder: "Le scrolleur", maxLength: 22, optional: true, kind: "name" },
  ],
  Render,
};

export default template;
