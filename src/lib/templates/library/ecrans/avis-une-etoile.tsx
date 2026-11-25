import type { MemeTemplate } from "../../types";
import { Avatar, Box, Emo, Icon, T, Txt } from "@/components/meme/kit";
import { FONT } from "@/components/meme/palette";
import { Glyph, Rule, Stars } from "../_lot-b-kit";

const INK = "#14132b";
const MUTED = "rgba(20,19,43,0.58)";

function Render() {
  return (
    <>
      <Box w={1000} h={1000} bg="#efece3" />

      {/* la fiche de ce qui est noté */}
      <Box x={30} y={30} w={940} h={300} bg="#fff" radius={36} shadow="0 8px 0 rgba(20,19,43,0.08)">
        <Box x={30} y={30} w={200} h={240} radius={26} bg="linear-gradient(150deg, #ffe94a, #ff9a3d)">
          <Emo id="school" x={22} y={34} size={156} />
        </Box>
        <Txt x={262} y={32} size={30} weight={800} color={MUTED} ls={0.1}>
          AVIS SUR :
        </Txt>
        <T id="sujet" x={262} y={72} w={650} h={132} font="display" max={66} min={34} align="left" color={INK} lh={1.04} />
        <Stars x={262} y={222} size={46} n={1} />
        <Txt x={528} y={218} size={46} font="display" color={INK}>
          1,0
        </Txt>
        <Txt x={618} y={230} size={31} weight={600} color={MUTED}>
          · 847 avis
        </Txt>
      </Box>

      {/* l'avis */}
      <Box x={30} y={350} w={940} h={620} bg="#fff" radius={36} shadow="0 8px 0 rgba(20,19,43,0.08)">
        <Avatar x={36} y={30} size={92} emoji="weary-face" bg="#5cc8ff" />
        <Txt x={150} y={30} size={36} weight={800} color={INK}>
          Élève anonyme
        </Txt>
        <div style={{ position: "absolute", left: 150, top: 78, display: "flex", alignItems: "center", gap: 8, fontFamily: FONT.sans, fontWeight: 700, fontSize: 28, color: "#1f8a4c", whiteSpace: "nowrap" }}>
          <Icon name="check" inline size={32} color="#1f8a4c" /> Présence vérifiée
        </div>
        <Txt x={0} y={36} w={904} align="right" size={29} weight={500} color={MUTED}>
          il y a 2 h
        </Txt>

        <Stars x={36} y={142} size={74} n={1} />
        <Txt x={470} y={150} size={58} font="meme" color="#e5383b">
          1/5
        </Txt>

        <T id="titre" x={36} y={232} w={868} h={104} font="display" max={62} min={34} align="left" color={INK} lh={1.04} />
        <T id="texte" x={36} y={346} w={868} h={166} font="sans" weight={500} max={46} min={30} align="left" valign="top" color="#2a2940" lh={1.2} />

        <Rule x={36} y={524} w={868} />
        <Txt x={36} y={550} size={30} weight={600} color={MUTED}>
          847 personnes ont trouvé cet avis utile
        </Txt>
        <Box x={724} y={538} w={180} h={64} radius={32} border="3px solid rgba(20,19,43,0.25)">
          <Glyph name="thumb" x={22} y={10} size={38} color={INK} />
          <Txt x={70} y={11} size={31} weight={800} color={INK}>
            Utile
          </Txt>
        </Box>
      </Box>
    </>
  );
}

const template: MemeTemplate = {
  id: "avis-une-etoile",
  name: "L'avis 1 étoile",
  category: "ecrans",
  width: 1000,
  height: 1000,
  fields: [
    { id: "sujet", label: "Avis sur…", placeholder: "le cours de maths du lundi 8 h", maxLength: 45 },
    { id: "titre", label: "Titre de l'avis", placeholder: "Je veux récupérer mes 2 heures", maxLength: 50 },
    { id: "texte", label: "L'avis", placeholder: "Ambiance au top, mais j'ai rien compris depuis septembre. Gros flop.", maxLength: 130, multiline: true },
  ],
  Render,
};

export default template;
