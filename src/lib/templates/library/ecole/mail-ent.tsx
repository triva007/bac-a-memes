import type { MemeTemplate } from "../../types";
import { Avatar, Badge, Box, Emo, Icon, T, Txt } from "@/components/meme/kit";
import { FONT } from "@/components/meme/palette";
import { Glyph, Rule } from "../_lot-b-kit";

const INK = "#14132b";
const MUTED = "rgba(20,19,43,0.58)";
const TEAL = "#0f7a86";

function Render() {
  return (
    <>
      <Box w={1000} h={1000} bg="#e6ecef" />

      {/* bandeau de l'ENT */}
      <Box w={1000} h={108} bg={`linear-gradient(90deg, ${TEAL}, #14a0a0)`}>
        <Emo id="envelope" x={28} y={20} size={70} />
        <Txt x={116} y={28} size={44} font="display" color="#fff" ls={0.02}>
          ENT · MESSAGERIE
        </Txt>
        <Badge x={742} y={30} bg="#ff5fa2" size={30}>
          847 non lus
        </Badge>
      </Box>
      <Box y={108} w={1000} h={72} bg="#fff" style={{ borderBottom: "2px solid rgba(20,19,43,0.1)" }}>
        <Icon name="back" x={18} y={12} size={48} color={TEAL} />
        <Txt x={72} y={17} size={31} weight={700} color={TEAL}>
          Boîte de réception
        </Txt>
        <Glyph name="reply" x={806} y={13} size={46} color={MUTED} />
        <Glyph name="trash" x={880} y={13} size={46} color={MUTED} />
      </Box>

      {/* le message */}
      <Box x={24} y={200} w={952} h={776} bg="#fff" radius={28} shadow="0 6px 0 rgba(20,19,43,0.08)">
        <Txt x={36} y={22} size={27} weight={800} color={MUTED} ls={0.1}>
          OBJET
        </Txt>
        <T id="objet" x={36} y={54} w={880} h={112} font="display" max={60} min={32} align="left" color={INK} lh={1.04} />

        <Avatar x={36} y={186} size={88} emoji="teacher" bg="#ffe9a8" />
        <T id="prof" x={142} y={182} w={520} h={54} font="sans" weight={800} max={42} min={28} align="left" color={INK} nowrap />
        <Txt x={142} y={236} size={29} weight={500} color={MUTED}>
          à : Terminale B (34 élèves)
        </Txt>
        <Txt x={0} y={188} w={916} align="right" size={32} weight={800} color="#e5383b">
          dim. 23:47
        </Txt>
        <Rule x={36} y={292} w={880} />

        <T id="corps" x={36} y={308} w={880} h={282} font="sans" weight={500} max={50} min={30} align="left" valign="top" color="#23223c" lh={1.2} />

        {/* pièce jointe */}
        <Box x={36} y={604} w={640} h={78} radius={18} bg="#f1f4f6" border="2px solid rgba(20,19,43,0.14)">
          <Glyph name="clip" x={16} y={16} size={44} color={TEAL} />
          <Txt x={72} y={21} size={29} weight={700} color={INK}>
            DM_v7_VRAIMENT_FINAL.pdf
          </Txt>
          <Txt x={0} y={23} w={618} align="right" size={27} weight={500} color={MUTED}>
            48 p.
          </Txt>
        </Box>

        <Rule x={36} y={700} w={880} />
        <div style={{ position: "absolute", left: 36, top: 720, display: "flex", alignItems: "center", gap: 10, fontFamily: FONT.sans, fontWeight: 600, fontSize: 31, color: MUTED, whiteSpace: "nowrap" }}>
          <Icon name="clock" inline size={36} color={MUTED} />
          Envoyé dimanche à 23 h 47
        </div>
        <Box x={676} y={708} w={240} h={56} radius={28} bg={TEAL}>
          <Glyph name="reply" x={26} y={8} size={40} />
          <Txt x={76} y={9} size={30} weight={800} color="#fff">
            Répondre
          </Txt>
        </Box>
      </Box>
    </>
  );
}

const template: MemeTemplate = {
  id: "mail-ent",
  name: "Le mail du prof",
  category: "ecole",
  width: 1000,
  height: 1000,
  fields: [
    { id: "prof", label: "De la part de…", placeholder: "Votre prof de maths", maxLength: 26, kind: "name" },
    { id: "objet", label: "Objet", placeholder: "Petit DM pour demain 8 h", maxLength: 50 },
    { id: "corps", label: "Le message", placeholder: "Bonsoir à tous,\nj'ai oublié de vous prévenir : interro demain sur les 3 derniers chapitres.\nBonne soirée !", maxLength: 160, multiline: true },
  ],
  Render,
};

export default template;
