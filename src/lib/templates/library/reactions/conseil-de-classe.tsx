import type { MemeTemplate } from "../../types";
import { Bubble, Emo, Paper, Room, T, Txt, WallClock, Window } from "@/components/meme/kit";
import { C } from "@/components/meme/palette";
import { Dessin, Perso } from "../_lot-d-kit";

/** Le conseil de classe vu du bout de la table : les profs délibèrent sur un cas. */
function Render() {
  return (
    <>
      <Room w={1000} h={1000} floorY={0.46} wall={["#e9e4f2", "#d6cfe6"]} band="#8f86b8" bandH={0.1} floor="carpet" floorColors={["#5a5378", "#3f3a5c"]} light="none" vignette={0.34} />
      <Window x={36} y={150} w={170} h={200} sky="night" />
      <WallClock x={846} y={196} size={110} time="19:48" />

      {/* le proviseur, au bout */}
      <Perso id="face-with-monocle" x={404} y={250} size={192} corps="#2c2a5a" corpsH={0.7} cravate="#ffe94a" />
      {/* les profs du fond */}
      <Perso id="yawning-face" x={196} y={300} size={178} corps="#3fa987" corpsH={0.9} />
      <Perso id="thinking-face" x={626} y={300} size={178} corps="#d96a8f" corpsH={0.9} />

      {/* la table en perspective */}
      <Dessin w={1000} h={1000}>
        <polygon points="300,470 700,470 1120,1010 -120,1010" fill="#14132b" opacity={0.3} transform="translate(0 16)" />
        <polygon points="300,452 700,452 1120,1010 -120,1010" fill="#c9965c" />
        <polygon points="300,452 700,452 716,472 284,472" fill="rgba(255,255,255,0.28)" />
        {[0.2, 0.4, 0.6, 0.8].map((t) => (
          <line key={t} x1={300 + 400 * t} y1={452} x2={-120 + 1240 * t} y2={1010} stroke="rgba(60,30,10,0.16)" strokeWidth={4} />
        ))}
      </Dessin>

      {/* les profs des côtés */}
      <Perso id="face-with-rolling-eyes" x={28} y={408} size={236} corps="#5a7bd6" corpsH={0.9} />
      <Perso id="unamused-face" x={736} y={408} size={236} corps="#e0a03c" corpsH={0.9} cravate="#7b5cff" />
      <Emo id="hot-beverage" x={270} y={520} size={96} />
      <Emo id="memo" x={622} y={500} size={100} rotate={10} />
      <Emo id="sleeping-face" x={-96} y={640} size={300} rotate={14} />
      <Emo id="zzz" x={150} y={590} size={100} />
      <Emo id="face-exhaling" x={800} y={640} size={300} rotate={-8} />
      <Emo id="hot-beverage" x={690} y={800} size={130} />

      {/* le dossier du jour */}
      <Paper x={268} y={640} w={440} h={300} rotate={-3} color="#f6d98a" radius={12}>
        <div style={{ position: "absolute", left: 24, top: -30, width: 170, height: 40, borderRadius: "12px 12px 0 0", background: "#f6d98a" }} />
        <Txt x={30} y={-26} size={30} font="type" color="#7a5a1c">
          DOSSIER
        </Txt>
        <Txt x={0} y={22} w={440} align="center" size={34} font="type" color="#7a5a1c" ls={0.06}>
          CAS DU JOUR
        </Txt>
        <div style={{ position: "absolute", left: 40, top: 70, width: 360, height: 4, background: "rgba(122,90,28,0.4)" }} />
        <T id="eleve" x={26} y={84} w={388} h={150} font="hand" color={C.bluePen} max={96} min={40} />
        <Txt x={0} y={246} w={440} align="center" size={28} font="type" color={C.redPen} rotate={0}>
          — à traiter avant 20 h —
        </Txt>
      </Paper>

      <Bubble x={210} y={28} w={760} h={176} tail="bottom-left">
        <T id="avis" x={30} y={16} w={700} h={144} font="display" max={62} min={32} lh={1.08} />
      </Bubble>
    </>
  );
}

const template: MemeTemplate = {
  id: "conseil-de-classe",
  name: "Le conseil de classe",
  category: "reactions",
  width: 1000,
  height: 1000,
  fields: [
    { id: "eleve", label: "Le cas étudié", placeholder: "Le fond de la classe", maxLength: 28, kind: "name" },
    { id: "avis", label: "L'avis du conseil", placeholder: "Bon… on met « peut mieux faire » et on passe au suivant ?", maxLength: 80 },
  ],
  Render,
};

export default template;
