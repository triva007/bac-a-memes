import type { MemeTemplate } from "../../types";
import { Box, Emo, Halftone, LiveBadge, NewsBanner, T, Txt, Yard } from "@/components/meme/kit";

function Render() {
  return (
    <>
      {/* plateau */}
      <Box w={1000} h={800} bg="linear-gradient(180deg, #16245e 0%, #24389a 55%, #1a2a78 100%)" />
      <Halftone w={1000} h={480} color="rgba(255,255,255,0.09)" size={30} />
      <Box x={-60} y={300} w={1120} h={220} bg="linear-gradient(180deg, rgba(92,200,255,0), rgba(92,200,255,0.28))" />
      {/* duplex */}
      <Box x={500} y={56} w={452} h={318} radius={18} bg="#0b1030" shadow="0 14px 30px rgba(0,0,0,0.4)" />
      <Box x={512} y={68} w={428} h={294} radius={10} clip>
        <Yard w={428} h={294} floorY={0.72} />
        <Emo id="astonished-face" x={54} y={150} size={120} />
        <Emo id="face-with-open-eyes-and-hand-over-mouth" x={176} y={166} size={112} />
        <Emo id="face-screaming-in-fear" x={292} y={148} size={120} />
        <Box x={0} y={248} w={428} h={46} bg="rgba(11,16,48,0.82)" />
        <Txt x={14} y={256} size={26} font="display" color="#fff">
          EN DUPLEX · DEVANT LE LYCÉE
        </Txt>
      </Box>
      <LiveBadge x={36} y={36} viewers="31" />
      {/* présentateur */}
      <Emo id="face-with-monocle" x={110} y={120} size={330} />
      <Emo id="microphone" x={352} y={300} size={130} rotate={18} />
      <Box x={0} y={420} w={1000} h={80} bg="linear-gradient(180deg, #0e1646, #0a1036)" />
      <Box x={0} y={420} w={1000} h={8} bg="#5cc8ff" />

      <NewsBanner y={462} w={1000} h={338} time="08:02" ticker="CANTINE : le poisson pané reste introuvable · CDI : un élève aperçu en train de lire · MÉTÉO : pluie de DM">
        <T id="titre" x={40} y={8} w={930} h={116} font="display" upper align="left" max={82} min={38} lh={1.0} />
        <T id="sous" x={40} y={124} w={930} h={58} font="sans" weight={600} color="#3a3960" align="left" max={40} min={26} nowrap />
      </NewsBanner>
    </>
  );
}

const template: MemeTemplate = {
  id: "alerte-info",
  name: "Alerte info",
  category: "ecrans",
  width: 1000,
  height: 800,
  fields: [
    { id: "titre", label: "Le gros titre", placeholder: "Un élève a rendu son DM en avance", maxLength: 56 },
    { id: "sous", label: "Sous-titre", placeholder: "Les experts parlent d'une erreur de date", maxLength: 48, optional: true },
  ],
  Render,
};

export default template;
