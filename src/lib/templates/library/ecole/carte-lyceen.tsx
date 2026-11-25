import type { MemeTemplate } from "../../types";
import { Box, Emo, IfField, T, Txt, WoodTable } from "@/components/meme/kit";
import { C } from "@/components/meme/palette";
import { Barcode, Lbl } from "../_lot-c-kit";

function Render() {
  return (
    <>
      <WoodTable w={1000} h={680} tone="grey" />
      <Box x={28} y={30} w={944} h={620} radius={40} bg="#fbfbff" rotate={-1} clip shadow="0 3px 0 rgba(20,15,30,0.25), 0 22px 34px rgba(20,15,30,0.45)">
        {/* fond guilloché discret */}
        <Box x={0} y={0} w={944} h={620} bg="repeating-linear-gradient(115deg, rgba(123,92,255,0.07) 0 3px, transparent 3px 22px), repeating-linear-gradient(65deg, rgba(92,200,255,0.08) 0 3px, transparent 3px 22px)" />
        {/* bandeau */}
        <Box x={0} y={0} w={944} h={112} bg={`linear-gradient(90deg, ${C.violet}, #3b6cf0 70%, ${C.blue})`} />
        <Emo id="school" x={26} y={12} size={88} />
        <Txt x={130} y={10} size={58} font="display" color="#fff">
          CARTE DE LYCÉEN·NE
        </Txt>
        <Txt x={132} y={76} size={24} font="sans" color="#fff" opacity={0.92}>
          Année 2026 – 2027 · strictement personnelle (hélas)
        </Txt>
        {/* pastille holographique */}
        <Box x={812} y={10} w={96} h={96} radius="50%" bg="conic-gradient(from 20deg, #ffe94a, #5df2a0, #5cc8ff, #ff5fa2, #ffe94a)" border="5px solid rgba(255,255,255,0.9)" rotate={12}>
          <Txt x={0} y={24} w={86} size={18} font="display" color={C.ink} align="center" lh={1.02}>
            {"VALIDE\n(à peu près)"}
          </Txt>
        </Box>

        {/* photo d'identité */}
        <Box x={38} y={140} w={236} h={286} radius={16} bg="linear-gradient(180deg, #d9ecff, #b9d4f0)" border={`6px solid ${C.ink}`} clip>
          <Emo id="woozy-face" x={6} y={48} size={212} />
        </Box>
        <Barcode x={40} y={450} w={232} h={84} seed={42} />
        <Txt x={40} y={542} w={232} size={24} font="type" align="center">
          0042 1337 0667
        </Txt>

        {/* colonne des champs */}
        <Lbl x={310} y={132} size={22}>
          Nom, prénom
        </Lbl>
        <T id="nom" x={310} y={158} w={596} h={92} font="display" upper max={84} min={36} nowrap align="left" />
        <Lbl x={310} y={262} size={22}>
          Signe particulier
        </Lbl>
        <T id="signe" x={310} y={290} w={596} h={150} font="display" weight={700} color={C.bluePen} max={60} min={30} lh={1.08} align="left" valign="top" />
        <IfField id="regime">
          <Lbl x={310} y={452} size={22}>
            Régime
          </Lbl>
          <T id="regime" x={310} y={480} w={596} h={104} font="display" weight={700} max={46} min={26} lh={1.08} align="left" valign="top" />
        </IfField>
      </Box>
    </>
  );
}

const template: MemeTemplate = {
  id: "carte-lyceen",
  name: "La carte de lycéen",
  category: "ecole",
  width: 1000,
  height: 680,
  fields: [
    { id: "nom", label: "Nom sur la carte", placeholder: "Inès la Légende", maxLength: 26, kind: "name" },
    { id: "signe", label: "Signe particulier", placeholder: "Demande «\u00a0c'est noté\u00a0?\u00a0» avant de dire bonjour", maxLength: 56 },
    { id: "regime", label: "Régime", placeholder: "Demi-pensionnaire (les jours de frites)", maxLength: 44, optional: true },
  ],
  Render,
};

export default template;
