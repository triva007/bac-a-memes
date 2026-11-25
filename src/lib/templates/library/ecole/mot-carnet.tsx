import type { MemeTemplate } from "../../types";
import { Box, Paper, Stamp, T, Txt, WoodTable } from "@/components/meme/kit";
import { C } from "@/components/meme/palette";

const DOTS = "repeating-linear-gradient(90deg, #8b89a8 0 6px, transparent 6px 14px)";

function Check({ x, y, on, label }: { x: number; y: number; on?: boolean; label: string }) {
  return (
    <>
      <Box x={x} y={y} w={34} h={34} border="4px solid #14132b" radius={5} bg="#fff" />
      {on ? (
        <Txt x={x + 1} y={y - 30} size={66} font="hand" color={C.bluePen}>
          ✓
        </Txt>
      ) : null}
      <Txt x={x + 46} y={y - 2} size={29} font="sans" weight={600}>
        {label}
      </Txt>
    </>
  );
}

function Render() {
  return (
    <>
      <WoodTable w={1000} h={1150} tone="grey" />
      {/* couverture du carnet qui dépasse */}
      <Box x={14} y={16} w={972} h={1180} radius={22} bg="linear-gradient(180deg, #2f6fd0, #2457ad)" shadow="0 14px 30px rgba(20,15,30,0.4)" />
      <Paper x={40} y={36} w={926} h={1160} radius={10} color="#fdfbf2" />

      <Box x={40} y={36} w={926} h={96} bg="#2f6fd0" radius="10px 10px 0 0" />
      <Txt x={40} y={60} w={926} align="center" size={38} font="display" color="#fff" ls={0.04}>
        CORRESPONDANCE AVEC LES FAMILLES
      </Txt>

      <Txt x={78} y={160} size={30} font="sans" weight={700}>
        Date :
      </Txt>
      <Txt x={178} y={142} size={50} font="hand" color={C.bluePen}>
        lundi 12 janvier
      </Txt>
      <Txt x={560} y={160} size={30} font="sans" weight={700}>
        Page 47 / 48
      </Txt>
      <Txt x={78} y={226} size={30} font="sans" weight={700}>
        Objet :
      </Txt>
      <Check x={196} y={224} label="Travail" />
      <Check x={388} y={224} label="Comportement" />
      <Check x={680} y={224} on label="On ne sait plus" />

      <Box x={78} y={290} w={850} h={4} bg={C.ink} />
      <Txt x={78} y={318} size={31} font="sans" weight={500} italic>
        Madame, Monsieur, je vous informe que votre enfant…
      </Txt>
      {[452, 534, 616, 698].map((y) => (
        <Box key={y} x={78} y={y} w={850} h={3} bg={DOTS} />
      ))}
      <T id="mot" x={84} y={372} w={838} h={330} font="hand" color={C.bluePen} max={88} min={42} align="left" valign="top" lh={0.96} />

      <Txt x={78} y={734} size={30} font="sans" weight={700}>
        Signature du professeur :
      </Txt>
      <T id="prof" x={470} y={712} w={410} h={78} font="hand" color={C.bluePen} max={70} min={32} align="left" nowrap rotate={-3} />
      <Stamp x={690} y={792} text="Vu" sub="vie scolaire" size={46} rotate={8} color="#2f6fd0" />

      <Box x={78} y={886} w={850} h={236} border="4px dashed #14132b" radius={14} bg="rgba(255,233,74,0.14)" />
      <Txt x={104} y={902} size={30} font="sans" weight={700}>
        Réponse et signature des parents :
      </Txt>
      <T id="reponse" x={104} y={944} w={800} h={166} font="hand" color={C.greenPen} max={84} min={40} align="left" valign="top" lh={0.96} rotate={-1} />
    </>
  );
}

const template: MemeTemplate = {
  id: "mot-carnet",
  name: "Le mot dans le carnet",
  category: "ecole",
  width: 1000,
  height: 1150,
  fields: [
    { id: "mot", label: "…votre enfant (le mot du prof)", placeholder: "a tenté de vendre des réponses qu'il n'avait pas.", maxLength: 100, multiline: true },
    { id: "prof", label: "Signé", placeholder: "Mme Lefèvre", maxLength: 22, kind: "name" },
    { id: "reponse", label: "Réponse des parents", placeholder: "Vu. Il tient ça de son père.", maxLength: 60, optional: true },
  ],
  Render,
};

export default template;
