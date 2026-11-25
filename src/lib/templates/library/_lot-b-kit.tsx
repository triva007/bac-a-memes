/**
 * Petites briques du LOT B (« écrans et culture internet ») — SANS hooks ni
 * "use client" : des pictogrammes maison et quelques éléments d'interface
 * génériques (interrupteur, étoiles, pastille de statut, séparateur).
 * Coordonnées en px du canevas virtuel (1000 de large).
 */
import type { CSSProperties, ReactNode } from "react";
import { FONT } from "@/components/meme/palette";

// ------------------------------------------------------------------ pictogrammes

export type GlyphName =
  | "thumb"
  | "reply"
  | "shuffle"
  | "next"
  | "prev"
  | "pause"
  | "chevron"
  | "chevron-down"
  | "clip"
  | "dots"
  | "grid"
  | "download"
  | "tag"
  | "user-plus"
  | "reels"
  | "walk"
  | "at"
  | "timer"
  | "alarm"
  | "globe"
  | "trash"
  | "forward";

const sw = { fill: "none", stroke: "currentColor", strokeWidth: 2.3, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const GLYPHS: Record<GlyphName, ReactNode> = {
  thumb: (
    <>
      <rect x={2.4} y={10.4} width={3.8} height={10.2} rx={1.2} fill="currentColor" />
      <path fill="currentColor" d="M8 20.600V10.300l4.300-7.200c1.600 0 2.600 1.200 2.300 2.800l-.6 3.500h5.300c1.300 0 2.200 1.200 1.900 2.500l-1.600 6.900c-.3 1-1.100 1.800-2.200 1.800H8z" />
    </>
  ),
  reply: <path fill="currentColor" d="M10.200 8.200V4L3 11.200l7.200 7.200v-4.300c5 0 8.300 1.400 10.600 5.100-.5-6.400-4.200-10.600-10.600-11z" />,
  forward: <path fill="currentColor" d="M13.800 8.200V4L21 11.200l-7.200 7.200v-4.300c-5 0-8.300 1.400-10.600 5.100.5-6.400 4.200-10.600 10.600-11z" />,
  shuffle: (
    <>
      <path d="M3 7h3.200c1.800 0 3.100.9 4.100 2.600l3.400 4.800c1 1.700 2.300 2.600 4.100 2.600H21M3 17h3.200c1.400 0 2.500-.6 3.400-1.700M14.200 8.800c.9-1.200 2-1.800 3.600-1.800H21" {...sw} />
      <path d="M18.200 4.200 21 7l-2.800 2.800M18.200 14.200 21 17l-2.800 2.800" {...sw} />
    </>
  ),
  next: (
    <>
      <path fill="currentColor" d="M4.500 4.800v14.400L15.500 12 4.500 4.800z" />
      <rect x={16.800} y={4.800} width={3} height={14.400} rx={1} fill="currentColor" />
    </>
  ),
  prev: (
    <>
      <path fill="currentColor" d="M19.500 4.800v14.400L8.500 12l11-7.200z" />
      <rect x={4.200} y={4.800} width={3} height={14.400} rx={1} fill="currentColor" />
    </>
  ),
  pause: (
    <>
      <rect x={5.500} y={4.500} width={4.600} height={15} rx={1.200} fill="currentColor" />
      <rect x={13.900} y={4.500} width={4.600} height={15} rx={1.200} fill="currentColor" />
    </>
  ),
  chevron: <path d="M9 5l7 7-7 7" {...sw} strokeWidth={2.800} />,
  "chevron-down": <path d="M5 9l7 7 7-7" {...sw} strokeWidth={2.800} />,
  clip: <path d="M20 11.300l-7.900 7.900a5 5 0 0 1-7.100-7.100l8.600-8.600a3.400 3.400 0 0 1 4.800 4.800l-8.500 8.500a1.700 1.700 0 0 1-2.400-2.400l7.700-7.700" {...sw} />,
  dots: (
    <>
      <circle cx={5} cy={12} r={2.100} fill="currentColor" />
      <circle cx={12} cy={12} r={2.100} fill="currentColor" />
      <circle cx={19} cy={12} r={2.100} fill="currentColor" />
    </>
  ),
  grid: (
    <>
      {[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => <rect key={`${r}-${c}`} x={3.500 + c * 6.200} y={3.500 + r * 6.200} width={4.600} height={4.600} rx={0.800} fill="currentColor" />))}
    </>
  ),
  download: (
    <>
      <circle cx={12} cy={12} r={9} {...sw} />
      <path d="M12 7.500v8M8.500 12.500 12 16l3.500-3.500" {...sw} />
    </>
  ),
  tag: (
    <>
      <path d="M4 20.500V7.200L12 3l8 4.200v13.300H4z" {...sw} />
      <circle cx={12} cy={11.500} r={2.600} fill="currentColor" />
      <path fill="currentColor" d="M7.200 20c.500-2.700 2.400-4.200 4.800-4.200s4.300 1.500 4.800 4.200H7.200z" />
    </>
  ),
  "user-plus": (
    <>
      <circle cx={9.500} cy={8.400} r={4} fill="currentColor" />
      <path fill="currentColor" d="M2 20.500c.700-4.200 3.700-6.300 7.500-6.300s6.800 2.100 7.500 6.300H2z" />
      <path d="M19 7.500v6M16 10.500h6" {...sw} strokeWidth={2.600} />
    </>
  ),
  reels: (
    <>
      <rect x={3.500} y={3.500} width={17} height={17} rx={4.500} {...sw} />
      <path fill="currentColor" d="M10 8.600v6.800l5.600-3.400L10 8.600z" />
    </>
  ),
  walk: (
    <>
      <circle cx={13} cy={4.200} r={2.200} fill="currentColor" />
      <path d="M13 8.500l-2.500 5 3 3 .800 5M10.500 13.500 8 21M13 8.500l-4 1.800-1 3.200M13 8.500l3 3 3 .800" {...sw} />
    </>
  ),
  at: (
    <>
      <circle cx={12} cy={12} r={3.800} {...sw} />
      <path d="M15.800 8.500v5c0 1.500 1 2.400 2.300 2.400 1.700 0 2.900-1.700 2.900-4A9 9 0 1 0 17 19.500" {...sw} />
    </>
  ),
  timer: (
    <>
      <circle cx={12} cy={13.500} r={7.500} {...sw} />
      <path d="M12 13.500V9.500M9.500 2.800h5M12 2.800V6" {...sw} />
    </>
  ),
  alarm: (
    <>
      <circle cx={12} cy={13} r={7.500} {...sw} />
      <path d="M12 9v4.300l2.800 1.700M4 6.500 7 3.800M20 6.500l-3-2.700" {...sw} />
    </>
  ),
  globe: (
    <>
      <circle cx={12} cy={12} r={8.800} {...sw} />
      <path d="M3.200 12h17.600M12 3.200c-3 2.600-3 15 0 17.600M12 3.200c3 2.600 3 15 0 17.600" {...sw} strokeWidth={1.900} />
    </>
  ),
  trash: <path d="M4.500 6.500h15M9.500 6.500v-3h5v3M6.500 6.500l1 14h9l1-14M10 10.500v6.500M14 10.500v6.500" {...sw} />,
};

