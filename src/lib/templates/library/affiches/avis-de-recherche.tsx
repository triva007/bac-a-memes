import type { MemeTemplate } from "../../types";
import { Box, Emo, Halftone, Paper, Pin, T, Txt } from "@/components/meme/kit";
import { C } from "@/components/meme/palette";

const SEPIA = "#3b2a1a";

function Render() {
  return (
    <>
      {/* panneau de liège */}
      <Box w={1000} h={1300} bg="linear-gradient(160deg, #c99865, #a97945)" />
      <Halftone w={1000} h={1300} color="rgba(70,40,15,0.28)" size={17} />
      <Halftone x={8} y={9} w={1000} h={1300} color="rgba(255,235,200,0.18)" size={23} />
      <Paper x={48} y={44} w={904} h={1216} color="#f3e4bf" rotate={-1} radius={4}>
        <Box x={22} y={22} w={860} h={1172} border={`8px double ${SEPIA}`} />
        <Txt x={0} y={46} w={904} align="center" size={34} font="type" color={SEPIA} ls={0.3}>
          VIE SCOLAIRE
        </Txt>
        <T text="AVIS DE RECHERCHE" x={60} y={84} w={784} h={134} font="news" color={SEPIA} max={120} nowrap />
        <Box x={110} y={222} w={684} h={6} bg={SEPIA} />

        {/* photo d'identité */}
        <Box x={252} y={252} w={400} h={400} clip border={`8px solid ${SEPIA}`} bg="linear-gradient(180deg, #d8d2c4, #bdb5a3)">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Box key={i} x={0} y={40 + i * 62} w={400} h={4} bg="rgba(59,42,26,0.35)" />
          ))}
          {["1m90", "1m80", "1m70", "1m60"].map((t, i) => (
            <Txt key={t} x={10} y={50 + i * 62} size={24} font="type" color="rgba(59,42,26,0.7)">
              {t}
            </Txt>
          ))}
          <Emo id="disguised-face" x={62} y={70} size={280} />
          <Box x={90} y={330} w={220} h={52} bg="#22201c" radius={4} />
          <Txt x={90} y={338} w={220} align="center" size={32} font="type" color="#f3e4bf" ls={0.08}>
            N° 4C-0420
          </Txt>
        </Box>

        <T id="nom" x={60} y={668} w={784} h={128} font="meme" color={SEPIA} upper max={118} min={44} nowrap />
        <Txt x={0} y={804} w={904} align="center" size={36} font="type" color={C.redPen} ls={0.14}>
          RECHERCHÉ(E) POUR
        </Txt>
        <T id="motif" x={70} y={848} w={764} h={176} font="news" weight={700} color={SEPIA} max={64} min={34} lh={1.08} />

        <Box x={70} y={1040} w={764} h={126} bg={C.yellow} border={`6px solid ${SEPIA}`} radius={10} />
        <Txt x={96} y={1056} size={30} font="type" color={SEPIA} ls={0.1}>
          RÉCOMPENSE :
        </Txt>
        <T id="recompense" x={96} y={1090} w={712} h={70} font="display" color={SEPIA} max={54} min={28} align="left" nowrap />
      </Paper>
      <Pin x={130} y={36} />
      <Pin x={820} y={30} color="#2f6fd0" />
    </>
  );
}

const template: MemeTemplate = {
  id: "avis-de-recherche",
  name: "Avis de recherche",
  category: "affiches",
  width: 1000,
  height: 1300,
  fields: [
    { id: "nom", label: "Qui est recherché ?", placeholder: "Le délégué", maxLength: 22, kind: "name" },
    { id: "motif", label: "Recherché(e) pour…", placeholder: "avoir rappelé au prof qu'il y avait un contrôle", maxLength: 70 },
    { id: "recompense", label: "Récompense", placeholder: "1 ticket de cantine (jour des frites)", maxLength: 38 },
  ],
  Render,
};

export default template;
