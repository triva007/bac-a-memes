import type { MemeTemplate } from "../../types";
import { Box, Classroom, Emo } from "@/components/meme/kit";
import { Etiquette, Legende, Perso, Rangee } from "../_lot-d-kit";

/** Le dernier rang vu depuis le bureau du prof : le dormeur, le gourmand, l'écran. */
function Render() {
  return (
    <>
      <Classroom w={1000} h={700} floorY={0.9} />
      {/* portemanteaux du fond */}
      <Box x={0} y={158} w={1000} h={16} bg="linear-gradient(180deg, #c99a62, #a87240)" shadow="0 5px 0 rgba(40,25,15,0.2)" />
      {[110, 330, 660, 900].map((px) => (
        <Box key={px} x={px} y={166} w={16} h={26} radius={8} bg="#6b7480" />
      ))}
      <Emo id="backpack" x={604} y={166} size={128} />

      {/* le dormeur (ses épaules : la tête est posée sur la table, plus bas) */}
      <Box x={36} y={388} w={310} h={90} radius="140px 140px 0 0 / 84px 84px 0 0" bg="linear-gradient(180deg, #7391e6, #4a67c0)" shadow="inset 0 18px 20px rgba(10,8,30,0.25)" />
      {/* le gourmand */}
      <Perso id="face-savoring-food" x={370} y={194} size={264} corps="#f0a23c" />
      {/* celui qui scrolle */}
      <Perso id="face-with-hand-over-mouth" x={712} y={202} size={258} corps="#3fa987" />

      <Rangee x={-10} y={462} w={1020} h={250} />

      {/* ce qui traîne sur la table */}
      <Emo id="sleeping-face" x={34} y={228} size={296} rotate={-16} />
      <Emo id="zzz" x={262} y={140} size={124} rotate={-6} />
      <Emo id="open-book" x={312} y={372} size={164} rotate={-8} />
      <Emo id="sandwich" x={552} y={362} size={144} rotate={10} />
      <Emo id="mobile-phone" x={668} y={358} size={140} rotate={-14} shadow="glow" />

      <Etiquette id="nom1" x={28} y={556} w={384} h={118} rotate={-3} max={64} />
      <Etiquette id="nom2" x={588} y={552} w={384} h={118} rotate={2} color="#5df2a0" max={64} />

      <Legende id="haut" y={8} h={142} max={82} />
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