export interface GlyphProps {
  name: GlyphName;
  x?: number;
  y?: number;
  size?: number;
  color?: string;
  /** dans le flux au lieu d'être posé en absolu */
  inline?: boolean;
  style?: CSSProperties;
}

/** Pictogramme d'interface original (tracés maison, viewBox 24) — complète <Icon> du kit. */
export function Glyph({ name, x = 0, y = 0, size = 48, color = "#fff", inline, style }: GlyphProps) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{
        position: inline ? "relative" : "absolute",
        left: inline ? undefined : x,
        top: inline ? undefined : y,
        display: "block",
        flex: "none",
        color,
        pointerEvents: "none",
        ...style,
      }}
    >
      {GLYPHS[name]}
    </svg>
  );
}

// ------------------------------------------------------------------ éléments d'interface

/** Interrupteur à bascule (réglages, alarmes). */
export function Toggle({ x = 0, y = 0, w = 140, on = true, color = "#34d17a", off = "#3b3b47" }: { x?: number; y?: number; w?: number; on?: boolean; color?: string; off?: string }) {
  const h = Math.round(w * 0.58);
  const knob = h - 12;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: h / 2, background: on ? color : off, boxShadow: "inset 0 3px 6px rgba(0,0,0,0.25)", pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 6, left: on ? w - knob - 6 : 6, width: knob, height: knob, borderRadius: "50%", background: "#fff", boxShadow: "0 3px 8px rgba(0,0,0,0.35)" }} />
    </div>
  );
}

