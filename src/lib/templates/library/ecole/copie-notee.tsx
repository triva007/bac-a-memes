import type { MemeTemplate } from "../../types";
import { CopieDouble, RedCircle, T, Txt, Underline, WoodTable } from "@/components/meme/kit";
import { C } from "@/components/meme/palette";

function Render() {
  return (
    <>
      <WoodTable w={1000} h={1200} tone="dark" />
      <CopieDouble x={36} y={34} w={930} h={1240} cell={46} margin={168} top={12} rotate={-1.2}>
        {/* en-tête de l'élève */}
        <Txt x={196} y={34} size={46} font="hand" color={C.bluePen}>
          Nom :
        </Txt>
        <T id="nom" x={300} y={22} w={312} h={70} font="hand" color={C.bluePen} max={60} min={30} align="left" nowrap />
        <Txt x={196} y={96} size={42} font="hand" color={C.bluePen}>
          Classe : Tle B · 12 janvier
        </Txt>
        <Txt x={196} y={186} w={690} align="center" size={56} font="hand" color={C.bluePen}>
          Devoir surveillé n° 4
        </Txt>
        <Underline x={356} y={248} w={370} color={C.bluePen} strokeW={4} />

        {/* la note */}
        <T id="note" x={662} y={30} w={200} h={112} font="hand" color={C.redPen} max={112} min={50} nowrap rotate={-5} lh={0.9} />
        <RedCircle x={636} y={12} w={254} h={148} />

        {/* question + réponse */}
        <Txt x={196} y={292} size={42} font="hand2" color={C.blackPen}>
          Question 1 : justifiez votre réponse.
        </Txt>
        <T id="reponse" x={196} y={352} w={690} h={330} font="hand" color={C.bluePen} max={84} min={40} align="left" valign="top" lh={1.0} />

        {/* annotations du prof */}
        <Txt x={44} y={368} size={104} font="hand" color={C.redPen} rotate={-8}>
          ?!
        </Txt>
        <Txt x={30} y={560} size={54} font="hand" color={C.redPen} rotate={-6}>
          Hors
        </Txt>
        <Txt x={30} y={606} size={54} font="hand" color={C.redPen} rotate={-6}>
          sujet
        </Txt>
        <Underline x={196} y={700} w={640} double />
        <T id="commentaire" x={196} y={744} w={690} h={300} font="hand" color={C.redPen} max={92} min={42} align="left" valign="top" rotate={-2.5} lh={0.98} />
      </CopieDouble>
    </>
  );
}

const template: MemeTemplate = {
  id: "copie-notee",
  name: "La copie notée",
  category: "ecole",
  width: 1000,
  height: 1200,
  fields: [
    { id: "nom", label: "Nom sur la copie", placeholder: "Léa (je crois)", maxLength: 20, kind: "name" },
    { id: "reponse", label: "Réponse de l'élève", placeholder: "Parce que. Je le sens au fond de moi.", maxLength: 90, multiline: true },
    { id: "note", label: "La note", placeholder: "2/20", maxLength: 6, kind: "note" },
    { id: "commentaire", label: "Commentaire du prof (stylo rouge)", placeholder: "Le point, c'est pour l'encre. Et encore.", maxLength: 80 },
  ],
  Render,
};

export default template;
