import type { MemeTemplate } from "../../types";
import { Box, Paper, Stamp, T, Txt, WoodTable } from "@/components/meme/kit";
import { C } from "@/components/meme/palette";

const COL = { mat: 44, eleve: 318, classe: 420, app: 522, end: 956 };
const LINE = "3px solid #14132b";

interface RowDef {
  y: number;
  h: number;
  matiere: string;
  prof: string;
  note: string;
  classe: string;
  /** appréciation pré-remplie, ou id du champ à saisir */
  text?: string;
  field?: string;
}

const ROWS: RowDef[] = [
  { y: 372, h: 186, matiere: "MATHÉMATIQUES", prof: "Mme Tangente", note: "04,5", classe: "11,2", field: "appr1" },
  { y: 558, h: 106, matiere: "PHILOSOPHIE", prof: "M. Doute", note: "08,0", classe: "10,4", text: "Pense, donc dort." },
  { y: 664, h: 106, matiere: "HISTOIRE-GÉO", prof: "Mme Frise", note: "09,5", classe: "12,1", text: "Confond 1789 et son code de casier." },
  { y: 770, h: 106, matiere: "ANGLAIS", prof: "Mrs Teatime", note: "11,0", classe: "12,8", text: "« Yes » n'est pas une rédaction." },
  { y: 876, h: 186, matiere: "E.P.S.", prof: "M. Chrono", note: "06,0", classe: "14,5", field: "appr2" },
];

function Row({ r }: { r: RowDef }) {
  return (
    <>
      <Box x={COL.mat} y={r.y} w={COL.end - COL.mat} h={r.h} border={LINE} style={{ borderTop: "none" }} bg={r.field ? "rgba(255,233,74,0.16)" : undefined} />
      <Box x={COL.eleve} y={r.y} w={3} h={r.h} bg={C.ink} />
      <Box x={COL.classe} y={r.y} w={3} h={r.h} bg={C.ink} />
      <Box x={COL.app} y={r.y} w={3} h={r.h} bg={C.ink} />
      <Txt x={COL.mat + 16} y={r.y + r.h / 2 - 38} size={27} font="display">
        {r.matiere}
      </Txt>
      <Txt x={COL.mat + 16} y={r.y + r.h / 2 + 2} size={25} font="sans" weight={500} color="#5b5a78">
        {r.prof}
      </Txt>
      <Txt x={COL.eleve} y={r.y + r.h / 2 - 26} w={102} align="center" size={42} font="display" color={C.ink}>
        {r.note}
      </Txt>
      <Txt x={COL.classe} y={r.y + r.h / 2 - 22} w={102} align="center" size={34} font="sans" weight={500} color="#5b5a78">
        {r.classe}
      </Txt>
      {r.field ? (
        <T id={r.field} x={COL.app + 20} y={r.y + 8} w={COL.end - COL.app - 36} h={r.h - 16} font="hand" color={C.bluePen} max={66} min={36} align="left" lh={0.98} />
      ) : (
        <T text={r.text} x={COL.app + 20} y={r.y + 6} w={COL.end - COL.app - 36} h={r.h - 12} font="hand" color={C.bluePen} max={44} min={30} align="left" lh={0.98} />
      )}
    </>
  );
}

function Render() {
  return (
    <>
      <WoodTable w={1000} h={1300} />
      <Paper x={20} y={20} w={960} h={1260} radius={8} />

      {/* en-tête */}
      <Box x={44} y={44} w={100} h={100} radius={50} border="5px solid #14132b" />
      <Txt x={44} y={64} w={100} align="center" size={20} font="display" lh={1.08}>
        {"LYCÉE\nDES\nCAUSES"}
      </Txt>
      <Txt x={162} y={46} size={38} font="display">
        LYCÉE DES CAUSES PERDUES
      </Txt>
      <Txt x={162} y={94} size={25} font="sans" weight={500} color="#5b5a78">
        Académie du Bon Courage · Année scolaire 2025-2026
      </Txt>
      <Box x={44} y={160} w={912} h={66} bg={C.ink} radius={6} />
      <Txt x={44} y={171} w={912} align="center" size={38} font="display" color="#fff" ls={0.08}>
        BULLETIN DU 2ᵉ TRIMESTRE
      </Txt>

      {/* élève */}
      <Txt x={48} y={250} size={30} font="sans" weight={700}>
        Élève :
      </Txt>
      <T id="nom" x={158} y={234} w={470} h={66} font="display" max={54} min={26} align="left" nowrap />
      <Box x={158} y={298} w={470} h={3} bg="repeating-linear-gradient(90deg, #14132b 0 8px, transparent 8px 16px)" />
      <Txt x={660} y={240} size={27} font="sans" weight={500}>
        Classe : Terminale B
      </Txt>
      <Txt x={660} y={274} size={27} font="sans" weight={500}>
        Absences : 14 siestes
      </Txt>

      {/* tableau */}
      <Box x={COL.mat} y={316} w={COL.end - COL.mat} h={56} bg={C.ink} />
      <Txt x={COL.mat + 16} y={329} size={25} font="display" color="#fff" ls={0.06}>
        MATIÈRE
      </Txt>
      <Txt x={COL.eleve} y={329} w={102} align="center" size={25} font="display" color="#fff" ls={0.06}>
        ÉLÈVE
      </Txt>
      <Txt x={COL.classe} y={329} w={102} align="center" size={25} font="display" color="#fff" ls={0.06}>
        CLASSE
      </Txt>
      <Txt x={COL.app + 20} y={329} size={25} font="display" color="#fff" ls={0.06}>
        APPRÉCIATION
      </Txt>
      {ROWS.map((r) => (
        <Row key={r.matiere} r={r} />
      ))}

      {/* moyenne générale */}
      <Box x={44} y={1086} w={520} h={170} border="5px solid #14132b" radius={10} bg="#fff" />
      <Txt x={64} y={1102} size={28} font="display" ls={0.05}>
        MOYENNE GÉNÉRALE
      </Txt>
      <T id="moyenne" x={64} y={1134} w={300} h={116} font="hand" color={C.redPen} max={130} min={50} align="center" nowrap lh={0.9} />
      <Txt x={376} y={1150} size={78} font="hand" color={C.redPen}>
        / 20
      </Txt>
      <Txt x={590} y={1092} size={25} font="sans" weight={700}>
        Avis du conseil de classe :
      </Txt>
      <Stamp x={592} y={1140} text="Félicitations" sub="du voisin de table" size={40} rotate={-6} />
    </>
  );
}

const template: MemeTemplate = {
  id: "bulletin",
  name: "Le bulletin",
  category: "ecole",
  width: 1000,
  height: 1300,
  fields: [
    { id: "nom", label: "Nom de l'élève", placeholder: "Kévin du fond", maxLength: 24, kind: "name" },
    { id: "appr1", label: "Appréciation en maths", placeholder: "A trouvé x. Dommage, on cherchait y.", maxLength: 70 },
    { id: "appr2", label: "Appréciation en EPS", placeholder: "Court surtout après le bus.", maxLength: 70 },
    { id: "moyenne", label: "Moyenne générale", placeholder: "4,2", maxLength: 5, kind: "note" },
  ],
  Render,
};

export default template;
