"use client";

/**
 * KIT — FORMATS : papiers (Seyès, copie double), bulles, post-it, ruban adhésif,
 * tampon, traits de stylo, fonds graphiques (rayons, trame, confettis).
 * Les conteneurs (Paper, Seyes, CopieDouble, Bubble, PostIt, Ribbon) ouvrent un
 * repère local : leurs enfants se positionnent depuis leur coin haut-gauche.
 */

import type { CSSProperties, ReactNode } from "react";
import { C, FONT } from "./palette";

interface Pos {
  x?: number;
  y?: number;
  w: number;
  h: number;
}

const PAPER_SHADOW = "0 2px 0 rgba(20,15,30,0.12), 0 14px 26px rgba(20,15,30,0.3)";

// ------------------------------------------------------------------ papiers

export interface PaperProps extends Pos {
  color?: string;
  rotate?: number;
  /** ombre portée (défaut vrai) */
  shadow?: boolean;
  radius?: number;
  clip?: boolean;
  style?: CSSProperties;
  children?: ReactNode;
}

/** Feuille de papier unie avec ombre douce. */
export function Paper({ x = 0, y = 0, w, h, color = "#fdfcf6", rotate, shadow = true, radius = 6, clip, style, children }: PaperProps) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        background: `linear-gradient(180deg, rgba(255,255,255,0.5), rgba(255,255,255,0) 30%), ${color}`,
        borderRadius: radius,
        boxShadow: shadow ? PAPER_SHADOW : undefined,
        transform: rotate ? `rotate(${rotate}deg)` : undefined,
        overflow: clip ? "hidden" : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export interface SeyesProps extends PaperProps {
  /** taille du grand carreau en px (défaut 44) — les interlignes font cell / 4 */
  cell?: number;
  /** position de la marge rouge depuis la gauche, ou null */
  margin?: number | null;
  /** décalage vertical de la première ligne forte */
  top?: number;
  /** trous de perforation à gauche */
  holes?: boolean;
}

function seyesBackground(cell: number, margin: number | null, top: number): CSSProperties {
  const mx = margin ?? 0;
  const layers = [
    margin !== null ? `linear-gradient(90deg, transparent ${mx}px, #ee7f86 ${mx}px, #ee7f86 ${mx + 3}px, transparent ${mx + 3}px)` : null,
    `linear-gradient(#9fb1e4 0, #9fb1e4 2.5px, transparent 2.5px)`,
    `linear-gradient(rgba(159,177,228,0.5) 0, rgba(159,177,228,0.5) 1.5px, transparent 1.5px)`,
    `linear-gradient(90deg, rgba(159,177,228,0.75) 0, rgba(159,177,228,0.75) 2px, transparent 2px)`,
  ].filter(Boolean);
  const sizes = [margin !== null ? "100% 100%" : null, `100% ${cell}px`, `100% ${cell / 4}px`, `${cell}px 100%`].filter(Boolean);
  const pos = [margin !== null ? "0 0" : null, `0 ${top}px`, `0 ${top}px`, `${mx % cell}px 0`].filter(Boolean);
  return {
    backgroundColor: "#fdfdf8",
    backgroundImage: layers.join(", "),
    backgroundSize: sizes.join(", "),
    backgroundPosition: pos.join(", "),
    backgroundRepeat: margin !== null ? "no-repeat, repeat, repeat, repeat" : "repeat",
  };
}

/** Feuille à grands carreaux (réglure Seyès) avec marge rouge. */
export function Seyes({ x = 0, y = 0, w, h, cell = 44, margin = 150, top = 0, holes, rotate, shadow = true, radius = 4, clip, style, children }: SeyesProps) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        ...seyesBackground(cell, margin, top),
        borderRadius: radius,
        boxShadow: shadow ? PAPER_SHADOW : undefined,
        transform: rotate ? `rotate(${rotate}deg)` : undefined,
        overflow: clip ? "hidden" : undefined,
        ...style,
      }}
    >
      {holes
        ? [0.14, 0.38, 0.62, 0.86].map((p) => (
            <div
              key={p}
              style={{
                position: "absolute",
                left: 30,
                top: `calc(${p * 100}% - 15px)`,
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "rgba(40,25,20,0.55)",
                boxShadow: "inset 0 4px 5px rgba(0,0,0,0.5)",
              }}
            />
          ))
        : null}
      {children}
    </div>
  );
}

