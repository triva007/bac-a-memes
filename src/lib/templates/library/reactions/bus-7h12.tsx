import type { MemeTemplate } from "../../types";
import { Box, Bubble, Bus, Emo, T, Txt } from "@/components/meme/kit";
import { Legende, Voile } from "../_lot-d-kit";

/** Le bus du matin : tout le monde dort, sauf un. */
function Render() {
  return (
    <>
      <Bus w={1000} h={760} floorY={0.6} />
      {/* girouette */}
      <Box x={716} y={8} w={262} h={64} radius={10} bg="#0a0c24" border="4px solid #2c2a5a" />
      <Txt x={716} y={14} w={262} align="center" size={42} font="display" color="#ff9a3d" ls={0.06} shadow="0 0 12px rgba(255,154,61,0.7)">
        07:12
      </Txt>

      {/* les dormeurs */}
      <Emo id="sleeping-face" x={18} y={258} size={292} rotate={-13} />
      <Emo id="sleepy-face" x={694} y={262} size={288} rotate={12} />
      <Emo id="zzz" x={846} y={150} size={110} />
      <Emo id="backpack" x={742} y={520} size={190} rotate={-6} />
      <Emo id="headphone" x={46} y={520} size={150} rotate={10} />

      {/* le seul réveillé */}
      <Emo id="zany-face" x={332} y={232} size={340} />

      <Bubble x={36} y={22} w={610} h={190} tail="bottom-right">
        <T id="bulle" x={30} y={18} w={550} h={154} font="display" max={64} min={32} lh={1.08} />
      </Bubble>

      <Voile id="bas" y={580} h={180} force={0.5} />
      <Legende id="bas" y={612} h={136} max={78} valign="bottom" />
    </>
  );
}

const template: MemeTemplate = {
  id: "bus-7h12",
  name: "Le bus de 7 h 12",
  category: "reactions",
  width: 1000,
  height: 760,
  fields: [
    { id: "bulle", label: "Ce qu'il dit", placeholder: "Les gars, vous avez révisé pour l'interro ?", maxLength: 70 },
    { id: "bas", label: "Légende du bas", placeholder: "Le seul à avoir bu un café", maxLength: 60, optional: true },
  ],
  Render,
};

export default template;
