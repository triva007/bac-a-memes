import type { MemeTemplate } from "../../types";
import { Box, Halftone, T, Txt } from "@/components/meme/kit";
import { C } from "@/components/meme/palette";
import { Barcode, Hr } from "../_lot-c-kit";

const W = 840;
const H = 1330;
const INK = "#26263a";

/** bord du bas découpé en dents de scie */
function zigzag(): string {
  const n = 28;
  const pts = ["0 0", "100% 0"];
  for (let i = n; i >= 0; i--) pts.push(`${((i / n) * 100).toFixed(2)}% ${i % 2 ? "100%" : "calc(100% - 22px)"}`);
  return `polygon(${pts.join(", ")})`;
}

const LINES = [
  { id: "l1", price: "−50" },
  { id: "l2", price: "−200" },
  { id: "l3", price: "−999" },
] as const;

function Render() {
  return (
    <>
      <Box x={0} y={0} w={1000} h={1400} bg={`linear-gradient(160deg, ${C.ink3}, ${C.ink})`} />
      <Halftone w={1000} h={1400} color="rgba(255,255,255,0.06)" size={28} />
      <Box x={80} y={36} w={W} h={H} rotate={1} style={{ filter: "drop-shadow(0 18px 22px rgba(0,0,0,0.5))" }}>
        <Box x={0} y={0} w={W} h={H} bg="linear-gradient(180deg, #fbfbf6, #f1f0e8)" style={{ clipPath: zigzag() }} />
        <T text="*** MA JOURNÉE ***" x={40} y={34} w={760} h={84} font="type" max={72} min={40} nowrap color={INK} />
        <Txt x={40} y={124} w={760} size={29} font="type" color={INK} align="center">
          LYCÉE · CAISSE N° 3 · LUNDI 08:02
        </Txt>
        <Txt x={40} y={164} w={760} size={29} font="type" color={INK} align="center">
          Vous avez été servi(e) par : LA VIE
        </Txt>
        <Hr x={40} y={216} w={760} color={INK} thick={4} kind="dashed" />
        <Txt x={40} y={232} size={28} font="type" color={INK}>
          QTÉ  ARTICLE
        </Txt>
        <Txt x={40} y={232} w={760} size={28} font="type" color={INK} align="right">
          AURA
        </Txt>

        {LINES.map((l, i) => {
          const y = 280 + i * 158;
          return (
            <Box key={l.id} x={0} y={y} w={W} h={150}>
              <Txt x={40} y={44} size={52} font="type" color={INK}>
                1×
              </Txt>
              <T id={l.id} x={132} y={4} w={478} h={142} font="type" upper max={60} min={28} lh={1.06} align="left" color={INK} />
              <Txt x={600} y={44} w={200} size={52} font="type" color={INK} align="right">
                {l.price}
              </Txt>
            </Box>
          );
        })}

        <Hr x={40} y={762} w={760} color={INK} thick={4} kind="dashed" />
        <Txt x={40} y={784} size={78} font="type" color={INK}>
          TOTAL
        </Txt>
        <Txt x={40} y={822} w={760} size={25} font="type" color={INK} align="right">
          (TTC : toute tristesse comprise)
        </Txt>
        <T id="total" x={40} y={880} w={760} h={206} font="display" upper max={104} min={40} lh={1.14} color={C.ink} mark={C.yellow} />
        <Hr x={40} y={1104} w={760} color={INK} thick={4} kind="dashed" />
        <Txt x={40} y={1122} w={760} size={34} font="type" color={INK} align="center">
          MERCI DE VOTRE VISITE
        </Txt>
        <Txt x={40} y={1166} w={760} size={26} font="type" color={INK} align="center">
          Ni repris, ni échangé, ni remboursé.
        </Txt>
        <Barcode x={170} y={1210} w={500} h={74} seed={11} color={INK} />
      </Box>
    </>
  );
}

const template: MemeTemplate = {
  id: "ticket-de-caisse",
  name: "Le ticket de caisse",
  category: "affiches",
  width: 1000,
  height: 1400,
  fields: [
    { id: "l1", label: "Article 1", placeholder: "Réveil raté", maxLength: 34 },
    { id: "l2", label: "Article 2", placeholder: "Bus loupé de 3 secondes", maxLength: 34 },
    { id: "l3", label: "Article 3", placeholder: "Interro surprise", maxLength: 34 },
    { id: "total", label: "Total à payer", placeholder: "Je suis cuit", maxLength: 36 },
  ],
  Render,
};

export default template;
