import type { MemeTemplate } from "../../types";
import { Box, Paper, Stamp, T, Txt, WoodTable } from "@/components/meme/kit";
import { C, FONT } from "@/components/meme/palette";
import { Hr, Scribble, Svg } from "../_lot-c-kit";

const ROSE = "#7a1f45";

function Check({ x, y, on, label }: { x: number; y: number; on: boolean; label: string }) {
  return (
    <>
      <Box x={x} y={y} w={40} h={40} border={`4px solid ${ROSE}`} radius={5} bg="rgba(255,255,255,0.55)" />
      {on ? (
        <Svg x={x} y={y} w={40} h={40}>
          <path d="M6,20 L17,33 L44,-6" fill="none" stroke={C.bluePen} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      ) : null}
      <Txt x={x + 54} y={y + 3} size={30} font="type" color={ROSE}>
        {label}
      </Txt>
    </>
  );
}

function Render() {
  return (
    <>
      <WoodTable w={1000} h={1100} tone="dark" />
      <Paper x={45} y={48} w={910} h={1004} color="#ffd6e2" rotate={-1.2} radius={4}>
        {/* talon détachable */}
        <Box x={0} y={0} w={92} h={1004} bg="rgba(160,40,90,0.1)" style={{ borderRight: "5px dashed rgba(122,31,69,0.5)" }} />
        <div
          style={{
            position: "absolute",
            left: 22,
            top: 0,
            width: 48,
            height: 1004,
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            textAlign: "center",
            fontFamily: FONT.type,
            fontSize: 28,
            letterSpacing: "0.12em",
            color: ROSE,
            opacity: 0.75,
            whiteSpace: "nowrap",
          }}
        >
          TALON À CONSERVER (ET À OUBLIER) · N° 0042
        </div>

        <Txt x={128} y={30} size={28} font="type" color={ROSE}>
          LYCÉE · VIE SCOLAIRE
        </Txt>
        <Txt x={128} y={30} w={744} size={28} font="type" color={ROSE} align="right">
          N° 0042
        </Txt>
        <T text="BILLET D'ABSENCE" x={128} y={66} w={744} h={104} font="display" max={96} min={40} nowrap align="left" color={ROSE} />
        <Hr x={128} y={174} w={744} color={ROSE} thick={6} />

        <Txt x={128} y={196} size={30} font="type" color={ROSE}>
          Je soussigné(e), responsable de l&apos;élève :
        </Txt>
        <T id="eleve" x={128} y={236} w={744} h={104} font="hand" color={C.bluePen} weight={700} max={104} min={44} nowrap align="left" valign="bottom" />
        <Hr x={128} y={344} w={744} color={ROSE} thick={4} kind="dotted" />

        <Txt x={128} y={368} size={30} font="type" color={ROSE}>
          certifie qu&apos;il / elle était absent(e) :
        </Txt>
        <Check x={128} y={416} on label="de corps" />
        <Check x={372} y={416} on label="d'esprit" />
        <Check x={608} y={416} on={false} label="exprès" />

        <Txt x={128} y={490} size={44} font="display" color={ROSE}>
          MOTIF :
        </Txt>
        <Box x={128} y={548} w={744} h={246} radius={14} bg="rgba(255,255,255,0.5)" border={`4px solid rgba(122,31,69,0.35)`} />
        <T id="motif" x={150} y={560} w={700} h={222} font="hand" color={C.bluePen} weight={700} max={96} min={40} lh={0.98} align="left" />

        {/* signatures */}
        <Txt x={128} y={818} size={26} font="type" color={ROSE}>
          Signature du responsable
        </Txt>
        <Box x={128} y={854} w={356} h={126} radius={10} border={`4px solid rgba(122,31,69,0.35)`} />
        <T id="signature" x={140} y={858} w={332} h={92} font="hand" color={C.blackPen} weight={700} max={76} min={32} rotate={-4} nowrap />
        <Scribble x={190} y={938} w={230} h={34} color={C.blackPen} strokeW={4} />

        <Txt x={516} y={818} size={26} font="type" color={ROSE}>
          Visa de la vie scolaire
        </Txt>
        <Box x={516} y={854} w={356} h={126} radius={10} border={`4px solid rgba(122,31,69,0.35)`} />
        <Stamp x={540} y={876} text="PAS CRÉDIBLE" size={36} rotate={-7} />
      </Paper>
    </>
  );
}

const template: MemeTemplate = {
  id: "mot-excuse",
  name: "Le mot d'excuse",
  category: "ecole",
  width: 1000,
  height: 1100,
  fields: [
    { id: "eleve", label: "L'absent(e)", placeholder: "Sacha la Marmotte", maxLength: 24, kind: "name" },
    { id: "motif", label: "Motif de l'absence", placeholder: "Son lit l'a pris en otage, il a négocié jusqu'à 11 h", maxLength: 80, multiline: true },
    { id: "signature", label: "Signature (douteuse)", placeholder: "Sa mère (promis)", maxLength: 22 },
  ],
  Render,
};

export default template;
