import type { MemeTemplate } from "../../types";
import { Box, Icon, StatusBar, T, Txt } from "@/components/meme/kit";
import { FONT } from "@/components/meme/palette";
import { Glyph, Toggle, type GlyphName } from "../_lot-b-kit";

const ORANGE = "#ff9a3d";
const DIM = "rgba(255,255,255,0.5)";

function Row({ y, time, id, text, on = true, alert }: { y: number; time: string; id?: string; text?: string; on?: boolean; alert?: boolean }) {
  return (
    <Box y={y} w={1000} h={186}>
      <Box x={44} w={956} h={2} bg="rgba(255,255,255,0.14)" />
      <Txt x={44} y={40} size={98} weight={300} color={alert ? "#ff5a5a" : on ? "#fff" : DIM} ls={-0.02} lh={1}>
        {time}
      </Txt>
      <T id={id} text={text} x={326} y={16} w={470} h={154} font="sans" weight={700} max={54} min={30} align="left" color={alert ? "#ff8080" : "#fff"} lh={1.14} />
      <Toggle x={826} y={52} w={136} on={on} color={alert ? "#e5383b" : "#34d17a"} />
    </Box>
  );
}

const TABS: { icon: GlyphName; label: string; active?: boolean }[] = [
  { icon: "globe", label: "Horloges" },
  { icon: "alarm", label: "Alarmes", active: true },
  { icon: "timer", label: "Chrono" },
];

function Render() {
  return (
    <>
      <Box w={1000} h={1300} bg="#000" />
      <StatusBar time="05:59" battery={0.08} />

      <Txt x={44} y={92} size={34} weight={600} color={ORANGE}>
        Modifier
      </Txt>
      <Icon name="plus" x={900} y={84} size={58} color={ORANGE} />
      <Txt x={44} y={140} size={96} font="display" color="#fff">
        Alarmes
      </Txt>

      <Row y={270} time="06:00" id="a1" />
      <Row y={456} time="06:05" id="a2" />
      <Row y={642} time="06:10" id="a3" />
      <Row y={828} time="06:15" id="a4" />
      <Row y={1014} time="07:58" text="Cours à 8 h. T'es cuit." alert />

      <Box y={1200} w={1000} h={100} bg="#101014" style={{ borderTop: "2px solid rgba(255,255,255,0.12)" }}>
        {TABS.map((t, i) => (
          <div key={t.label} style={{ position: "absolute", left: 90 + i * 300, top: 8, width: 220, display: "flex", flexDirection: "column", alignItems: "center", fontFamily: FONT.sans, fontWeight: 700, fontSize: 26, color: t.active ? ORANGE : DIM }}>
            <Glyph name={t.icon} inline size={48} color={t.active ? ORANGE : DIM} />
            {t.label}
          </div>
        ))}
      </Box>
    </>
  );
}

const template: MemeTemplate = {
  id: "alarmes-reveil",
  name: "Les alarmes du réveil",
  category: "ecrans",
  width: 1000,
  height: 1300,
  fields: [
    { id: "a1", label: "Alarme de 6 h 00", placeholder: "Aujourd'hui je me lève direct", maxLength: 45 },
    { id: "a2", label: "Alarme de 6 h 05", placeholder: "Encore 5 min, ça compte pas", maxLength: 45 },
    { id: "a3", label: "Alarme de 6 h 10", placeholder: "Bon là c'est la dernière", maxLength: 45 },
    { id: "a4", label: "Alarme de 6 h 15", placeholder: "J'ai juste fermé les yeux 2 secondes", maxLength: 45 },
  ],
  Render,
};

export default template;
