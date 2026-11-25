import type { MemeTemplate } from "../../types";
import { Box, Emo, Halftone, IfField, T, Txt, Yard } from "@/components/meme/kit";
import { C } from "@/components/meme/palette";

const INK = "#1d1b2e";

function Brief({ y, title, text }: { y: number; title: string; text: string }) {
  return (
    <>
      <Txt x={684} y={y} size={29} font="display" color={C.redPen} ls={0.04}>
        {title}
      </Txt>
      <Txt x={684} y={y + 38} w={278} size={31} font="news" weight={700} color={INK} lh={1.12}>
        {text}
      </Txt>
      <Box x={684} y={y + 150} w={278} h={3} bg="rgba(29,27,46,0.35)" />
    </>
  );
}

function Render() {
  return (
    <>
      <Box w={1000} h={1300} bg="linear-gradient(180deg, #f6efdc, #efe5cb)" />
      <Box w={1000} h={1300} bg="repeating-linear-gradient(0deg, rgba(29,27,46,0.025) 0 2px, transparent 2px 7px)" />

      {/* manchette */}
      <Txt x={38} y={30} size={25} font="sans" weight={700} color={INK} ls={0.04}>
        LUNDI 12 JANVIER 2026
      </Txt>
      <Txt x={0} y={30} w={962} align="right" size={25} font="sans" weight={700} color={INK} ls={0.04}>
        PRIX : 1 TICKET DE CANTINE
      </Txt>
      <Txt x={0} y={52} w={1000} align="center" size={124} font="news" color={INK} lh={1.1} ls={-0.01}>
        {"L'Écho du Lycée"}
      </Txt>
      <Box x={38} y={198} w={924} h={8} bg={INK} />
      <Box x={38} y={212} w={924} h={3} bg={INK} />
      <Txt x={0} y={222} w={1000} align="center" size={25} font="news" weight={700} italic color={INK}>
        « Toute l’info du bahut, même celle qu’on a inventée » · N° 1 247
      </Txt>
      <Box x={38} y={262} w={924} h={3} bg={INK} />

      {/* gros titre */}
      <T id="titre" x={38} y={276} w={924} h={292} font="news" color={INK} max={128} min={50} lh={1.02} />
      <T id="chapo" x={60} y={574} w={880} h={112} font="news" weight={700} italic color="#3d3a55" max={50} min={30} lh={1.12} />

      {/* photo */}
      <Box x={38} y={706} w={620} h={400} clip border={`5px solid ${INK}`}>
        <Box w={620} h={400} style={{ filter: "grayscale(1) contrast(1.15)" }}>
          <Yard w={620} h={400} floorY={0.62} />
          <Emo id="astonished-face" x={34} y={180} size={160} shadow="ground" />
          <Emo id="face-with-hand-over-mouth" x={180} y={206} size={150} shadow="ground" />
          <Emo id="face-screaming-in-fear" x={320} y={176} size={166} shadow="ground" />
          <Emo id="camera-with-flash" x={470} y={232} size={130} rotate={-10} />
        </Box>
        <Halftone w={620} h={400} color="rgba(29,27,46,0.3)" size={9} />
      </Box>
      <Txt x={38} y={1112} w={620} size={25} font="sans" weight={500} italic color="#3d3a55">
        Des témoins sous le choc, ce matin.
      </Txt>

      {/* brèves */}
      <Box x={670} y={706} w={3} h={436} bg="rgba(29,27,46,0.35)" />
      <Brief y={706} title="MÉTÉO" text="Pluie de DM sur toute la semaine." />
      <Brief y={868} title="CANTINE" text="Le poisson pané serait du poisson." />
      <Txt x={684} y={1030} size={29} font="display" color={C.redPen} ls={0.04}>
        SPORT
      </Txt>
      <Txt x={684} y={1068} w={278} size={31} font="news" weight={700} color={INK} lh={1.12}>
        Cross annulé : aucune plainte.
      </Txt>

      {/* le témoin */}
      <IfField id="citation">
        <Box x={38} y={1156} w={924} h={4} bg={INK} />
        <Box x={38} y={1176} w={190} h={96} bg={INK} />
        <Txt x={38} y={1186} w={190} align="center" size={30} font="display" color="#fff" lh={1.1}>
          {"LE\nTÉMOIN"}
        </Txt>
        <T id="citation" x={250} y={1168} w={712} h={112} font="news" weight={700} italic color={INK} max={56} min={30} align="left" lh={1.08} />
      </IfField>
    </>
  );
}

const template: MemeTemplate = {
  id: "une-journal",
  name: "La une du journal",
  category: "affiches",
  width: 1000,
  height: 1300,
  fields: [
    { id: "titre", label: "Le gros titre", placeholder: "Il arrive à l'heure : le lycée sous le choc", maxLength: 56 },
    { id: "chapo", label: "Sous-titre", placeholder: "« On pensait à un remplaçant », confie la CPE", maxLength: 80 },
    { id: "citation", label: "Le témoin raconte", placeholder: "« J'ai rien vu, je dormais. »", maxLength: 56, optional: true },
  ],
  Render,
};

export default template;
