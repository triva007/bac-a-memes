import type { ReactNode } from "react";
import type { MemeTemplate } from "../../types";
import { Box, T, Txt } from "@/components/meme/kit";
import { C } from "@/components/meme/palette";
import { Hr, Lbl, Svg } from "../_lot-c-kit";

const DENIM =
  "repeating-linear-gradient(45deg, rgba(255,255,255,0.07) 0 3px, transparent 3px 9px), repeating-linear-gradient(-45deg, rgba(0,0,20,0.12) 0 3px, transparent 3px 9px), linear-gradient(170deg, #3d5f96, #26406f)";

const ROWS = [
  { id: "i1", pct: "80 %" },
  { id: "i2", pct: "15 %" },
  { id: "i3", pct: "5 %" },
] as const;

/** pictogramme d'entretien (dessin original), barré ou non */
function Care({ x, crossed, children }: { x: number; crossed?: boolean; children: ReactNode }) {
  return (
    <Svg x={x} y={872} w={100} h={100}>
      <g fill="none" stroke={C.ink} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round">
        {children}
        {crossed ? <path d="M8,8 L92,92 M92,8 L8,92" strokeWidth={8} /> : null}
      </g>
    </Svg>
  );
}

function Render() {
  return (
    <>
      <Box x={0} y={0} w={1000} h={1280} style={{ background: DENIM }} />
      {/* couture du vêtement */}
      <Hr x={0} y={34} w={1000} color="#e8b24a" thick={6} kind="dashed" />
      <Hr x={0} y={54} w={1000} color="#e8b24a" thick={6} kind="dashed" />

      <Box x={100} y={-8} w={800} h={1220} radius="0 0 20px 20px" bg="linear-gradient(180deg, #e9e6d9 0, #fbfaf4 70px)" shadow="0 16px 26px rgba(0,0,20,0.5)">
        {/* piqûre qui tient l'étiquette */}
        <Hr x={24} y={46} w={752} color="#8a8672" thick={5} kind="dashed" />
        <Lbl x={0} y={92} w={800} size={38} color={C.ink} align="center">
          Composition de
        </Lbl>
        <T id="sujet" x={50} y={144} w={700} h={156} font="display" upper max={112} min={40} lh={1} color={C.ink} />
        <Hr x={50} y={316} w={700} thick={7} />

        {ROWS.map((r, i) => {
          const y = 338 + i * 166;
          return (
            <Box key={r.id} x={0} y={y} w={800} h={160}>
              <Txt x={20} y={22} w={282} size={100} font="meme" color={C.ink} align="right" lh={1.1} style={{ whiteSpace: "nowrap" }}>
                {r.pct}
              </Txt>
              <T id={r.id} x={330} y={6} w={424} h={148} font="display" max={72} min={30} lh={1.04} align="left" color={C.ink} />
            </Box>
          );
        })}

        <Hr x={50} y={846} w={700} thick={7} />
        <Care x={98} crossed>
          <path d="M12,34 L24,86 H76 L88,34 M12,34 Q25,22 38,34 T64,34 T88,34" />
        </Care>
        <Care x={228} crossed>
          <path d="M50,12 L92,88 H8 Z" />
        </Care>
        <Care x={358}>
          <rect x={10} y={10} width={80} height={80} rx={6} />
          <circle cx={50} cy={50} r={28} />
        </Care>
        <Care x={488} crossed>
          <path d="M10,82 H90 V58 Q88,34 60,34 H34 M10,82 Q14,54 40,50 H90" />
        </Care>
        <Care x={618}>
          <circle cx={50} cy={50} r={40} />
          <path d="M34,38 H52 L34,62 H52 M58,52 H70 L58,68 H70" strokeWidth={5} />
        </Care>
        <Txt x={50} y={994} w={700} size={32} font="sans" weight={700} color={C.ink} align="center" lh={1.25}>
          {"Ne pas réveiller avant midi.\nNe pas essorer la veille d'un contrôle."}
        </Txt>
        <Lbl x={0} y={1112} w={800} size={30} color={C.ink3} align="center">
          Fabriqué en salle de perm
        </Lbl>
        <Lbl x={0} y={1154} w={800} size={24} color={C.muted} align="center">
          Taille unique · ne rétrécit pas (hélas)
        </Lbl>
      </Box>
    </>
  );
}

const template: MemeTemplate = {
  id: "etiquette-composition",
  name: "L'étiquette de composition",
  category: "affiches",
  width: 1000,
  height: 1280,
  fields: [
    { id: "sujet", label: "Composition de…", placeholder: "Le fond de la classe", maxLength: 24, kind: "name" },
    { id: "i1", label: "80 % de…", placeholder: "flemme certifiée", maxLength: 28 },
    { id: "i2", label: "15 % de…", placeholder: "excuses bidon", maxLength: 28 },
    { id: "i3", label: "5 % de…", placeholder: "talent (bien caché)", maxLength: 28 },
  ],
  Render,
};

export default template;
