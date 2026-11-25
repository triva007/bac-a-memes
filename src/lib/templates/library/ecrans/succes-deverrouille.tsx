import type { MemeTemplate } from "../../types";
import { Avatar, Box, Classroom, Emo, Gauge, IfField, T, Txt, Vignette } from "@/components/meme/kit";
import { FONT } from "@/components/meme/palette";

const GOLD = "#ffcf3f";

function Render() {
  return (
    <>
      {/* la « partie » en cours, assombrie derrière le bandeau */}
      <Classroom w={1000} h={600} floorY={0.7} />
      <Emo id="sleeping-face" x={90} y={330} size={210} />
      <Emo id="yawning-face" x={720} y={350} size={190} />
      <Box w={1000} h={600} bg="rgba(10,8,34,0.6)" />
      <Vignette w={1000} h={600} strength={0.5} />

      {/* joueur */}
      <IfField id="nom">
        <div style={{ position: "absolute", left: 44, top: 26, display: "flex", alignItems: "center", gap: 16 }}>
          <Avatar inline size={66} emoji="video-game" bg="#7b5cff" ring="rgba(255,255,255,0.5)" />
          <T id="nom" flow w={560} h={66} max={46} min={28} font="display" align="left" color="#fff" nowrap />
          <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#5df2a0", boxShadow: "0 0 12px #5df2a0", flex: "none" }} />
        </div>
      </IfField>
      <Txt x={0} y={38} w={956} align="right" size={38} font="display" color={GOLD}>
        +50 XP
      </Txt>

      {/* le bandeau de trophée */}
      <Box x={36} y={112} w={928} h={372} radius={70} bg="linear-gradient(180deg, #34343f, #17171d)" border="4px solid rgba(255,255,255,0.16)" shadow="0 24px 60px rgba(0,0,0,0.6), 0 0 0 10px rgba(255,207,63,0.12)">
        <div style={{ position: "absolute", left: 32, top: 78, width: 208, height: 208, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, #fff3b0, #ffcf3f 45%, #c98a00)", boxShadow: "0 0 0 8px rgba(255,207,63,0.25), 0 0 50px rgba(255,207,63,0.55)" }} />
        <Emo id="trophy" x={58} y={104} size={156} />
        <Emo id="sparkles" x={-26} y={34} size={96} rotate={-12} />
        <Emo id="sparkles" x={196} y={250} size={70} rotate={14} />
        <Txt x={276} y={30} size={35} font="display" color={GOLD} ls={0.08}>
          SUCCÈS DÉVERROUILLÉ
        </Txt>
        <T id="titre" x={276} y={78} w={610} h={134} font="display" max={74} min={36} align="left" color="#fff" lh={1.04} />
        <T id="desc" x={276} y={216} w={610} h={94} font="sans" weight={500} max={40} min={26} align="left" valign="top" color="rgba(255,255,255,0.82)" lh={1.16} />
        <div style={{ position: "absolute", left: 276, top: 314, display: "flex", alignItems: "center", gap: 10, fontFamily: FONT.sans, fontWeight: 700, fontSize: 29, color: "#8fd6ff", whiteSpace: "nowrap" }}>
          <Emo id="gem-stone" inline size={36} shadow={false} />
          Ultra rare · 0,3 % des joueurs
        </div>
      </Box>

      {/* prochain succès */}
      <Txt x={48} y={514} size={30} weight={600} color="rgba(255,255,255,0.78)">
        Prochain succès : « Arriver à l&apos;heure »
      </Txt>
      <Gauge x={660} y={518} w={220} h={30} value={0.04} color="#ff5fa2" />
      <Txt x={896} y={512} size={32} weight={800} color="#fff">
        0 %
      </Txt>
    </>
  );
}

const template: MemeTemplate = {
  id: "succes-deverrouille",
  name: "Succès déverrouillé",
  category: "ecrans",
  width: 1000,
  height: 600,
  fields: [
    { id: "titre", label: "Nom du succès", placeholder: "Dormir les yeux ouverts", maxLength: 40 },
    { id: "desc", label: "Comment on l'obtient", placeholder: "Tenir 2 h de philo sans cligner une seule fois", maxLength: 70 },
    { id: "nom", label: "Joueur (facultatif)", placeholder: "Le PNJ du fond", maxLength: 24, optional: true, kind: "name" },
  ],
  Render,
};

export default template;