/** Copie double perforée : Seyès + seconde feuille qui dépasse + pliure à gauche. */
export function CopieDouble({ x = 0, y = 0, w, h, rotate, children, ...rest }: SeyesProps) {
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, transform: rotate ? `rotate(${rotate}deg)` : undefined }}>
      <div style={{ position: "absolute", left: 10, top: 8, width: w, height: h, background: "#f3f1e7", borderRadius: 4, boxShadow: PAPER_SHADOW }} />
      <Seyes w={w} h={h} holes shadow={false} {...rest} style={{ boxShadow: "0 1px 0 rgba(20,15,30,0.15), 3px 3px 0 rgba(20,15,30,0.05)" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 26, background: "linear-gradient(90deg, rgba(20,15,30,0.16), rgba(20,15,30,0))" }} />
        {children}
      </Seyes>
    </div>
  );
}

// ------------------------------------------------------------------ bulles

export type BubbleTail = "bottom-left" | "bottom-right" | "top-left" | "top-right" | "left" | "right" | "none";

export interface BubbleProps extends Pos {
  /** "speech" = parole, "thought" = pensée (nuage + petites bulles) */
  kind?: "speech" | "thought";
  /** côté de la queue ; elle dépasse d'environ 60 px hors de la boîte */
  tail?: BubbleTail;
  fill?: string;
  stroke?: string;
  strokeW?: number;
  children?: ReactNode;
}

/** Bulle de BD (parole ou pensée). Les enfants se placent dans la boîte w × h. */
export function Bubble({ x = 0, y = 0, w, h, kind = "speech", tail = "bottom-left", fill = "#fff", stroke = C.ink, strokeW = 7, children }: BubbleProps) {
  const pad = 80;
  const flipX = tail === "bottom-right" || tail === "top-right" || tail === "right";
  const flipY = tail === "top-left" || tail === "top-right";
  const side = tail === "left" || tail === "right";
  const rad = kind === "thought" ? Math.min(h / 2, 90) : Math.min(46, h / 3);
  let d: string;
  const tx = Math.min(w * 0.22, 150);
  if (kind === "thought" || tail === "none") {
    d = `M${rad},0 H${w - rad} Q${w},0 ${w},${rad} V${h - rad} Q${w},${h} ${w - rad},${h} H${rad} Q0,${h} 0,${h - rad} V${rad} Q0,0 ${rad},0 Z`;
  } else if (side) {
    const ty = h * 0.6;
    d = `M${rad},0 H${w - rad} Q${w},0 ${w},${rad} V${h - rad} Q${w},${h} ${w - rad},${h} H${rad} Q0,${h} 0,${h - rad} V${ty + 26} L-58,${ty + 34} L0,${ty - 26} V${rad} Q0,0 ${rad},0 Z`;
  } else {
    d = `M${rad},0 H${w - rad} Q${w},0 ${w},${rad} V${h - rad} Q${w},${h} ${w - rad},${h} H${tx + 70} L${tx - 26},${h + 62} L${tx + 6},${h} H${rad} Q0,${h} 0,${h - rad} V${rad} Q0,0 ${rad},0 Z`;
  }
  const tr = `translate(${flipX ? w + pad : pad} ${flipY ? h + pad : pad}) scale(${flipX ? -1 : 1} ${flipY ? -1 : 1})`;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h }}>
      <svg aria-hidden width={w + pad * 2} height={h + pad * 2} style={{ position: "absolute", left: -pad, top: -pad, pointerEvents: "none", overflow: "visible" }}>
        <g transform={tr}>
          <path d={d} transform="translate(5 9)" fill="rgba(20,15,30,0.22)" />
          <path d={d} fill={fill} stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round" />
          {kind === "thought" && tail !== "none" ? (
            side ? (
              <>
                <circle cx={-26} cy={h * 0.72} r={19} fill={fill} stroke={stroke} strokeWidth={strokeW} />
                <circle cx={-58} cy={h * 0.84} r={11} fill={fill} stroke={stroke} strokeWidth={strokeW - 1} />
              </>
            ) : (
              <>
                <circle cx={tx + 8} cy={h + 30} r={20} fill={fill} stroke={stroke} strokeWidth={strokeW} />
                <circle cx={tx - 26} cy={h + 62} r={12} fill={fill} stroke={stroke} strokeWidth={strokeW - 1} />
              </>
            )
          ) : null}
        </g>
      </svg>
      <div style={{ position: "absolute", inset: 0 }}>{children}</div>
    </div>
  );
}

// ------------------------------------------------------------------ petits objets de bureau

