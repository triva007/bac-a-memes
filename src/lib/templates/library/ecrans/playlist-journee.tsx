import type { MemeTemplate } from "../../types";
import { Avatar, Box, Emo, Icon, IfField, StatusBar, T, Txt } from "@/components/meme/kit";
import { Dot, Glyph } from "../_lot-b-kit";

const ACCENT = "#ff5fa2";
const SUB = "rgba(255,255,255,0.62)";

const COVER = [
  { e: "alarm-clock", bg: "linear-gradient(140deg, #ffe94a, #ff9a3d)" },
  { e: "bus", bg: "linear-gradient(140deg, #5cc8ff, #7b5cff)" },
  { e: "sleeping-face", bg: "linear-gradient(140deg, #ff5fa2, #7b5cff)" },
  { e: "french-fries", bg: "linear-gradient(140deg, #5df2a0, #2aa7a0)" },
];

function Track({ y, n, id, artist, time, playing }: { y: number; n: number; id: string; artist: string; time: string; playing?: boolean }) {
  return (
    <Box y={y} w={1000} h={136}>
      {playing ? (
        <svg aria-hidden width={44} height={44} viewBox="0 0 44 44" style={{ position: "absolute", left: 42, top: 44 }}>
          <rect x={2} y={18} width={9} height={24} rx={3} fill={ACCENT} />
          <rect x={17} y={4} width={9} height={38} rx={3} fill={ACCENT} />
          <rect x={32} y={12} width={9} height={30} rx={3} fill={ACCENT} />
        </svg>
      ) : (
        <Txt x={30} y={44} w={68} align="center" size={38} weight={600} color={SUB}>
          {n}
        </Txt>
      )}
      <T id={id} x={122} y={8} w={690} h={78} font="sans" weight={800} max={52} min={30} align="left" valign="bottom" color={playing ? ACCENT : "#fff"} lh={1.1} />
      <Txt x={122} y={91} size={30} weight={500} color={SUB}>
        {artist}
      </Txt>
      <Txt x={812} y={50} w={144} align="right" size={30} weight={500} color={SUB}>
        {time}
      </Txt>
    </Box>
  );
}

function Render() {
  return (
    <>
      <Box w={1000} h={1300} bg="linear-gradient(180deg, #6d3df2 0%, #3a2494 26%, #15122b 50%, #100e22 100%)" />
      <StatusBar time="07:12" />
      <Icon name="back" x={30} y={84} size={58} />
      <Glyph name="dots" x={910} y={86} size={54} />

      {/* pochette en mosaïque */}
      <Box x={60} y={160} w={320} h={320} radius={22} clip shadow="0 22px 50px rgba(0,0,0,0.5)">
        {COVER.map((c, i) => (
          <Box key={c.e} x={(i % 2) * 160} y={Math.floor(i / 2) * 160} w={160} h={160} bg={c.bg}>
            <Emo id={c.e} x={25} y={25} size={110} />
          </Box>
        ))}
      </Box>

      <Txt x={420} y={162} size={27} weight={700} color="rgba(255,255,255,0.75)" ls={0.14}>
        PLAYLIST
      </Txt>
      <Txt x={420} y={202} w={540} size={60} font="display" color="#fff" lh={1.04}>
        La bande-son de ma journée
      </Txt>
      <IfField id="nom">
        <div style={{ position: "absolute", left: 420, top: 346, display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar inline size={56} emoji="headphone" bg="#ffe94a" />
          <T id="nom" flow w={460} h={56} max={40} min={26} font="sans" weight={700} align="left" color="#fff" nowrap />
        </div>
      </IfField>
      <IfField id="nom" not>
        <Txt x={420} y={356} size={34} weight={700} color="#fff">
          par moi, en boucle
        </Txt>
      </IfField>

      <Txt x={420} y={424} size={30} weight={500} color={SUB}>
        4 titres · 8 h 02 de cours
      </Txt>
      <Icon name="heart" x={56} y={540} size={64} color={ACCENT} />
      <Glyph name="download" x={150} y={540} size={64} color={SUB} />
      <Glyph name="user-plus" x={244} y={540} size={64} color={SUB} />
      <Glyph name="shuffle" x={740} y={540} size={64} color={SUB} />
      <Dot x={836} y={512} size={120} bg={ACCENT} shadow="0 10px 24px rgba(255,95,162,0.45)">
        <Icon name="play" inline size={64} color="#14132b" style={{ marginLeft: 8 }} />
      </Dot>

      <Track y={654} n={1} id="t1" artist="Le Réveil feat. La Flemme" time="0:05" playing />
      <Track y={788} n={2} id="t2" artist="DJ Cantine" time="55:00" />
      <Track y={922} n={3} id="t3" artist="Les Profs Absents (live)" time="2:00:00" />
      <Track y={1056} n={4} id="t4" artist="MC Dernier Rang" time="0:01" />

      {/* mini-lecteur */}
      <Box x={18} y={1198} w={964} h={92} radius={22} bg="#4a2fb3" shadow="0 -8px 24px rgba(0,0,0,0.4)">
        <Box x={12} y={12} w={68} h={68} radius={12} bg="linear-gradient(140deg, #ffe94a, #ff9a3d)">
          <Emo id="alarm-clock" x={9} y={9} size={50} shadow={false} />
        </Box>
        <Txt x={98} y={27} size={31} weight={700} color="#fff">
          Sonnerie de 8 h (version longue)
        </Txt>
        <Glyph name="pause" x={880} y={18} size={56} />
        <Box x={12} y={84} w={940} h={5} radius={3} bg="rgba(255,255,255,0.25)" />
        <Box x={12} y={84} w={120} h={5} radius={3} bg="#fff" />
      </Box>
    </>
  );
}

const template: MemeTemplate = {
  id: "playlist-journee",
  name: "La bande-son de ma journée",
  category: "ecrans",
  width: 1000,
  height: 1300,
  fields: [
    { id: "t1", label: "Titre n° 1 (le matin)", placeholder: "Encore 5 minutes (version longue)", maxLength: 42 },
    { id: "t2", label: "Titre n° 2 (en cours)", placeholder: "J'ai pas révisé — freestyle", maxLength: 42 },
    { id: "t3", label: "Titre n° 3 (l'aprèm)", placeholder: "Ça sonne dans combien ?", maxLength: 42 },
    { id: "t4", label: "Titre n° 4 (la sortie)", placeholder: "Vendredi 17 h, la délivrance", maxLength: 42 },
    { id: "nom", label: "Playlist de… (facultatif)", placeholder: "DJ Dernier Rang", maxLength: 24, optional: true, kind: "name" },
  ],
  Render,
};

export default template;
