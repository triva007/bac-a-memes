import type { MemeTemplate } from "../../types";
import { Box, Emo, Paper, Pin, PostIt, T, Txt } from "@/components/meme/kit";
import { C } from "@/components/meme/palette";

const CORK =
  "radial-gradient(rgba(90,50,20,0.28) 1.6px, transparent 2.2px) 0 0 / 14px 14px, radial-gradient(rgba(255,240,205,0.35) 1.6px, transparent 2.2px) 7px 9px / 18px 18px, radial-gradient(rgba(120,70,30,0.2) 3px, transparent 4px) 3px 5px / 41px 37px, linear-gradient(160deg, #d6a86c, #c4935a)";

function Render() {
  return (
    <>
      {/* cadre bois + liège */}
      <Box x={0} y={0} w={1000} h={1000} bg="linear-gradient(135deg, #a8743f, #7d5229)" />
      <Box x={30} y={30} w={940} h={940} radius={8} style={{ background: CORK }} shadow="inset 0 0 0 4px rgba(60,30,10,0.45), inset 0 10px 24px rgba(40,20,5,0.45)" />

      {/* bandeau du panneau */}
      <Paper x={230} y={56} w={540} h={104} rotate={-1} radius={3}>
        <T text="INFOS DU HALL" x={20} y={8} w={500} h={88} font="meme" max={80} min={40} nowrap color={C.ink} ls={0.03} />
      </Paper>
      <Pin x={238} y={62} size={40} color={C.bluePen} />
      <Pin x={722} y={56} size={40} color={C.bluePen} />

      {/* petites annonces du décor */}
      <Paper x={52} y={628} w={246} h={300} rotate={-4} radius={2}>
        <Txt x={0} y={22} w={246} size={58} font="meme" color={C.redPen} align="center">
          PERDU
        </Txt>
        <Txt x={18} y={98} w={210} size={27} font="sans" align="center" lh={1.2}>
          {"Ma motivation.\nVue pour la dernière fois en septembre."}
        </Txt>
        {/* languettes à détacher */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Box key={i} x={i * 41} y={236} w={41} h={64} style={{ borderLeft: i ? "3px dashed rgba(20,19,43,0.4)" : undefined, borderTop: "3px solid rgba(20,19,43,0.4)" }} />
        ))}
      </Paper>
      <Pin x={150} y={612} size={42} color={C.greenPen} />

      <Paper x={716} y={640} w={236} h={280} color="#e2f3ff" rotate={3.5} radius={2}>
        <Txt x={0} y={24} w={236} size={40} font="display" align="center" color={C.bluePen} lh={1}>
          {"CLUB\nSIESTE"}
        </Txt>
        <Emo id="sleeping-face" x={68} y={112} size={100} />
        <Txt x={10} y={222} w={216} size={25} font="sans" align="center">
          Complet jusqu&apos;en juin
        </Txt>
      </Paper>
      <Pin x={812} y={626} size={42} color={C.orange} />

      {/* les 3 post-its des joueurs */}
      <PostIt x={56} y={190} w={436} h={350} rotate={-3}>
        <T id="p1" x={26} y={56} w={384} h={268} font="hand" weight={700} color={C.ink} max={92} min={36} />
      </PostIt>
      <Pin x={250} y={176} size={50} />
      <PostIt x={512} y={182} w={432} h={350} color="#ff9cc4" rotate={2.5}>
        <T id="p2" x={26} y={56} w={380} h={268} font="hand" weight={700} color={C.ink} max={92} min={36} />
      </PostIt>
      <Pin x={706} y={168} size={50} color={C.violet} />
      <PostIt x={300} y={580} w={410} h={348} color="#8ff0b9" rotate={-1.5}>
        <T id="p3" x={26} y={56} w={358} h={266} font="hand" weight={700} color={C.ink} max={92} min={36} />
      </PostIt>
      <Pin x={482} y={566} size={50} color={C.bluePen} />
    </>
  );
}

const template: MemeTemplate = {
  id: "panneau-affichage",
  name: "Le panneau du hall",
  category: "ecole",
  width: 1000,
  height: 1000,
  fields: [
    { id: "p1", label: "Post-it jaune", placeholder: "Qui a pris mon chargeur ?? Rendez-le, j'ai 2\u00a0%", maxLength: 55, multiline: true },
    { id: "p2", label: "Post-it rose", placeholder: "Le prof de maths est absent (source : j'ai rêvé)", maxLength: 55, multiline: true },
    { id: "p3", label: "Post-it vert", placeholder: "Vends cours de philo jamais ouverts, état neuf", maxLength: 55, multiline: true, optional: true },
  ],
  Render,
};

export default template;
