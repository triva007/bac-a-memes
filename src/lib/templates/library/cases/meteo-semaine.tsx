import type { MemeTemplate } from "../../types";
import { Box, Emo, Icon, T, Txt } from "@/components/meme/kit";
import { FONT } from "@/components/meme/palette";

const INK = "#14132b";

function Day({ y, day, emoji, id, text, temp, tone }: { y: number; day: string; emoji: string; id?: string; text?: string; temp: string; tone: string }) {
  return (
    <Box x={26} y={y} w={948} h={108} radius={30} bg="rgba(255,255,255,0.93)" shadow="0 5px 0 rgba(13,42,92,0.18)">
      <Txt x={26} y={30} size={42} font="display" color={INK}>
        {day}
      </Txt>
      <Emo id={emoji} x={150} y={9} size={90} />
      <T id={id} text={text} x={262} y={8} w={520} h={92} font="sans" weight={700} max={46} min={26} align="left" color={id ? INK : "rgba(20,19,43,0.72)"} lh={1.12} />
      <div style={{ position: "absolute", left: 790, top: 0, width: 136, height: 108, display: "flex", alignItems: "center", justifyContent: "flex-end", fontFamily: FONT.meme, fontSize: 66, color: tone }}>{temp}</div>
    </Box>
  );
}

function Render() {
  return (
    <>
      <Box w={1000} h={760} bg="linear-gradient(180deg, #1f5fc0 0%, #3f8fe0 40%, #86c2f5 100%)" />
      <Box x={-120} y={-160} w={520} h={520} radius="50%" bg="radial-gradient(closest-side, rgba(255,255,255,0.22), rgba(255,255,255,0))" />
      <Emo id="sun-behind-rain-cloud" x={806} y={6} size={160} />

      <Txt x={36} y={24} size={62} font="display" color="#fff" shadow="0 4px 0 rgba(13,42,92,0.35)">
        Météo de la semaine
      </Txt>
      <div style={{ position: "absolute", left: 36, top: 104, display: "flex", alignItems: "center", gap: 8, fontFamily: FONT.sans, fontWeight: 600, fontSize: 33, color: "rgba(255,255,255,0.94)", whiteSpace: "nowrap" }}>
        <Icon name="pin" inline size={36} />
        Lycée, salle 204 · ressenti : lundi matin
      </div>

      <Day y={170} day="LUN." emoji="cold-face" id="lun" temp="−4°" tone="#1f5fc0" />
      <Day y={286} day="MAR." emoji="cloud-with-rain" text="Averses de contrôles surprises" temp="3°" tone="#1f5fc0" />
      <Day y={402} day="MER." emoji="sun-behind-small-cloud" id="mer" temp="19°" tone="#f08a1c" />
      <Day y={518} day="JEU." emoji="tornado" text="Avis de tempête : rendu des copies" temp="−12°" tone="#1f5fc0" />
      <Day y={634} day="VEN." emoji="smiling-face-with-sunglasses" id="ven" temp="38°" tone="#e5383b" />
    </>
  );
}

const template: MemeTemplate = {
  id: "meteo-semaine",
  name: "La météo de la semaine",
  category: "cases",
  width: 1000,
  height: 760,
  fields: [
    { id: "lun", label: "Lundi", placeholder: "Brouillard total, visibilité : 0 neurone", maxLength: 50 },
    { id: "mer", label: "Mercredi", placeholder: "Éclaircie : le prof est absent", maxLength: 50 },
    { id: "ven", label: "Vendredi", placeholder: "Canicule d'aura, masterclass à 17 h", maxLength: 50 },
  ],
  Render,
};

export default template;
