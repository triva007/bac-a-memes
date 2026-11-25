import type { MemeTemplate } from "../../types";
import { Box, Emo, IfField, Ribbon, T, Txt, Yard } from "@/components/meme/kit";
import { C } from "@/components/meme/palette";

function Render() {
  return (
    <>
      <Box w={1000} h={1040} bg={C.ink} />
      {/* titre */}
      <IfField id="titre">
        <T id="titre" x={30} y={10} w={940} h={112} font="display" color={C.yellow} upper max={72} min={34} lh={1.0} />
      </IfField>
      <IfField id="titre" not>
        <Txt x={0} y={26} w={1000} align="center" size={68} font="display" color={C.yellow}>
          ATTENTES / RÉALITÉ
        </Txt>
      </IfField>

      {/* attentes */}
      <Box x={0} y={132} w={496} h={470} clip>
        <Yard w={496} h={470} floorY={0.7} />
        <Emo id="sparkles" x={36} y={150} size={110} />
        <Emo id="star-struck" x={128} y={176} size={250} shadow="ground" />
        <Emo id="sparkles" x={352} y={110} size={90} flip />
      </Box>
      <Box x={0} y={602} w={496} h={438} bg="linear-gradient(180deg, #e9fff3, #c9f7dd)" />
      <T id="attentes" x={28} y={650} w={440} h={366} font="display" max={70} min={34} lh={1.08} />

      {/* réalité */}
      <Box x={504} y={132} w={496} h={470} clip>
        <Box w={496} h={470} style={{ filter: "grayscale(0.85) brightness(0.72)" }}>
          <Yard w={496} h={470} floorY={0.7} />
        </Box>
        <Box w={496} h={470} bg="repeating-linear-gradient(105deg, rgba(210,230,255,0.5) 0 4px, transparent 4px 46px)" opacity={0.6} />
        <Emo id="cloud-with-rain" x={150} y={8} size={200} />
        <Emo id="melting-face" x={124} y={196} size={250} shadow="ground" />
      </Box>
      <Box x={504} y={602} w={496} h={438} bg="linear-gradient(180deg, #2c2a5a, #1e1d40)" />
      <T id="realite" x={532} y={650} w={440} h={366} font="display" color="#fff" max={70} min={34} lh={1.08} />

      <Ribbon x={58} y={566} w={380} h={76} color={C.green} rotate={-2}>
        <Txt x={0} y={12} w={380} align="center" size={44} font="display">
          ATTENTES
        </Txt>
      </Ribbon>
      <Ribbon x={562} y={566} w={380} h={76} color={C.pink} rotate={2}>
        <Txt x={0} y={12} w={380} align="center" size={44} font="display" color="#fff">
          RÉALITÉ
        </Txt>
      </Ribbon>
    </>
  );
}

const template: MemeTemplate = {
  id: "attentes-realite",
  name: "Attentes / Réalité",
  category: "cases",
  width: 1000,
  height: 1040,
  fields: [
    { id: "titre", label: "Le sujet", placeholder: "La sortie scolaire", maxLength: 34, optional: true },
    { id: "attentes", label: "Attentes", placeholder: "Une journée sans cours", maxLength: 60 },
    { id: "realite", label: "Réalité", placeholder: "4 h de car et un questionnaire noté", maxLength: 60 },
  ],
  Render,
};

export default template;
