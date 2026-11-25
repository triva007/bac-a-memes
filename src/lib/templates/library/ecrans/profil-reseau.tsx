import type { MemeTemplate } from "../../types";
import { Box, Emo, Icon, StatusBar, T, Txt } from "@/components/meme/kit";
import { FONT } from "@/components/meme/palette";
import { Glyph } from "../_lot-b-kit";

const INK = "#14132b";
const MUTED = "rgba(20,19,43,0.58)";

const STATS = [
  { n: "3", label: "publications" },
  { n: "2", label: "abonnés*" },
  { n: "847", label: "abonnements" },
];

const POSTS = [
  { e: "sleeping-face", bg: "linear-gradient(150deg, #5cc8ff, #7b5cff)", n: "0" },
  { e: "french-fries", bg: "linear-gradient(150deg, #ffe94a, #ff9a3d)", n: "1" },
  { e: "video-game", bg: "linear-gradient(150deg, #ff5fa2, #7b5cff)", n: "2" },
];

function Render() {
  return (
    <>
      <Box w={1000} h={1200} bg="#ffffff" />
      <StatusBar time="23:58" color={INK} />

      {/* barre du haut : pseudo */}
      <Icon name="back" x={22} y={86} size={60} color={INK} />
      <T id="nom" x={96} y={78} w={680} h={76} font="sans" weight={800} max={54} min={30} align="left" color={INK} nowrap />
      <Icon name="bell" x={800} y={90} size={54} color={INK} />
      <Glyph name="dots" x={900} y={90} size={54} color={INK} />

      {/* avatar + compteurs */}
      <div style={{ position: "absolute", left: 40, top: 184, width: 236, height: 236, borderRadius: "50%", background: "conic-gradient(from 210deg, #ffe94a, #ff9a3d, #ff5fa2, #7b5cff, #ffe94a)" }} />
      <div style={{ position: "absolute", left: 50, top: 194, width: 216, height: 216, borderRadius: "50%", background: "#fff" }} />
      <div style={{ position: "absolute", left: 58, top: 202, width: 200, height: 200, borderRadius: "50%", background: "linear-gradient(150deg, #c9f7ff, #5cc8ff)" }} />
      <Emo id="smiling-face-with-sunglasses" x={84} y={228} size={148} />
      {STATS.map((s, i) => (
        <div key={s.label} style={{ position: "absolute", left: 306 + i * 222, top: 210, width: 222, textAlign: "center", fontFamily: FONT.sans, color: INK }}>
          <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 72, lineHeight: 1.05 }}>{s.n}</div>
          <div style={{ fontWeight: 600, fontSize: 30, lineHeight: 1.2 }}>{s.label}</div>
        </div>
      ))}
      <Txt x={306} y={344} w={666} align="center" size={28} weight={500} italic color={MUTED}>
        * sa mère et un robot
      </Txt>

      {/* catégorie + bio */}
      <T id="metier" x={44} y={440} w={912} h={52} font="sans" weight={600} max={38} min={26} align="left" color={MUTED} nowrap />
      <T id="bio" x={44} y={496} w={912} h={196} font="sans" weight={600} max={54} min={30} align="left" valign="top" color={INK} lh={1.16} />

      {/* boutons */}
      <Box x={44} y={712} w={440} h={88} radius={22} bg="#7b5cff">
        <Txt x={0} y={22} w={440} align="center" size={38} weight={800} color="#fff">
          Suivre
        </Txt>
      </Box>
      <Box x={504} y={712} w={340} h={88} radius={22} bg="#ecebf3">
        <Txt x={0} y={22} w={340} align="center" size={38} weight={800} color={INK}>
          Message
        </Txt>
      </Box>
      <Box x={864} y={712} w={92} h={88} radius={22} bg="#ecebf3">
        <Glyph name="user-plus" x={20} y={18} size={52} color={INK} />
      </Box>

      {/* onglets + grille */}
      <Box y={822} w={1000} h={2} bg="rgba(20,19,43,0.12)" />
      <Glyph name="grid" x={139} y={838} size={56} color={INK} />
      <Box x={0} y={904} w={334} h={5} bg={INK} />
      <Glyph name="reels" x={472} y={838} size={56} color="rgba(20,19,43,0.38)" />
      <Glyph name="tag" x={805} y={838} size={56} color="rgba(20,19,43,0.38)" />
      {POSTS.map((p, i) => (
        <Box key={p.e} x={i * 335} y={912} w={330} h={330} bg={p.bg}>
          <Emo id={p.e} x={65} y={40} size={200} />
          <div style={{ position: "absolute", left: 16, top: 232, display: "flex", alignItems: "center", gap: 6, fontFamily: FONT.sans, fontWeight: 800, fontSize: 30, color: "#fff", textShadow: "0 2px 6px rgba(0,0,0,0.45)" }}>
            <Icon name="heart" inline size={34} shadow />
            {p.n}
          </div>
        </Box>
      ))}
    </>
  );
}

const template: MemeTemplate = {
  id: "profil-reseau",
  name: "Le profil",
  category: "ecrans",
  width: 1000,
  height: 1200,
  fields: [
    { id: "nom", label: "À qui est ce profil ?", placeholder: "le.goat.du.fond", maxLength: 24, kind: "name" },
    { id: "metier", label: "Sa catégorie", placeholder: "Dormeur professionnel", maxLength: 32 },
    { id: "bio", label: "Sa bio", placeholder: "Dort en maths, cuisine en EPS.\nAura : en cours de chargement.", maxLength: 110, multiline: true },
  ],
  Render,
};

export default template;
