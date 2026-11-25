import type { MemeTemplate } from "../../types";
import { Badge, Box, Emo, Halftone, StatBar, Sunburst, T, Txt } from "@/components/meme/kit";
import { C } from "@/components/meme/palette";

const GOLD = "#ffd76a";

function Render() {
  return (
    <>
      <Box w={1000} h={1300} bg="linear-gradient(150deg, #2a1466 0%, #173a8c 55%, #0f6d8f 100%)" />
      <Halftone w={1000} h={1300} color="rgba(255,255,255,0.07)" size={30} />
      <Box x={28} y={28} w={944} h={1244} radius={48} border={`10px solid ${GOLD}`} bg="linear-gradient(180deg, rgba(10,8,40,0.5), rgba(10,8,40,0.78))" shadow="0 0 0 6px #0b0a1c, inset 0 0 60px rgba(255,215,106,0.18)" />

      <Badge x={64} y={62} bg={GOLD} color={C.ink} size={34}>
        PNJ · Niv. 17
      </Badge>
      <Badge x={640} y={62} bg="rgba(255,255,255,0.12)" color={GOLD} size={34} icon="star" border={`3px solid ${GOLD}`}>
        Légendaire
      </Badge>

      {/* portrait */}
      <Box x={330} y={136} w={340} h={340} radius="50%" clip border={`10px solid ${GOLD}`} bg="#5b2bd6">
        <Sunburst w={340} h={340} colors={["#7b5cff", "#5b2bd6"]} rays={12} />
      </Box>
      <Emo id="neutral-face" x={374} y={182} size={252} />

      <T id="nom" x={70} y={488} w={860} h={112} font="meme" color="#fff" upper max={104} min={42} nowrap />
      <T id="role" x={70} y={600} w={860} h={62} font="display" color={GOLD} max={48} min={26} nowrap />

      {/* stats */}
      <Box x={64} y={682} w={872} h={254} radius={26} bg="rgba(255,255,255,0.07)" />
      <StatBar x={92} y={700} w={816} label="Flemme" value={99} color="linear-gradient(90deg,#ff9a3d,#ff5fa2)" size={40} labelW={300} />
      <StatBar x={92} y={758} w={816} label="Bavardage" value={87} color="linear-gradient(90deg,#5cc8ff,#7b5cff)" size={40} labelW={300} />
      <StatBar x={92} y={816} w={816} label="Ponctualité" value={12} color="#5df2a0" size={40} labelW={300} />
      <StatBar x={92} y={874} w={816} label="Discrétion" value={3} color="#ffe94a" size={40} labelW={300} />

      {/* pouvoir + réplique */}
      <Txt x={70} y={956} size={30} font="display" color={GOLD} ls={0.1}>
        POUVOIR SPÉCIAL
      </Txt>
      <T id="pouvoir" x={70} y={994} w={860} h={104} font="display" color="#fff" max={54} min={30} align="left" valign="top" lh={1.06} />
      <Box x={64} y={1112} w={872} h={126} radius={22} bg="rgba(0,0,0,0.38)" border="3px solid rgba(255,255,255,0.18)" />
      <Txt x={86} y={1098} size={120} font="news" color={GOLD} lh={1.1}>
        “
      </Txt>
      <T id="replique" x={160} y={1118} w={752} h={114} font="hand" color="#fff" max={72} min={36} align="left" lh={0.96} />
    </>
  );
}

const template: MemeTemplate = {
  id: "fiche-pnj",
  name: "La fiche de PNJ",
  category: "affiches",
  width: 1000,
  height: 1300,
  fields: [
    { id: "nom", label: "Nom du PNJ", placeholder: "Théo", maxLength: 20, kind: "name" },
    { id: "role", label: "Son rôle", placeholder: "Vendeur de chewing-gums du fond", maxLength: 38 },
    { id: "pouvoir", label: "Pouvoir spécial", placeholder: "Disparaît dès qu'il faut un volontaire", maxLength: 60 },
    { id: "replique", label: "Sa réplique en boucle", placeholder: "T'as pas un stylo ?", maxLength: 50 },
  ],
  Render,
};

export default template;
