import type { MemeTemplate } from "../../types";
import { Avatar, Box, Classroom, Emo, Icon, IfField, StatusBar, T, Txt } from "@/components/meme/kit";
import { FONT } from "@/components/meme/palette";
import { Glyph } from "../_lot-b-kit";

const SUB = "rgba(255,255,255,0.62)";

interface ComProps {
  id?: string;
  text?: string;
  pseudo: string;
  meta: string;
  avatar: string;
  avatarBg: string;
  likes: string;
  liked?: boolean;
  pinned?: boolean;
  reply?: boolean;
  maxH: number;
  max: number;
}

/** Un commentaire : avatar, pseudo, texte du joueur, « Répondre », cœur + compteur. */
function Com({ id, text, pseudo, meta, avatar, avatarBg, likes, liked, pinned, reply, maxH, max }: ComProps) {
  const av = reply ? 68 : 88;
  const textW = 928 - (reply ? 108 : 0) - av - 20 - 84 - 20;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 20, marginLeft: reply ? 108 : 0, flex: "none" }}>
      <Avatar inline size={av} emoji={avatar} bg={avatarBg} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: FONT.sans, fontWeight: 700, fontSize: 30, lineHeight: 1.2, color: SUB, whiteSpace: "nowrap" }}>
          {pseudo}
          <span style={{ fontWeight: 500 }}>· {meta}</span>
        </div>
        {pinned ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: FONT.sans, fontWeight: 600, fontSize: 27, lineHeight: 1.25, color: SUB }}>
            <Icon name="pin" inline size={28} color={SUB} /> Épinglé par le créateur
          </div>
        ) : null}
        <T id={id} text={text} flow w={textW} h={maxH} max={max} min={32} font="sans" weight={600} align="left" color="#fff" lh={1.18} />
        <div style={{ marginTop: 6, fontFamily: FONT.sans, fontWeight: 700, fontSize: 28, lineHeight: 1.2, color: SUB }}>Répondre</div>
      </div>
      <div style={{ width: 84, flex: "none", textAlign: "center", fontFamily: FONT.sans, fontWeight: 600, fontSize: 26, color: SUB }}>
        <Icon name="heart" inline size={46} color={liked ? "#ff3b5c" : "rgba(255,255,255,0.7)"} style={{ margin: "8px auto 2px" }} />
        {likes}
      </div>
    </div>
  );
}

function Render() {
  return (
    <>
      {/* la vidéo, réduite en haut pendant qu'on lit les commentaires */}
      <Classroom w={1000} h={340} floorY={0.8} />
      <Emo id="teacher" x={770} y={96} size={200} />
      <Box w={1000} h={340} bg="linear-gradient(180deg, rgba(8,6,30,0.62), rgba(8,6,30,0.38) 45%, rgba(8,6,30,0.7))" />
      <StatusBar time="23:58" />
      <T id="titre" x={40} y={80} w={730} h={196} font="meme" upper outline max={76} min={38} align="left" />

      {/* le panneau des commentaires */}
      <Box y={300} w={1000} h={980} bg="#17171f" radius="46px 46px 0 0" shadow="0 -10px 30px rgba(0,0,0,0.45)" clip>
        <Box x={445} y={16} w={110} h={10} radius={5} bg="rgba(255,255,255,0.28)" />
        <Txt x={0} y={44} w={1000} align="center" size={36} weight={800} color="#fff">
          1 203 commentaires
        </Txt>
        <Icon name="close" x={908} y={40} size={50} color="rgba(255,255,255,0.75)" />
        <Box y={112} w={1000} h={2} bg="rgba(255,255,255,0.1)" />

        <div style={{ position: "absolute", left: 0, top: 116, width: 1000, height: 734, overflow: "hidden" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 28, padding: "26px 36px 0", boxSizing: "border-box" }}>
            <Com id="com" pseudo="le_cpe_te_voit" meta="2 h" avatar="eyes" avatarBg="#ffe94a" likes="12,4 k" liked pinned maxH={165} max={50} />
            <Com id="rep1" reply pseudo="celui_du_fond" meta="1 h" avatar="sleeping-face" avatarBg="#5cc8ff" likes="847" maxH={125} max={46} />
            <IfField id="rep2">
              <Com id="rep2" reply pseudo="la_deleguee_officiel" meta="47 min" avatar="nerd-face" avatarBg="#ff9a3d" likes="2" maxH={125} max={46} />
            </IfField>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: 108, fontFamily: FONT.sans, fontWeight: 700, fontSize: 29, color: SUB, flex: "none" }}>
              <span style={{ width: 50, height: 3, background: SUB, display: "inline-block" }} />
              Afficher 46 autres réponses
              <Glyph name="chevron-down" inline size={32} color={SUB} />
            </div>
            <Com text="Moi je dis rien, mais je sauvegarde la vidéo." pseudo="prof_de_maths_fatigue" meta="12 min" avatar="face-with-monocle" avatarBg="#5df2a0" likes="3 911" maxH={130} max={38} />
            <Com text="Dinguerie. Masterclass." pseudo="un_pnj_du_couloir" meta="3 min" avatar="robot" avatarBg="#ff5fa2" likes="58" maxH={100} max={38} />
          </div>
        </div>

        {/* barre de saisie */}
        <Box y={850} w={1000} h={130} bg="#17171f" style={{ borderTop: "2px solid rgba(255,255,255,0.1)" }}>
          <Avatar x={36} y={24} size={82} emoji="smiling-face-with-sunglasses" bg="#7b5cff" />
          <Box x={140} y={22} w={640} h={86} radius={43} bg="rgba(255,255,255,0.1)">
            <Txt x={34} y={22} size={33} weight={500} color={SUB}>
              Ajouter un commentaire…
            </Txt>
          </Box>
          <Glyph name="at" x={808} y={36} size={58} color="rgba(255,255,255,0.75)" />
          <Icon name="smile" x={892} y={36} size={58} color="rgba(255,255,255,0.75)" />
        </Box>
      </Box>
    </>
  );
}

const template: MemeTemplate = {
  id: "commentaires-video",
  name: "Les commentaires",
  category: "ecrans",
  width: 1000,
  height: 1280,
  fields: [
    { id: "titre", label: "La vidéo", placeholder: "Le prof qui dit « c'est pas noté »", maxLength: 60 },
    { id: "com", label: "Commentaire épinglé", placeholder: "Il a cuisiné toute la classe en une phrase", maxLength: 90 },
    { id: "rep1", label: "1re réponse", placeholder: "Frère on est cuits lundi", maxLength: 70 },
    { id: "rep2", label: "2e réponse", placeholder: "Je note tout pour le conseil de classe", maxLength: 70, optional: true },
  ],
  Render,
};

export default template;