/** Post-it légèrement décollé. */
export function PostIt({ x = 0, y = 0, w, h, color = C.yellow, rotate = -3, children }: Pos & { color?: string; rotate?: number; children?: ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        background: `linear-gradient(180deg, rgba(0,0,0,0.07) 0, rgba(0,0,0,0) 16%), linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0) 60%), ${color}`,
        boxShadow: "0 22px 22px -14px rgba(20,15,30,0.5), 0 2px 3px rgba(20,15,30,0.2)",
        borderRadius: "3px 3px 22px 3px / 3px 3px 10px 3px",
        transform: `rotate(${rotate}deg)`,
      }}
    >
      {children}
    </div>
  );
}

/** Morceau de ruban adhésif translucide (à poser à cheval sur un papier). */
export function Tape({ x = 0, y = 0, w = 170, h = 50, rotate = -6, color = "rgba(255,244,190,0.72)" }: Partial<Pos> & { rotate?: number; color?: string }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        background: `linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0) 40%), ${color}`,
        boxShadow: "0 2px 4px rgba(20,15,30,0.18)",
        clipPath: "polygon(0 0, 3% 12%, 0 25%, 3% 38%, 0 50%, 3% 62%, 0 75%, 3% 88%, 0 100%, 100% 100%, 97% 88%, 100% 75%, 97% 62%, 100% 50%, 97% 38%, 100% 25%, 97% 12%, 100% 0)",
        transform: `rotate(${rotate}deg)`,
      }}
    />
  );
}

/** Punaise vue de dessus. */
export function Pin({ x = 0, y = 0, size = 46, color = C.redPen }: { x?: number; y?: number; size?: number; color?: string }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 40 40" style={{ position: "absolute", left: x, top: y, overflow: "visible", pointerEvents: "none" }}>
      <ellipse cx={24} cy={27} rx={13} ry={11} fill="rgba(20,15,30,0.3)" />
      <circle cx={20} cy={20} r={14} fill={color} />
      <circle cx={20} cy={20} r={14} fill="rgba(0,0,0,0.12)" />
      <circle cx={18} cy={17} r={10} fill={color} />
      <ellipse cx={14.5} cy={13} rx={4} ry={2.6} fill="rgba(255,255,255,0.65)" transform="rotate(-30 14.5 13)" />
    </svg>
  );
}

export interface StampProps {
  x?: number;
  y?: number;
  /** texte principal (majuscules) */
  text: string;
  /** seconde ligne plus petite */
  sub?: string;
  size?: number;
  color?: string;
  rotate?: number;
}

/** Coup de tampon encreur (double cadre, machine à écrire). */
export function Stamp({ x = 0, y = 0, text, sub, size = 48, color = C.redPen, rotate = -9 }: StampProps) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        padding: `${size * 0.22}px ${size * 0.5}px ${size * 0.1}px`,
        border: `${Math.max(4, size * 0.11)}px solid ${color}`,
        outline: `${Math.max(2, size * 0.04)}px solid ${color}`,
        outlineOffset: Math.max(4, size * 0.09),
        borderRadius: size * 0.2,
        color,
        fontFamily: FONT.type,
        fontSize: size,
        lineHeight: 1.05,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        textAlign: "center",
        whiteSpace: "nowrap",
        transform: `rotate(${rotate}deg)`,
        opacity: 0.86,
        pointerEvents: "none",
      }}
    >
      {text}
      {sub ? <div style={{ fontSize: size * 0.46, letterSpacing: "0.1em", marginTop: size * 0.04 }}>{sub}</div> : null}
    </div>
  );
}

/** Entourage au stylo (ellipse tracée à la main, deux passages). */
export function RedCircle({ x = 0, y = 0, w, h, color = C.redPen, strokeW = 7 }: Pos & { color?: string; strokeW?: number }) {
  const a = w / 2;
  const b = h / 2;
  return (
    <svg aria-hidden width={w} height={h} style={{ position: "absolute", left: x, top: y, overflow: "visible", pointerEvents: "none" }}>
      <ellipse cx={a} cy={b} rx={a} ry={b} fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round" strokeDasharray={`${(a + b) * 2.9} ${(a + b) * 0.4}`} transform={`rotate(-8 ${a} ${b})`} />
      <ellipse cx={a + 3} cy={b + 2} rx={a * 0.96} ry={b * 1.06} fill="none" stroke={color} strokeWidth={strokeW * 0.7} strokeLinecap="round" strokeDasharray={`${(a + b) * 2.2} ${(a + b) * 1.2}`} transform={`rotate(172 ${a} ${b})`} opacity={0.85} />
    </svg>
  );
}

