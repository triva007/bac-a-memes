import type { MemeTemplate } from "../../types";
import { Box, Emo, Gauge, Halftone, Icon, IfField, Sunburst, T, Txt } from "@/components/meme/kit";
import { C } from "@/components/meme/palette";

function Render() {
  return (
    <>
      <Box w={1000} h={1150} bg="#0d0c22" />
      {/* en-tête */}
      <Icon name="bolt" x={34} y={26} size={64} color={C.yellow} />
      <Txt x={108} y={32} size={46} font="display" color="#fff">
        COMPTEUR D’AURA
      </Txt>
      <IfField id="nom">
        <Box x={612} y={24} w={360} h={72} radius={36} bg="rgba(255,255,255,0.1)" border="3px solid rgba(255,255,255,0.25)" />
        <T id="nom" x={630} y={28} w={324} h={64} font="display" color={C.yellow} max={42} min={22} nowrap />
      </IfField>

      {/* gain */}
      <Box x={24} y={120} w={952} h={440} radius={36} clip bg="linear-gradient(135deg, #1b3a8f, #5b2bd6 60%, #7b5cff)">
        <Sunburst w={952} h={440} cx={0.17} cy={0.5} colors={["rgba(255,255,255,0.1)", "rgba(255,255,255,0)"]} rays={14} />
        <Halftone w={952} h={440} color="rgba(255,255,255,0.08)" size={28} />
        <Emo id="sparkles" x={16} y={30} size={110} />
        <Emo id="smiling-face-with-sunglasses" x={46} y={110} size={240} shadow="glow" />
        <Txt x={322} y={10} size={128} font="meme" color={C.green} lh={1.1} shadow="0 0 30px rgba(93,242,160,0.6), 0 6px 0 #0a5a34">
          +1000 AURA
        </Txt>
        <T id="plus" x={324} y={168} w={600} h={252} font="display" color="#fff" max={70} min={34} align="left" valign="top" lh={1.08} />
      </Box>

      {/* perte */}
      <Box x={24} y={580} w={952} h={440} radius={36} clip bg="linear-gradient(135deg, #3a0d18, #7a1226 60%, #b3173a)">
        <Halftone w={952} h={440} color="rgba(0,0,0,0.16)" size={28} />
        <Emo id="clown-face" x={46} y={110} size={240} rotate={-8} />
        <Emo id="chart-decreasing" x={196} y={280} size={130} />
        <Txt x={322} y={10} size={128} font="meme" color="#ff5c6c" lh={1.1} shadow="0 0 30px rgba(255,59,78,0.6), 0 6px 0 #4a0810">
          −1000 AURA
        </Txt>
        <T id="moins" x={324} y={168} w={600} h={252} font="display" color="#fff" max={70} min={34} align="left" valign="top" lh={1.08} />
      </Box>

      {/* solde */}
      <Txt x={34} y={1046} size={34} font="display" color="rgba(255,255,255,0.7)" ls={0.06}>
        SOLDE
      </Txt>
      <Gauge x={170} y={1046} w={560} h={50} value={0.04} color="linear-gradient(90deg, #ff3b4e, #ff9a3d)" stripes border="4px solid rgba(255,255,255,0.3)" />
      <Txt x={0} y={1034} w={966} align="right" size={62} font="meme" color="#fff">
        0 AURA
      </Txt>
      <Txt x={170} y={1102} size={27} font="sans" weight={600} color="rgba(255,255,255,0.5)">
        Verdict : t’es cuit. Retour au statut de PNJ.
      </Txt>
    </>
  );
}

const template: MemeTemplate = {
  id: "compteur-aura",
  name: "Le compteur d'aura",
  category: "cases",
  width: 1000,
  height: 1150,
  fields: [
    { id: "plus", label: "+1000 aura quand…", placeholder: "Répondre juste sans avoir écouté", maxLength: 60 },
    { id: "moins", label: "−1000 aura quand…", placeholder: "Dire « bon appétit » au prof à 8 h", maxLength: 60 },
    { id: "nom", label: "L'aura de qui ?", placeholder: "Aura de Lucas", maxLength: 20, kind: "name", optional: true },
  ],
  Render,
};

export default template;
