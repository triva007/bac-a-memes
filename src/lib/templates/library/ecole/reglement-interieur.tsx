import type { MemeTemplate } from "../../types";
import { Box, Emo, IfField, Paper, Stamp, T, Tape, Txt, Underline } from "@/components/meme/kit";
import { C } from "@/components/meme/palette";
import { Hr, Scribble } from "../_lot-c-kit";

function Render() {
  return (
    <>
      {/* mur du couloir */}
      <Box x={0} y={0} w={1000} h={1280} bg="linear-gradient(180deg, #cfe3dc, #b6d2c9)" />
      <Box x={0} y={0} w={1000} h={1280} bg="repeating-linear-gradient(90deg, rgba(255,255,255,0.12) 0 2px, transparent 2px 120px)" />
      <Paper x={58} y={56} w={884} h={1172} color="#fffefa" rotate={0.7} radius={3}>
        <Emo id="classical-building" x={52} y={36} size={96} shadow={false} />
        <T text="RÈGLEMENT INTÉRIEUR" x={166} y={30} w={666} h={84} font="news" max={70} min={36} nowrap align="left" color={C.ink} />
        <Txt x={168} y={112} size={25} font="type" color="#55546e">
          Chapitre IV — Vie de classe · version non négociable
        </Txt>
        <Hr x={52} y={160} w={780} thick={6} />
        <Hr x={52} y={172} w={780} thick={2} />

        <Txt x={52} y={192} w={780} size={26} font="type" color="#8a8a99" lh={1.25}>
          {"Article 12 — Les téléphones restent éteints au fond du sac. (Rires dans la salle.)"}
        </Txt>

        <Txt x={52} y={278} size={84} font="news" color={C.ink}>
          Article 12 bis
        </Txt>
        <Underline x={52} y={380} w={520} strokeW={7} />
        <Txt x={52} y={410} size={38} font="type" color={C.ink}>
          Il est formellement interdit de
        </Txt>
        <T id="interdit" x={52} y={462} w={780} h={300} font="news" max={96} min={38} lh={1.08} align="left" valign="top" color={C.ink} />

        <Txt x={52} y={784} size={38} font="type" color={C.ink}>
          Sanction prévue :
        </Txt>
        <T id="sanction" x={52} y={836} w={780} h={160} font="news" max={72} min={34} lh={1.08} align="left" valign="top" color={C.redPen} />

        <IfField id="sauf">
          <Txt x={52} y={1016} size={28} font="type" color={C.ink}>
            Dérogation accordée à :
          </Txt>
          <T id="sauf" x={52} y={1050} w={390} h={92} font="hand" weight={700} color={C.bluePen} max={78} min={36} nowrap align="left" />
        </IfField>
        <Stamp x={486} y={1016} text="ADOPTÉ" sub="sans l'avis des élèves" size={43} rotate={-6} />
        <Scribble x={620} y={1126} w={180} h={36} color={C.blackPen} strokeW={4} />
      </Paper>
      <Tape x={415} y={30} w={170} h={54} rotate={-3} />
    </>
  );
}

const template: MemeTemplate = {
  id: "reglement-interieur",
  name: "Le règlement intérieur",
  category: "ecole",
  width: 1000,
  height: 1280,
  fields: [
    { id: "interdit", label: "Il est interdit de…", placeholder: "demander «\u00a0c'est noté\u00a0?\u00a0» avant la fin de la consigne", maxLength: 80, multiline: true },
    { id: "sanction", label: "Sanction prévue", placeholder: "2 h de colle et −1000 d'aura", maxLength: 56 },
    { id: "sauf", label: "Dérogation accordée à", placeholder: "Lina (cas désespéré)", maxLength: 24, kind: "name", optional: true },
  ],
  Render,
};

export default template;