/** Soulignement au stylo, tracé à la main (simple ou double). */
export function Underline({ x = 0, y = 0, w, color = C.redPen, double, strokeW = 6 }: { x?: number; y?: number; w: number; color?: string; double?: boolean; strokeW?: number }) {
  return (
    <svg aria-hidden width={w} height={30} style={{ position: "absolute", left: x, top: y, overflow: "visible", pointerEvents: "none" }}>
      <path d={`M2,8 C${w * 0.3},0 ${w * 0.6},14 ${w - 2},5`} fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round" />
      {double ? <path d={`M${w * 0.06},22 C${w * 0.35},15 ${w * 0.7},27 ${w * 0.96},19`} fill="none" stroke={color} strokeWidth={strokeW * 0.85} strokeLinecap="round" /> : null}
    </svg>
  );
}

// ------------------------------------------------------------------ fonds graphiques

/** Rayons de soleil alternés (fond d'affiche, de podium, de carte). */
export function Sunburst({ x = 0, y = 0, w, h, colors = [C.yellow, "#ffd21f"], rays = 18, cx = 0.5, cy = 0.5, opacity }: Pos & { colors?: [string, string]; rays?: number; cx?: number; cy?: number; opacity?: number }) {
  const a = 360 / (rays * 2);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        opacity,
        background: `repeating-conic-gradient(from 0deg at ${cx * 100}% ${cy * 100}%, ${colors[0]} 0deg ${a}deg, ${colors[1]} ${a}deg ${a * 2}deg)`,
      }}
    />
  );
}

/** Trame de points (effet imprimé / BD). */
export function Halftone({ x = 0, y = 0, w, h, color = "rgba(20,19,43,0.18)", size = 22, opacity }: Pos & { color?: string; size?: number; opacity?: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        opacity,
        backgroundImage: `radial-gradient(${color} 30%, transparent 32%)`,
        backgroundSize: `${size}px ${size}px`,
        pointerEvents: "none",
      }}
    />
  );
}

/** Assombrit les bords (à poser en dernier sur une scène). */
export function Vignette({ x = 0, y = 0, w, h, strength = 0.45, color = "8,6,30" }: Pos & { strength?: number; color?: string }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        background: `radial-gradient(75% 65% at 50% 48%, rgba(${color},0) 55%, rgba(${color},${strength}) 100%)`,
        pointerEvents: "none",
      }}
    />
  );
}

/** Bandeau à extrémités en queue d'aronde (titres d'affiches, podiums). */
export function Ribbon({ x = 0, y = 0, w, h, color = C.pink, rotate, children }: Pos & { color?: string; rotate?: number; children?: ReactNode }) {
  const n = Math.round(h * 0.42);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, transform: rotate ? `rotate(${rotate}deg)` : undefined, filter: "drop-shadow(0 8px 0 rgba(20,15,30,0.28))" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0) 45%, rgba(0,0,0,0.12)), ${color}`,
          clipPath: `polygon(0 0, 100% 0, calc(100% - ${n}px) 50%, 100% 100%, 0 100%, ${n}px 50%)`,
        }}
      />
      <div style={{ position: "absolute", inset: 0 }}>{children}</div>
    </div>
  );
}

/** Suite pseudo-aléatoire déterministe (pure) : n valeurs dans [0, 1[. */
function pseudoRandom(seed: number, n: number): number[] {
  const out: number[] = [];
  let s = (Math.abs(Math.round(seed)) * 9301 + 49297) % 233280;
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280;
    out.push(s / 233280);
  }
  return out;
}

/** Confettis fixes (répartition déterministe selon `seed`). */
export function Confetti({ x = 0, y = 0, w, h, n = 36, seed = 1, colors = [C.yellow, C.pink, C.green, C.blue, C.orange, C.violet] }: Pos & { n?: number; seed?: number; colors?: string[] }) {
  const rnd = pseudoRandom(seed, n * 5);
  const items = [];
  for (let i = 0; i < n; i++) {
    const px = Math.round(rnd[i * 5] * w);
    const py = Math.round(rnd[i * 5 + 1] * h);
    const sz = 10 + Math.round(rnd[i * 5 + 2] * 16);
    const rot = Math.round(rnd[i * 5 + 3] * 180);
    const round = rnd[i * 5 + 4] > 0.7;
    items.push(
      <div
        key={i}
        style={{
          position: "absolute",
          left: px,
          top: py,
          width: round ? sz : sz * 1.7,
          height: round ? sz : sz * 0.6,
          borderRadius: round ? "50%" : 3,
          background: colors[i % colors.length],
          transform: `rotate(${rot}deg)`,
        }}
      />,
    );
  }
  return <div style={{ position: "absolute", left: x, top: y, width: w, height: h, overflow: "hidden", pointerEvents: "none" }}>{items}</div>;
}