const STAR = "m12 2.300 2.900 6.100 6.700.900-4.900 4.700 1.200 6.700L12 17.500l-5.900 3.200 1.200-6.700L2.400 9.300l6.700-.900L12 2.300z";

/** Rangée d'étoiles de notation : `n` pleines sur `of`. */
export function Stars({ x = 0, y = 0, size = 60, n = 1, of = 5, color = "#ffb400", off = "#d9d6cc", gap, inline }: { x?: number; y?: number; size?: number; n?: number; of?: number; color?: string; off?: string; gap?: number; inline?: boolean }) {
  return (
    <div style={{ position: inline ? "relative" : "absolute", left: inline ? undefined : x, top: inline ? undefined : y, display: "flex", gap: gap ?? size * 0.1, flex: "none", pointerEvents: "none" }}>
      {Array.from({ length: of }, (_, i) => (
        <svg key={i} aria-hidden width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", flex: "none" }}>
          <path d={STAR} fill={i < n ? color : off} stroke={i < n ? "rgba(140,90,0,0.35)" : "none"} strokeWidth={0.6} strokeLinejoin="round" />
        </svg>
      ))}
    </div>
  );
}

/** Trait de séparation horizontal. */
export function Rule({ x = 0, y = 0, w, color = "rgba(20,19,43,0.12)", h = 3 }: { x?: number; y?: number; w: number; color?: string; h?: number }) {
  return <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: h, background: color, pointerEvents: "none" }} />;
}

/** Pastille rectangulaire arrondie (statut, puce d'info) — texte fixe. */
export function Chip({ x = 0, y = 0, inline, bg, color = "#fff", size = 30, border, weight = 800, upper, children }: { x?: number; y?: number; inline?: boolean; bg: string; color?: string; size?: number; border?: string; weight?: number; upper?: boolean; children: ReactNode }) {
  return (
    <div
      style={{
        position: inline ? "relative" : "absolute",
        left: inline ? undefined : x,
        top: inline ? undefined : y,
        display: "inline-flex",
        alignItems: "center",
        gap: size * 0.32,
        flex: "none",
        background: bg,
        color,
        border,
        boxSizing: "border-box",
        borderRadius: size * 0.5,
        padding: `${size * 0.26}px ${size * 0.6}px`,
        fontFamily: FONT.sans,
        fontWeight: weight,
        fontSize: size,
        lineHeight: 1.1,
        letterSpacing: upper ? "0.04em" : undefined,
        textTransform: upper ? "uppercase" : undefined,
        whiteSpace: "nowrap",
        pointerEvents: "none",
      }}
    >
      {children}
    </div>
  );
}

/** Rond coloré avec un contenu centré (bouton rond d'interface). */
export function Dot({ x = 0, y = 0, size, bg, inline, shadow, border, children }: { x?: number; y?: number; size: number; bg: string; inline?: boolean; shadow?: string; border?: string; children?: ReactNode }) {
  return (
    <div
      style={{
        position: inline ? "relative" : "absolute",
        left: inline ? undefined : x,
        top: inline ? undefined : y,
        width: size,
        height: size,
        flex: "none",
        borderRadius: "50%",
        background: bg,
        border,
        boxSizing: "border-box",
        boxShadow: shadow,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      {children}
    </div>
  );
}
