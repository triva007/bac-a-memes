import type { ReactNode } from "react";
import type { MemeTemplate } from "../../types";
import { Avatar, Badge, Box, Emo, Icon, T, Txt } from "@/components/meme/kit";
import { FONT } from "@/components/meme/palette";

const INK = "#14132b";
const MUTED = "rgba(20,19,43,0.6)";
const NAVY = "#1d2f73";
const ORANGE = "#f08a1c";
const RED = "#e5383b";
const GREEN = "#1f9d57";

function Voeu({ y, n, id, text, sub, color, children }: { y: number; n: number; id?: string; text?: string; sub: string; color: string; children: ReactNode }) {
  return (
    <Box x={30} y={y} w={940} h={234} bg="#fff" radius={28} shadow="0 6px 0 rgba(20,19,43,0.08)" clip>
      <Box w={18} h={234} bg={color} />
      <Txt x={48} y={20} size={28} weight={800} color={MUTED} ls={0.08}>
        VŒU N° {n}
      </Txt>
      <T id={id} text={text} x={48} y={56} w={590} h={118} font="sans" weight={800} max={52} min={30} align="left" color={INK} lh={1.1} />
      <Txt x={48} y={184} size={28} weight={500} color={MUTED}>
        {sub}
      </Txt>
      <Box x={664} y={20} w={2} h={194} bg="rgba(20,19,43,0.1)" />
      <div style={{ position: "absolute", left: 668, top: 0, width: 272, height: 234, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: FONT.sans }}>{children}</div>
    </Box>
  );
}

function Render() {
  return (
    <>
      <Box w={1000} h={1120} bg="#e9edf5" />

      {/* bandeau de la plateforme */}
      <Box w={1000} h={124} bg={`linear-gradient(90deg, ${NAVY}, #2b47a8)`}>
        <Emo id="graduation-cap" x={30} y={22} size={80} />
        <Txt x={128} y={20} size={42} font="display" color="#fff" ls={0.02}>
          MES VŒUX D&apos;ORIENTATION
        </Txt>
        <Txt x={128} y={74} size={29} weight={500} color="rgba(255,255,255,0.8)">
          Phase d&apos;admission · mise à jour chaque matin
        </Txt>
        <Badge x={808} y={36} bg="#ffe94a" color={INK} size={32}>
          Jour 47
        </Badge>
      </Box>

      {/* le candidat */}
      <Box x={30} y={146} w={940} h={130} bg="#fff" radius={28} shadow="0 6px 0 rgba(20,19,43,0.08)">
        <Avatar x={24} y={20} size={90} emoji="anxious-face-with-sweat" bg="#cfe0ff" />
        <Txt x={136} y={16} size={27} weight={800} color={MUTED} ls={0.08}>
          CANDIDAT(E)
        </Txt>
        <T id="nom" x={136} y={48} w={490} h={70} font="display" max={58} min={30} align="left" color={INK} nowrap />
        <Txt x={0} y={30} w={910} align="right" size={28} weight={500} color={MUTED}>
          Dossier n° 847 211
        </Txt>
        <Txt x={0} y={72} w={910} align="right" size={28} weight={700} color={NAVY}>
          Vu 47 fois ce matin
        </Txt>
      </Box>

      <Voeu y={298} n={1} id="voeu1" sub="12 places · 9 847 candidats" color={ORANGE}>
        <Badge inline bg={ORANGE} size={30}>
          En attente
        </Badge>
        <div style={{ fontFamily: FONT.meme, fontSize: 96, lineHeight: 1.05, color: ORANGE, display: "flex", alignItems: "flex-start" }}>
          847<span style={{ fontSize: 46, marginTop: 8, marginLeft: 4 }}>e</span>
        </div>
        <div style={{ fontWeight: 600, fontSize: 27, color: MUTED }}>sur liste d&apos;attente</div>
      </Voeu>

      <Voeu y={554} n={2} id="voeu2" sub="Dossier consulté pendant 4 secondes" color={RED}>
        <div style={{ width: 96, height: 96, borderRadius: "50%", background: RED, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="close" inline size={66} />
        </div>
        <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 50, lineHeight: 1.1, color: RED, letterSpacing: "0.03em" }}>REFUSÉ</div>
      </Voeu>

      <Voeu y={810} n={3} text="Année sabbatique sur le canapé des parents" sub="Tes parents ont été prévenus." color={GREEN}>
        <div style={{ width: 96, height: 96, borderRadius: "50%", background: GREEN, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="check" inline size={66} />
        </div>
        <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 50, lineHeight: 1.1, color: GREEN, letterSpacing: "0.03em" }}>ADMIS(E)</div>
      </Voeu>

      <Txt x={0} y={1066} w={1000} align="center" size={28} weight={500} color={MUTED}>
        Réponse attendue avant ce soir, 23 h 59. Pas de pression.
      </Txt>
    </>
  );
}

const template: MemeTemplate = {
  id: "voeux-orientation",
  name: "Les vœux d'orientation",
  category: "ecole",
  width: 1000,
  height: 1120,
  fields: [
    { id: "nom", label: "Candidat(e)", placeholder: "Le stressé de la classe", maxLength: 26, kind: "name" },
    { id: "voeu1", label: "Vœu n° 1 (en attente)", placeholder: "Licence de sieste appliquée", maxLength: 60 },
    { id: "voeu2", label: "Vœu n° 2 (refusé)", placeholder: "BTS Négociation avec le CPE", maxLength: 60 },
  ],
  Render,
};

export default template;
