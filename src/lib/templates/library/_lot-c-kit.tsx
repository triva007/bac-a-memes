/**
 * Petites primitives du lot C (papiers, affiches, formats à cases).
 * Pas de "use client", pas de hooks : composants purs, utilisables partout.
 */
import type { ReactNode } from "react";
import { C, FONT } from "@/components/meme/palette";

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Calque SVG posé en absolu (repère en px du canevas, déborde librement). */
export function Svg({ x = 0, y = 0, w, h, z, children }: { x?: number; y?: number; w: number; h: number; z?: number; children: ReactNode }) {
  return (
    <svg aria-hidden width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: "absolute", left: x, top: y, overflow: "visible", pointerEvents: "none", zIndex: z }}>
      {children}
    </svg>
  );
}

/** Suite pseudo-aléatoire déterministe : n valeurs dans [0, 1[. */
function lcg(seed: number, n: number): number[] {
  const out: number[] = [];
  let s = (Math.abs(Math.round(seed)) * 9301 + 49297) % 233280;
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280;
    out.push(s / 233280);
  }
  return out;
}

/** Code-barres factice (barres déterministes selon `seed`). */
export function Barcode({ x = 0, y = 0, w, h, seed = 7, color = C.ink }: { x?: number; y?: number; w: number; h: number; seed?: number; color?: string }) {
  const rnd = lcg(seed, 240);
  const bars: ReactNode[] = [];
  let px = 0;
  let i = 0;
  while (px < w - 4 && i < 118) {
    const bw = 3 + Math.round(rnd[i * 2] * 7);
    const gap = 3 + Math.round(rnd[i * 2 + 1] * 5);
    if (px + bw > w) break;
    bars.push(<rect key={i} x={px} y={0} width={bw} height={h} fill={color} />);
    px += bw + gap;
    i++;
  }
  return (
    <Svg x={x} y={y} w={w} h={h}>
      {bars}
    </Svg>
  );
}

/** Flèche tracée à la main (courbe + pointe), en coordonnées du repère courant. */
export function HandArrow({ x1, y1, x2, y2, bend = 0.22, color = C.bluePen, strokeW = 8, head = 30 }: { x1: number; y1: number; x2: number; y2: number; bend?: number; color?: string; strokeW?: number; head?: number }) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const cx = (x1 + x2) / 2 - dy * bend;
  const cy = (y1 + y2) / 2 + dx * bend;
  const ang = Math.atan2(y2 - cy, x2 - cx);
  const a1 = ang + Math.PI - 0.5;
  const a2 = ang + Math.PI + 0.5;
  return (
    <Svg w={10} h={10}>
      <path d={`M${r1(x1)},${r1(y1)} Q${r1(cx)},${r1(cy)} ${r1(x2)},${r1(y2)}`} fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round" />
      <path
        d={`M${r1(x2 + Math.cos(a1) * head)},${r1(y2 + Math.sin(a1) * head)} L${r1(x2)},${r1(y2)} L${r1(x2 + Math.cos(a2) * head)},${r1(y2 + Math.sin(a2) * head)}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Gribouillis de signature (paraphe illisible). */
export function Scribble({ x = 0, y = 0, w, h, color = C.bluePen, strokeW = 5 }: { x?: number; y?: number; w: number; h: number; color?: string; strokeW?: number }) {
  const p = (fx: number, fy: number) => `${r1(fx * w)},${r1(fy * h)}`;
  return (
    <Svg x={x} y={y} w={w} h={h}>
      <path
        d={`M${p(0.02, 0.7)} C${p(0.1, 0.05)} ${p(0.2, 0.0)} ${p(0.18, 0.55)} C${p(0.16, 0.95)} ${p(0.3, 0.2)} ${p(0.36, 0.5)} C${p(0.4, 0.75)} ${p(0.44, 0.3)} ${p(0.5, 0.5)} C${p(0.56, 0.7)} ${p(0.6, 0.25)} ${p(0.68, 0.48)} C${p(0.76, 0.7)} ${p(0.86, 0.4)} ${p(0.98, 0.3)}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeW}
        strokeLinecap="round"
      />
      <path d={`M${p(0.05, 0.95)} C${p(0.35, 0.8)} ${p(0.65, 0.98)} ${p(0.95, 0.82)}`} fill="none" stroke={color} strokeWidth={strokeW * 0.8} strokeLinecap="round" />
    </Svg>
  );
}

/** Trait horizontal (plein, tireté ou pointillé). */
export function Hr({ x = 0, y = 0, w, color = C.ink, thick = 4, kind = "solid" }: { x?: number; y?: number; w: number; color?: string; thick?: number; kind?: "solid" | "dashed" | "dotted" }) {
  return <div style={{ position: "absolute", left: x, top: y, width: w, height: 0, borderTop: `${thick}px ${kind} ${color}`, pointerEvents: "none" }} />;
}

/** Petit libellé d'imprimé administratif (capitales espacées). */
export function Lbl({ x = 0, y = 0, w, size = 24, color = C.muted, align = "left", children }: { x?: number; y?: number; w?: number; size?: number; color?: string; align?: "left" | "center" | "right"; children: ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        fontFamily: FONT.sans,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.1,
        letterSpacing: "0.09em",
        textTransform: "uppercase",
        color,
        textAlign: align,
        whiteSpace: w === undefined ? "nowrap" : "normal",
        pointerEvents: "none",
      }}
    >
      {children}
    </div>
  );
}
