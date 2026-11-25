"use client";

/**
 * KIT — DÉCORS : scènes et mobilier en SVG/CSS originaux (style plat, doux,
 * avec profondeur : mur, sol en perspective, lumière, vignette).
 * Tout est paramétrique : chaque décor remplit la boîte x/y/w/h qu'on lui donne.
 * Les emojis-acteurs se posent PAR-DESSUS (dans le gabarit), le mobilier de
 * premier plan (SchoolDesk…) se pose après l'emoji pour le masquer en partie.
 */

import { useId, type CSSProperties, type ReactNode } from "react";
import { FONT } from "./palette";

const r1 = (n: number) => Math.round(n * 10) / 10;

function useUid(): string {
  return "d" + useId().replace(/[^a-zA-Z0-9]/g, "");
}

interface Pos {
  x?: number;
  y?: number;
  w: number;
  h: number;
}

function Svg({ x = 0, y = 0, w, h, children, style }: Pos & { children: ReactNode; style?: CSSProperties }) {
  return (
    <svg
      aria-hidden
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ position: "absolute", left: x, top: y, display: "block", overflow: "hidden", pointerEvents: "none", ...style }}
    >
      {children}
    </svg>
  );
}

// ------------------------------------------------------------------ pièce générique

export interface RoomProps extends Pos {
  /** hauteur de la ligne de sol, en fraction de h (défaut 0.7) */
  floorY?: number;
  /** dégradé du mur [haut, bas] */
  wall?: [string, string];
  /** couleur du soubassement (bande basse du mur) ou null */
  band?: string | null;
  /** hauteur du soubassement en fraction de h */
  bandH?: number;
  /** type de sol */
  floor?: "lino" | "wood" | "tiles" | "carpet";
  /** dégradé du sol [fond, premier plan] */
  floorColors?: [string, string];
  /** rais de lumière venant d'une fenêtre hors champ */
  light?: "left" | "right" | "none";
  /** force de la vignette sombre (0..1) */
  vignette?: number;
  children?: ReactNode;
}

/** Pièce vue de face : mur dégradé + soubassement + plinthe + sol en perspective + lumière. */
export function Room({
  x,
  y,
  w,
  h,
  floorY = 0.7,
  wall = ["#f8eed8", "#f0dfbd"],
  band = "#a9cfc6",
  bandH = 0.17,
  floor = "lino",
  floorColors = ["#cdb898", "#b39a78"],
  light = "left",
  vignette = 0.22,
  children,
}: RoomProps) {
  const id = useUid();
  const fy = r1(h * floorY);
  const fh = h - fy;
  const bh = r1(h * bandH);
  const lines: ReactNode[] = [];
  const n = 9;
  const step = w / 6.5;
  for (let i = -n; i <= n; i++) {
    const xt = r1(w / 2 + i * step * 0.6);
    const xb = r1(w / 2 + i * step * 1.25);
    if (floor === "wood" && i % 2 === 0) {
      const xt2 = r1(w / 2 + (i + 1) * step * 0.6);
      const xb2 = r1(w / 2 + (i + 1) * step * 1.25);
      lines.push(
        <polygon key={`p${i}`} points={`${xt},${fy} ${xt2},${fy} ${xb2},${h} ${xb},${h}`} fill="rgba(255,255,255,0.07)" />,
      );
    }
    if (floor !== "carpet")
      lines.push(<line key={`l${i}`} x1={xt} y1={fy} x2={xb} y2={h} stroke="rgba(30,20,10,0.13)" strokeWidth={2.5} />);
  }
  if (floor === "lino" || floor === "tiles") {
    [0.1, 0.26, 0.5, 0.82].forEach((t, i) => {
      const yy = r1(fy + fh * t);
      lines.push(<line key={`h${i}`} x1={0} y1={yy} x2={w} y2={yy} stroke="rgba(30,20,10,0.12)" strokeWidth={2 + i} />);
    });
  }
  const lx = light === "right" ? -1 : 1;
  const beam = (a: number, b: number, o: number) => {
    const p = [
      [w * a, 0],
      [w * b, 0],
      [w * (b + 0.42), h],
      [w * (a + 0.42), h],
    ]
      .map(([px, py]) => `${r1(lx === 1 ? px : w - px)},${py}`)
      .join(" ");
    return <polygon points={p} fill={`rgba(255,250,225,${o})`} />;
  };
  return (
    <div style={{ position: "absolute", left: x ?? 0, top: y ?? 0, width: w, height: h, overflow: "hidden" }}>
      <Svg w={w} h={h}>
        <defs>
          <linearGradient id={`${id}w`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={wall[0]} />
            <stop offset="1" stopColor={wall[1]} />
          </linearGradient>
          <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={floorColors[0]} />
            <stop offset="1" stopColor={floorColors[1]} />
          </linearGradient>
          <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(20,15,30,0.28)" />
            <stop offset="1" stopColor="rgba(20,15,30,0)" />
          </linearGradient>
          <radialGradient id={`${id}v`} cx="0.5" cy="0.45" r="0.75">
            <stop offset="0.55" stopColor="rgba(20,19,43,0)" />
            <stop offset="1" stopColor={`rgba(20,19,43,${vignette})`} />
          </radialGradient>
        </defs>
        <rect width={w} height={fy} fill={`url(#${id}w)`} />
        {band ? (
          <>
            <rect y={fy - bh} width={w} height={bh} fill={band} />
            <rect y={fy - bh} width={w} height={7} fill="rgba(255,255,255,0.35)" />
            <rect y={fy - bh + 7} width={w} height={4} fill="rgba(20,19,43,0.12)" />
          </>
        ) : null}
        <rect y={fy - 14} width={w} height={14} fill="rgba(40,30,40,0.34)" />
        <rect y={fy} width={w} height={fh} fill={`url(#${id}f)`} />
        {lines}
        <rect y={fy} width={w} height={Math.min(36, fh)} fill={`url(#${id}s)`} />
        {light !== "none" ? (
          <>
            {beam(-0.05, 0.13, 0.2)}
            {beam(0.17, 0.26, 0.13)}
          </>
        ) : null}
        <rect width={w} height={h} fill={`url(#${id}v)`} />
      </Svg>
      {children}
    </div>
  );
}

// ------------------------------------------------------------------ mobilier

export interface BlackboardProps extends Pos {
  color?: "green" | "black";
  /** rigole à craies sous le tableau (dépasse de 26 px vers le bas) */
  tray?: boolean;
  /** enfants posés SUR l'ardoise : repère local = surface (w − 36) × (h − 36) */
  children?: ReactNode;
}

/** Tableau d'école avec cadre en bois, traces de craie et rigole. */
export function Blackboard({ x = 0, y = 0, w, h, color = "green", tray = true, children }: BlackboardProps) {
  const surface =
    color === "green"
      ? "radial-gradient(130% 100% at 28% 18%, #3f8468 0%, #2d6a53 52%, #214d3c 100%)"
      : "radial-gradient(130% 100% at 28% 18%, #3b3f4c 0%, #2a2d37 52%, #1a1c23 100%)";
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: 12,
        background: "linear-gradient(180deg, #cf9a63 0%, #b47c45 100%)",
        boxShadow: "0 12px 0 rgba(40,25,15,0.2), 0 22px 34px rgba(30,20,20,0.28)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 18,
          borderRadius: 4,
          background: surface,
          boxShadow: "inset 0 0 0 3px rgba(0,0,0,0.25), inset 0 12px 30px rgba(0,0,0,0.25)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(104deg, transparent 18%, rgba(255,255,255,0.06) 24%, transparent 33%, transparent 58%, rgba(255,255,255,0.05) 66%, transparent 74%), radial-gradient(60% 40% at 78% 82%, rgba(255,255,255,0.07), transparent 70%)",
          }}
        />
      </div>
      {tray ? (
        <div
          style={{
            position: "absolute",
            left: "5%",
            right: "5%",
            bottom: -26,
            height: 26,
            borderRadius: "0 0 8px 8px",
            background: "linear-gradient(180deg, #a36c38 0%, #c08a52 30%, #a87240 100%)",
            boxShadow: "0 8px 12px rgba(30,20,20,0.3)",
          }}
        >
          <div style={{ position: "absolute", left: "8%", top: -9, width: 54, height: 13, borderRadius: 4, background: "#fbfaf2", transform: "rotate(-3deg)" }} />
          <div style={{ position: "absolute", left: "17%", top: -8, width: 38, height: 12, borderRadius: 4, background: "#ffd84a", transform: "rotate(4deg)" }} />
          <div style={{ position: "absolute", left: "24%", top: -8, width: 30, height: 12, borderRadius: 4, background: "#ff8fb6" }} />
          <div style={{ position: "absolute", right: "8%", top: -30, width: 110, height: 34, borderRadius: 6, background: "linear-gradient(180deg,#8a5a2b 0 45%, #d9d3c4 45% 100%)", boxShadow: "0 3px 0 rgba(0,0,0,0.2)" }} />
        </div>
      ) : null}
      <div style={{ position: "absolute", left: 18, top: 18, right: 18, bottom: 18 }}>{children}</div>
    </div>
  );
}

/** Table d'élève vue de face (plateau bois, casier métal, pieds). h ≈ 0.62 × w si omis. */
export function SchoolDesk({ x = 0, y = 0, w, h, tone = "#e9c48d" }: Partial<Pos> & { w: number; tone?: string }) {
  const H = h ?? Math.round(w * 0.62);
  return (
    <Svg x={x} y={y} w={w} h={H} style={{ overflow: "visible" }}>
      <ellipse cx={w / 2} cy={H * 0.98} rx={w * 0.5} ry={H * 0.07} fill="rgba(20,15,30,0.22)" />
      <rect x={w * 0.09} y={H * 0.3} width={w * 0.045} height={H * 0.68} rx={5} fill="#5c6f7a" />
      <rect x={w * 0.865} y={H * 0.3} width={w * 0.045} height={H * 0.68} rx={5} fill="#5c6f7a" />
      <rect x={w * 0.06} y={H * 0.93} width={w * 0.11} height={H * 0.06} rx={5} fill="#3f4f58" />
      <rect x={w * 0.83} y={H * 0.93} width={w * 0.11} height={H * 0.06} rx={5} fill="#3f4f58" />
      <rect x={w * 0.11} y={H * 0.28} width={w * 0.78} height={H * 0.2} rx={6} fill="#7d939f" />
      <rect x={w * 0.14} y={H * 0.31} width={w * 0.72} height={H * 0.12} rx={4} fill="#4d5f69" />
      <polygon points={`${w * 0.07},0 ${w * 0.93},0 ${w},${H * 0.2} 0,${H * 0.2}`} fill={tone} />
      <polygon points={`${w * 0.07},0 ${w * 0.93},0 ${w * 0.95},${H * 0.05} ${w * 0.05},${H * 0.05}`} fill="rgba(255,255,255,0.3)" />
      <rect x={0} y={H * 0.2} width={w} height={H * 0.085} rx={5} fill="#c4935a" />
      <rect x={0} y={H * 0.2} width={w} height={H * 0.025} fill="rgba(255,255,255,0.25)" />
    </Svg>
  );
}

/** Horloge murale ronde. `time` au format "HH:MM". */
export function WallClock({ x = 0, y = 0, size, time = "08:00", rim = "#14132b" }: { x?: number; y?: number; size: number; time?: string; rim?: string }) {
  const [hh, mm] = time.split(":").map((v) => parseInt(v, 10) || 0);
  const c = size / 2;
  const am = (mm / 60) * 360;
  const ah = (((hh % 12) + mm / 60) / 12) * 360;
  const ticks = [];
  for (let i = 0; i < 12; i++) {
    ticks.push(
      <rect
        key={i}
        x={c - size * 0.012}
        y={size * 0.11}
        width={size * 0.024}
        height={i % 3 === 0 ? size * 0.09 : size * 0.05}
        fill="#14132b"
        transform={`rotate(${i * 30} ${c} ${c})`}
      />,
    );
  }
  return (
    <Svg x={x} y={y} w={size} h={size} style={{ overflow: "visible" }}>
      <circle cx={c + size * 0.03} cy={c + size * 0.05} r={c} fill="rgba(20,15,30,0.22)" />
      <circle cx={c} cy={c} r={c} fill={rim} />
      <circle cx={c} cy={c} r={c * 0.86} fill="#fdfbf3" />
      {ticks}
      <rect x={c - size * 0.022} y={c - size * 0.24} width={size * 0.044} height={size * 0.27} rx={size * 0.02} fill="#14132b" transform={`rotate(${r1(ah)} ${c} ${c})`} />
      <rect x={c - size * 0.015} y={c - size * 0.36} width={size * 0.03} height={size * 0.4} rx={size * 0.015} fill="#14132b" transform={`rotate(${r1(am)} ${c} ${c})`} />
      <circle cx={c} cy={c} r={size * 0.045} fill="#e5383b" />
    </Svg>
  );
}

export interface WindowProps extends Pos {
  sky?: "day" | "night" | "rain" | "sunset";
  /** nombre de vantaux */
  panes?: number;
}

/** Fenêtre avec ciel (jour, nuit, pluie, coucher de soleil), montants blancs et appui. */
export function Window({ x = 0, y = 0, w, h, sky = "day", panes = 2 }: WindowProps) {
  const id = useUid();
  const f = 14;
  const stops: Record<string, [string, string]> = {
    day: ["#7cc6f5", "#d9f1ff"],
    night: ["#0d1238", "#27306e"],
    rain: ["#77879b", "#b7c2cf"],
    sunset: ["#ff9d6c", "#ffe1a8"],
  };
  const [c0, c1] = stops[sky];
  const mull = [];
  for (let i = 1; i < panes; i++) mull.push(<rect key={i} x={r1((w / panes) * i - f / 2)} y={0} width={f} height={h} fill="#f6f2e8" />);
  return (
    <Svg x={x} y={y} w={w} h={h + 18} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`${id}k`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c0} />
          <stop offset="1" stopColor={c1} />
        </linearGradient>
        <clipPath id={`${id}c`}>
          <rect x={f} y={f} width={w - 2 * f} height={h - 2 * f} />
        </clipPath>
      </defs>
      <rect x={-4} y={4} width={w + 8} height={h + 6} rx={8} fill="rgba(20,15,30,0.18)" />
      <rect width={w} height={h} rx={8} fill="#f6f2e8" />
      <rect x={f} y={f} width={w - 2 * f} height={h - 2 * f} fill={`url(#${id}k)`} />
      <g clipPath={`url(#${id}c)`}>
        {sky === "day" || sky === "sunset" ? (
          <>
            <ellipse cx={w * 0.3} cy={h * 0.34} rx={w * 0.17} ry={h * 0.07} fill="rgba(255,255,255,0.9)" />
            <ellipse cx={w * 0.4} cy={h * 0.29} rx={w * 0.12} ry={h * 0.07} fill="rgba(255,255,255,0.9)" />
            <ellipse cx={w * 0.74} cy={h * 0.56} rx={w * 0.15} ry={h * 0.06} fill="rgba(255,255,255,0.75)" />
            {sky === "sunset" ? <circle cx={w * 0.7} cy={h * 0.8} r={w * 0.16} fill="#ffd166" /> : null}
          </>
        ) : null}
        {sky === "night" ? (
          <>
            <circle cx={w * 0.68} cy={h * 0.3} r={w * 0.13} fill="#fff3c2" />
            <circle cx={w * 0.62} cy={h * 0.27} r={w * 0.11} fill="#141a4a" opacity={0.55} />
            {[
              [0.2, 0.2, 5],
              [0.34, 0.5, 4],
              [0.15, 0.7, 3.5],
              [0.82, 0.62, 4],
              [0.5, 0.16, 3.5],
              [0.44, 0.78, 3],
              [0.88, 0.18, 3],
            ].map(([sx, sy, sr], i) => (
              <circle key={i} cx={w * sx} cy={h * sy} r={sr} fill="#fff" opacity={0.9} />
            ))}
          </>
        ) : null}
        {sky === "rain"
          ? Array.from({ length: 16 }, (_, i) => {
              const rx = ((i * 137) % 100) / 100;
              const ry = ((i * 61) % 100) / 100;
              return <line key={i} x1={w * rx} y1={h * ry} x2={w * rx - 10} y2={h * ry + 34} stroke="rgba(255,255,255,0.75)" strokeWidth={4} strokeLinecap="round" />;
            })
          : null}
        <polygon points={`${w * 0.12},${f} ${w * 0.3},${f} ${w * 0.08},${h} ${-w * 0.1},${h}`} fill="rgba(255,255,255,0.16)" />
      </g>
      {mull}
      <rect x={f} y={r1(h * 0.46)} width={w - 2 * f} height={f * 0.7} fill="#f6f2e8" />
      <rect x={-12} y={h - 4} width={w + 24} height={20} rx={5} fill="#e4dccb" />
      <rect x={-12} y={h + 10} width={w + 24} height={6} rx={3} fill="rgba(20,15,30,0.2)" />
    </Svg>
  );
}

export interface LockersProps extends Pos {
  /** nombre de casiers */
  n?: number;
  colors?: string[];
}

/** Rangée de casiers de couloir (aérations, poignée, numéro). */
export function Lockers({ x = 0, y = 0, w, h, n = 6, colors = ["#3aa6a0", "#f2a23c", "#3aa6a0", "#e56a54"] }: LockersProps) {
  const lw = w / n;
  const items = [];
  for (let i = 0; i < n; i++) {
    const lx = r1(i * lw);
    const col = colors[i % colors.length];
    items.push(
      <g key={i}>
        <rect x={lx + 2} y={0} width={lw - 4} height={h - 14} rx={6} fill={col} />
        <rect x={lx + 2} y={0} width={(lw - 4) * 0.22} height={h - 14} rx={6} fill="rgba(255,255,255,0.14)" />
        <rect x={lx + lw - 16} y={0} width={14} height={h - 14} rx={6} fill="rgba(20,15,30,0.14)" />
        {[0, 1, 2].map((k) => (
          <rect key={k} x={lx + lw * 0.24} y={h * 0.08 + k * h * 0.045} width={lw * 0.52} height={h * 0.018} rx={3} fill="rgba(20,15,30,0.45)" />
        ))}
        <rect x={lx + lw * 0.3} y={h * 0.25} width={lw * 0.4} height={h * 0.07} rx={4} fill="#fbf7ec" />
        <text x={lx + lw / 2} y={h * 0.305} textAnchor="middle" fontSize={h * 0.055} fontFamily={FONT.display} fontWeight={800} fill="#14132b">
          {String(101 + i * 3)}
        </text>
        <rect x={lx + lw * 0.74} y={h * 0.46} width={lw * 0.09} height={h * 0.11} rx={4} fill="#e8e3d6" />
        <circle cx={lx + lw * 0.785} cy={h * 0.6} r={lw * 0.035} fill="#14132b" opacity={0.5} />
      </g>,
    );
  }
  return (
    <Svg x={x} y={y} w={w} h={h}>
      <rect width={w} height={h - 14} fill="#22223a" opacity={0.25} />
      {items}
      <rect y={h - 14} width={w} height={14} fill="#2f3044" />
    </Svg>
  );
}

/** Plateau de table en bois vu de dessus (fond pour poser copies, bulletins, carnets). */
export function WoodTable({ x = 0, y = 0, w, h, tone = "warm" }: Pos & { tone?: "warm" | "dark" | "grey" }) {
  const base = tone === "dark" ? ["#6d4a33", "#553726"] : tone === "grey" ? ["#b9bcc7", "#9a9eac"] : ["#d9a871", "#c48f57"];
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        overflow: "hidden",
        background: `repeating-linear-gradient(92deg, rgba(60,30,10,0.08) 0 3px, transparent 3px 46px, rgba(255,255,255,0.06) 46px 49px, transparent 49px 97px), repeating-linear-gradient(180deg, transparent 0 236px, rgba(50,25,10,0.3) 236px 240px), linear-gradient(170deg, ${base[0]}, ${base[1]})`,
      }}
    >
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(90% 70% at 50% 40%, rgba(255,240,210,0.16), rgba(20,10,10,0.3) 100%)" }} />
    </div>
  );
}

// ------------------------------------------------------------------ scènes prêtes à l'emploi

export interface SceneProps extends Pos {
  /** ligne de sol en fraction de h */
  floorY?: number;
  children?: ReactNode;
}

/** Salle de classe : mur crème, soubassement vert d'eau, lino, lumière de fenêtre. Ajouter <Blackboard>, <SchoolDesk>… */
export function Classroom({ x, y, w, h, floorY = 0.72, children }: SceneProps) {
  return (
    <Room x={x} y={y} w={w} h={h} floorY={floorY} wall={["#fbf1dc", "#f1e0be"]} band="#a5cdc4" floor="lino" floorColors={["#cbb693", "#ae9471"]} light="left">
      {children}
    </Room>
  );
}

/** Couloir du lycée : casiers colorés, carrelage, panneau d'affichage, néons. */
export function Corridor({ x, y, w, h, floorY = 0.74, children }: SceneProps) {
  const fy = h * floorY;
  const lh = Math.round(h * 0.44);
  return (
    <Room x={x} y={y} w={w} h={h} floorY={floorY} wall={["#e6eef2", "#d3e0e6"]} band={null} floor="tiles" floorColors={["#b9c0c9", "#8e97a5"]} light="none" vignette={0.3}>
      <Svg w={w} h={h}>
        <rect x={w * 0.08} y={0} width={w * 0.3} height={h * 0.035} rx={6} fill="#fffbe6" />
        <rect x={w * 0.62} y={0} width={w * 0.3} height={h * 0.035} rx={6} fill="#fffbe6" />
        <polygon points={`${w * 0.08},${h * 0.035} ${w * 0.38},${h * 0.035} ${w * 0.46},${fy} ${w * 0.0},${fy}`} fill="rgba(255,252,220,0.1)" />
        <polygon points={`${w * 0.62},${h * 0.035} ${w * 0.92},${h * 0.035} ${w},${fy} ${w * 0.54},${fy}`} fill="rgba(255,252,220,0.1)" />
        <rect x={w * 0.36} y={h * 0.07} width={w * 0.28} height={h * 0.17} rx={8} fill="#b9814a" />
        <rect x={w * 0.36 + 10} y={h * 0.07 + 10} width={w * 0.28 - 20} height={h * 0.17 - 20} rx={4} fill="#d8a56a" />
        <rect x={w * 0.385} y={h * 0.095} width={w * 0.07} height={h * 0.09} fill="#fff" transform={`rotate(-4 ${w * 0.42} ${h * 0.14})`} />
        <rect x={w * 0.47} y={h * 0.1} width={w * 0.06} height={h * 0.07} fill="#ffe94a" transform={`rotate(3 ${w * 0.5} ${h * 0.13})`} />
        <rect x={w * 0.545} y={h * 0.095} width={w * 0.065} height={h * 0.1} fill="#ffd0e2" transform={`rotate(-2 ${w * 0.58} ${h * 0.14})`} />
        <circle cx={w * 0.42} cy={h * 0.1} r={6} fill="#e5383b" />
        <circle cx={w * 0.5} cy={h * 0.105} r={6} fill="#2338a8" />
        <circle cx={w * 0.578} cy={h * 0.1} r={6} fill="#1f8a4c" />
      </Svg>
      <Lockers x={0} y={Math.round(fy - lh)} w={w} h={lh} n={Math.max(4, Math.round(w / 135))} />
      {children}
    </Room>
  );
}

/** Self de la cantine : faïence, comptoir inox, bacs, vitre, rampe à plateaux, damier au sol. */
export function Canteen({ x = 0, y = 0, w, h, floorY = 0.8, children }: SceneProps) {
  const id = useUid();
  const fy = r1(h * floorY);
  const cy = r1(h * 0.5);
  const bins = ["#8cc152", "#f6a13a", "#f3e2b0", "#c9543b", "#f7d154"];
  const bw = (w * 0.86) / bins.length;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, overflow: "hidden" }}>
      <Svg w={w} h={h}>
        <defs>
          <pattern id={`${id}t`} width={70} height={70} patternUnits="userSpaceOnUse">
            <rect width={70} height={70} fill="#f3f1ea" />
            <rect x={3} y={3} width={64} height={64} rx={5} fill="#fdfcf7" />
          </pattern>
          <pattern id={`${id}d`} width={140} height={90} patternUnits="userSpaceOnUse">
            <rect width={140} height={90} fill="#d9d4c7" />
            <rect width={70} height={45} fill="#8f98a6" />
            <rect x={70} y={45} width={70} height={45} fill="#8f98a6" />
          </pattern>
          <linearGradient id={`${id}i`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#dfe4ea" />
            <stop offset="0.5" stopColor="#b9c1cb" />
            <stop offset="1" stopColor="#8f98a5" />
          </linearGradient>
          <radialGradient id={`${id}v`} cx="0.5" cy="0.4" r="0.8">
            <stop offset="0.55" stopColor="rgba(20,19,43,0)" />
            <stop offset="1" stopColor="rgba(20,19,43,0.3)" />
          </radialGradient>
        </defs>
        <rect width={w} height={fy} fill={`url(#${id}t)`} />
        <rect y={h * 0.2} width={w} height={h * 0.035} fill="#ff9a3d" />
        <rect y={fy} width={w} height={h - fy} fill={`url(#${id}d)`} />
        <rect y={fy} width={w} height={26} fill="rgba(20,15,30,0.25)" />
        {/* lampes chauffantes */}
        {[0.25, 0.5, 0.75].map((p) => (
          <g key={p}>
            <rect x={w * p - 4} y={0} width={8} height={h * 0.2} fill="#5b6470" />
            <polygon points={`${w * p - 34},${h * 0.2} ${w * p + 34},${h * 0.2} ${w * p + 62},${h * 0.27} ${w * p - 62},${h * 0.27}`} fill="#e56a54" />
            <polygon points={`${w * p - 62},${h * 0.27} ${w * p + 62},${h * 0.27} ${w * p + 150},${cy} ${w * p - 150},${cy}`} fill="rgba(255,205,120,0.2)" />
          </g>
        ))}
        {/* comptoir */}
        <rect x={0} y={cy} width={w} height={fy - cy} fill={`url(#${id}i)`} />
        <rect x={0} y={cy} width={w} height={h * 0.075} fill="#eef1f4" />
        {bins.map((c, i) => (
          <g key={i}>
            <rect x={w * 0.07 + i * bw + 8} y={cy + 9} width={bw - 16} height={h * 0.075 - 18} rx={8} fill="#6b7480" />
            <rect x={w * 0.07 + i * bw + 14} y={cy + 13} width={bw - 28} height={h * 0.075 - 26} rx={6} fill={c} />
            <ellipse cx={w * 0.07 + i * bw + bw * 0.4} cy={cy + h * 0.03} rx={bw * 0.12} ry={5} fill="rgba(255,255,255,0.35)" />
          </g>
        ))}
        {/* vitre */}
        <polygon points={`${w * 0.04},${cy - h * 0.14} ${w * 0.96},${cy - h * 0.14} ${w * 0.99},${cy + 4} ${w * 0.01},${cy + 4}`} fill="rgba(190,225,245,0.32)" />
        <polygon points={`${w * 0.14},${cy - h * 0.14} ${w * 0.24},${cy - h * 0.14} ${w * 0.17},${cy + 4} ${w * 0.07},${cy + 4}`} fill="rgba(255,255,255,0.3)" />
        <rect x={w * 0.03} y={cy - h * 0.15} width={w * 0.94} height={10} rx={5} fill="#aeb7c2" />
        {/* rampe à plateaux */}
        {[0, 1, 2].map((k) => (
          <rect key={k} x={0} y={cy + h * 0.115 + k * 17} width={w} height={9} rx={4} fill={k === 1 ? "#eef1f4" : "#9aa3af"} />
        ))}
        <rect x={0} y={cy + h * 0.105} width={w} height={6} fill="rgba(20,15,30,0.18)" />
        <rect width={w} height={h} fill={`url(#${id}v)`} />
      </Svg>
      {children}
    </div>
  );
}

/** Cour du lycée : ciel, façade à fenêtres, arbres, bitume avec tracé de terrain. */
export function Yard({ x = 0, y = 0, w, h, floorY = 0.66, children }: SceneProps) {
  const id = useUid();
  const fy = r1(h * floorY);
  const by = r1(h * 0.16);
  const wins = [];
  const cols = Math.max(5, Math.round(w / 125));
  for (let row = 0; row < 2; row++)
    for (let i = 0; i < cols; i++) {
      const cx = (w / cols) * (i + 0.5);
      if (row === 1 && Math.abs(cx - w / 2) < w * 0.09) continue;
      const wy = by + (fy - by) * (0.14 + row * 0.42);
      wins.push(
        <g key={`${row}-${i}`}>
          <rect x={cx - w * 0.045} y={wy} width={w * 0.09} height={(fy - by) * 0.28} rx={4} fill="#f6f2e8" />
          <rect x={cx - w * 0.045 + 6} y={wy + 6} width={w * 0.09 - 12} height={(fy - by) * 0.28 - 12} fill={(i + row) % 3 === 0 ? "#ffe9a8" : "#8fc7e8"} />
          <rect x={cx - 3} y={wy} width={6} height={(fy - by) * 0.28} fill="#f6f2e8" />
        </g>,
      );
    }
  const tree = (tx: number, s: number) => (
    <g>
      <rect x={tx - 10 * s} y={fy - 120 * s} width={20 * s} height={124 * s} rx={6} fill="#7a5235" />
      <circle cx={tx} cy={fy - 165 * s} r={66 * s} fill="#3f9d63" />
      <circle cx={tx - 46 * s} cy={fy - 130 * s} r={46 * s} fill="#358a56" />
      <circle cx={tx + 46 * s} cy={fy - 134 * s} r={48 * s} fill="#46ab6d" />
      <circle cx={tx - 16 * s} cy={fy - 190 * s} r={26 * s} fill="rgba(255,255,255,0.14)" />
    </g>
  );
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, overflow: "hidden" }}>
      <Svg w={w} h={h}>
        <defs>
          <linearGradient id={`${id}k`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6bbcf2" />
            <stop offset="1" stopColor="#d6f0ff" />
          </linearGradient>
          <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7c8090" />
            <stop offset="1" stopColor="#5a5d6c" />
          </linearGradient>
          <radialGradient id={`${id}v`} cx="0.5" cy="0.4" r="0.8">
            <stop offset="0.6" stopColor="rgba(20,19,43,0)" />
            <stop offset="1" stopColor="rgba(20,19,43,0.25)" />
          </radialGradient>
        </defs>
        <rect width={w} height={fy} fill={`url(#${id}k)`} />
        <circle cx={w * 0.86} cy={h * 0.08} r={h * 0.05} fill="#fff4b8" />
        <ellipse cx={w * 0.2} cy={h * 0.08} rx={w * 0.1} ry={h * 0.03} fill="#fff" opacity={0.9} />
        <ellipse cx={w * 0.27} cy={h * 0.06} rx={w * 0.07} ry={h * 0.03} fill="#fff" opacity={0.9} />
        <ellipse cx={w * 0.62} cy={h * 0.1} rx={w * 0.08} ry={h * 0.022} fill="#fff" opacity={0.7} />
        {/* façade */}
        <rect x={0} y={by} width={w} height={fy - by} fill="#ecd7ae" />
        <rect x={0} y={by} width={w} height={(fy - by) * 0.07} fill="#c66a4a" />
        <rect x={0} y={by + (fy - by) * 0.07} width={w} height={8} fill="rgba(20,15,30,0.15)" />
        <rect x={0} y={by + (fy - by) * 0.5} width={w} height={6} fill="rgba(20,15,30,0.08)" />
        {wins}
        <rect x={w * 0.42} y={by + (fy - by) * 0.52} width={w * 0.16} height={(fy - by) * 0.48} rx={6} fill="#2f6f8f" />
        <rect x={w * 0.498} y={by + (fy - by) * 0.52} width={w * 0.004} height={(fy - by) * 0.48} fill="#1d4d66" />
        <rect x={w * 0.39} y={by + (fy - by) * 0.44} width={w * 0.22} height={(fy - by) * 0.1} rx={6} fill="#14132b" />
        <text x={w / 2} y={by + (fy - by) * 0.515} textAnchor="middle" fontFamily={FONT.display} fontWeight={800} fontSize={(fy - by) * 0.075} fill="#ffe94a" letterSpacing={4}>
          LYCÉE
        </text>
        {/* sol */}
        <rect y={fy} width={w} height={h - fy} fill={`url(#${id}g)`} />
        <rect y={fy} width={w} height={22} fill="rgba(20,15,30,0.25)" />
        <ellipse cx={w / 2} cy={h * 1.02} rx={w * 0.34} ry={(h - fy) * 0.6} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={7} />
        <line x1={0} y1={fy + (h - fy) * 0.34} x2={w} y2={fy + (h - fy) * 0.34} stroke="rgba(255,255,255,0.4)" strokeWidth={6} />
        {tree(w * 0.1, Math.min(1.5, h / 520))}
        {tree(w * 0.92, Math.min(1.25, h / 620))}
        <rect width={w} height={h} fill={`url(#${id}v)`} />
      </Svg>
      {children}
    </div>
  );
}

/** Gymnase : parquet tracé, espalier, panier de basket, fenêtres hautes. */
export function Gym({ x, y, w, h, floorY = 0.66, children }: SceneProps) {
  const fy = h * floorY;
  const rungs = [];
  for (let i = 0; i < 9; i++) rungs.push(<rect key={i} x={w * 0.045} y={h * 0.16 + i * ((fy - h * 0.2) / 9)} width={w * 0.17} height={9} rx={4} fill="#d9a55f" />);
  return (
    <Room x={x} y={y} w={w} h={h} floorY={floorY} wall={["#e9eef0", "#d5dfe2"]} band="#5d8fbf" bandH={0.2} floor="wood" floorColors={["#e7b96a", "#c98f40"]} light="right" vignette={0.26}>
      <Svg w={w} h={h}>
        {[0.3, 0.44, 0.58].map((p) => (
          <g key={p}>
            <rect x={w * p} y={h * 0.04} width={w * 0.11} height={h * 0.1} rx={5} fill="#f6f2e8" />
            <rect x={w * p + 7} y={h * 0.04 + 7} width={w * 0.11 - 14} height={h * 0.1 - 14} fill="#a9d8f2" />
          </g>
        ))}
        {/* espalier */}
        <rect x={w * 0.04} y={h * 0.13} width={12} height={fy - h * 0.13} rx={5} fill="#b9814a" />
        <rect x={w * 0.21} y={h * 0.13} width={12} height={fy - h * 0.13} rx={5} fill="#b9814a" />
        {rungs}
        {/* panier */}
        <rect x={w * 0.8} y={h * 0.2} width={10} height={fy - h * 0.2} fill="#6b7480" />
        <rect x={w * 0.7} y={h * 0.12} width={w * 0.22} height={h * 0.2} rx={8} fill="#fdfcf7" stroke="#14132b" strokeWidth={5} />
        <rect x={w * 0.775} y={h * 0.2} width={w * 0.07} height={h * 0.085} fill="none" stroke="#e5383b" strokeWidth={5} />
        <ellipse cx={w * 0.81} cy={h * 0.3} rx={w * 0.05} ry={9} fill="none" stroke="#ff7a2e" strokeWidth={8} />
        <polygon points={`${w * 0.765},${h * 0.305} ${w * 0.855},${h * 0.305} ${w * 0.835},${h * 0.39} ${w * 0.785},${h * 0.39}`} fill="rgba(255,255,255,0.55)" stroke="#fff" strokeWidth={2} strokeDasharray="6 5" />
        {/* tracés au sol */}
        <ellipse cx={w / 2} cy={fy + (h - fy) * 0.62} rx={w * 0.2} ry={(h - fy) * 0.3} fill="none" stroke="#fdfcf7" strokeWidth={7} opacity={0.85} />
        <line x1={0} y1={fy + (h - fy) * 0.62} x2={w} y2={fy + (h - fy) * 0.62} stroke="#fdfcf7" strokeWidth={7} opacity={0.85} />
        <line x1={0} y1={fy + (h - fy) * 0.16} x2={w} y2={fy + (h - fy) * 0.16} stroke="#e5383b" strokeWidth={5} opacity={0.7} />
      </Svg>
      {children}
    </Room>
  );
}

export interface BedroomNightProps extends SceneProps {
  /** heure du réveil numérique posé sur le bureau, ou null pour l'enlever */
  clock?: string | null;
  /** côté de la lampe de bureau */
  lamp?: "left" | "right";
}

/**
 * Chambre la nuit : mur bleu nuit, fenêtre avec lune, guirlande, posters, lit,
 * bureau au premier plan avec lampe (cône de lumière chaude) et réveil numérique.
 * Le plateau du bureau commence à floorY × h : poser l'emoji juste au-dessus.
 */
export function BedroomNight({ x = 0, y = 0, w, h, floorY = 0.78, clock = "02:07", lamp = "left", children }: BedroomNightProps) {
  const id = useUid();
  const dy = r1(h * floorY);
  const L = lamp === "left";
  const lx = L ? w * 0.14 : w * 0.86;
  const dir = L ? 1 : -1;
  const bulbs = [];
  const nb = Math.round(w / 85);
  const cols = ["#ffe94a", "#ff5fa2", "#5cc8ff", "#5df2a0", "#ff9a3d"];
  for (let i = 0; i <= nb; i++) {
    const t = i / nb;
    const bx = r1(w * t);
    const byy = r1(h * 0.035 + Math.sin(t * Math.PI * 3) * h * 0.012 + Math.sin(t * Math.PI) * h * 0.035);
    bulbs.push(
      <g key={i}>
        <circle cx={bx} cy={byy + 8} r={20} fill={cols[i % cols.length]} opacity={0.2} />
        <circle cx={bx} cy={byy + 8} r={8} fill={cols[i % cols.length]} />
      </g>,
    );
  }
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, overflow: "hidden" }}>
      <Svg w={w} h={h}>
        <defs>
          <linearGradient id={`${id}w`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1a2156" />
            <stop offset="1" stopColor="#242a66" />
          </linearGradient>
          <linearGradient id={`${id}c`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(255,214,120,0.62)" />
            <stop offset="1" stopColor="rgba(255,214,120,0)" />
          </linearGradient>
          <radialGradient id={`${id}p`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="rgba(255,220,140,0.55)" />
            <stop offset="1" stopColor="rgba(255,220,140,0)" />
          </radialGradient>
          <radialGradient id={`${id}v`} cx="0.5" cy="0.55" r="0.8">
            <stop offset="0.45" stopColor="rgba(8,6,30,0)" />
            <stop offset="1" stopColor="rgba(8,6,30,0.55)" />
          </radialGradient>
        </defs>
        <rect width={w} height={h} fill={`url(#${id}w)`} />
        {/* posters */}
        <g transform={`rotate(-4 ${w * (L ? 0.15 : 0.85)} ${h * 0.3})`}>
          <rect x={w * (L ? 0.06 : 0.76)} y={h * 0.17} width={w * 0.18} height={h * 0.24} rx={4} fill="#3b2f7a" />
          <circle cx={w * (L ? 0.15 : 0.85)} cy={h * 0.27} r={w * 0.045} fill="#ff9a3d" />
          <ellipse cx={w * (L ? 0.15 : 0.85)} cy={h * 0.27} rx={w * 0.075} ry={w * 0.014} fill="none" stroke="#ffe94a" strokeWidth={5} />
          <rect x={w * (L ? 0.09 : 0.79)} y={h * 0.36} width={w * 0.12} height={8} rx={4} fill="#7b5cff" />
        </g>
        {/* lit au fond */}
        <rect x={L ? w * 0.6 : 0} y={dy - h * 0.2} width={w * 0.4} height={h * 0.22} rx={18} fill="#2f3580" />
        <rect x={L ? w * 0.6 : 0} y={dy - h * 0.15} width={w * 0.4} height={h * 0.17} rx={22} fill="#4a3f9c" />
        <rect x={L ? w * 0.6 : 0} y={dy - h * 0.15} width={w * 0.4} height={14} rx={7} fill="rgba(255,255,255,0.12)" />
        <ellipse cx={L ? w * 0.88 : w * 0.12} cy={dy - h * 0.17} rx={w * 0.08} ry={h * 0.035} fill="#c9c6ee" />
        {/* guirlande */}
        <path
          d={`M0 ${h * 0.03} ${Array.from({ length: nb + 1 }, (_, i) => {
            const t = i / nb;
            return `L${r1(w * t)} ${r1(h * 0.035 + Math.sin(t * Math.PI * 3) * h * 0.012 + Math.sin(t * Math.PI) * h * 0.035)}`;
          }).join(" ")}`}
          fill="none"
          stroke="#0c0f30"
          strokeWidth={4}
        />
        {bulbs}
        {/* bureau */}
        <rect y={dy} width={w} height={h - dy} fill="#3b2a52" />
        <rect y={dy} width={w} height={(h - dy) * 0.3} fill="#523a70" />
        <rect y={dy + (h - dy) * 0.3} width={w} height={8} fill="rgba(0,0,0,0.3)" />
        {/* lumière de la lampe */}
        <polygon points={`${lx + dir * w * 0.1},${dy - h * 0.26} ${lx + dir * w * 0.2},${dy - h * 0.22} ${lx + dir * w * 0.62},${dy + (h - dy) * 0.3} ${lx - dir * w * 0.02},${dy + (h - dy) * 0.3}`} fill={`url(#${id}c)`} />
        <ellipse cx={lx + dir * w * 0.3} cy={dy + (h - dy) * 0.15} rx={w * 0.36} ry={(h - dy) * 0.22} fill={`url(#${id}p)`} />
        {/* lampe */}
        <ellipse cx={lx} cy={dy + 6} rx={w * 0.06} ry={12} fill="#14132b" />
        <line x1={lx} y1={dy} x2={lx - dir * w * 0.03} y2={dy - h * 0.16} stroke="#14132b" strokeWidth={10} strokeLinecap="round" />
        <line x1={lx - dir * w * 0.03} y1={dy - h * 0.16} x2={lx + dir * w * 0.08} y2={dy - h * 0.28} stroke="#14132b" strokeWidth={10} strokeLinecap="round" />
        <polygon points={`${lx + dir * w * 0.04},${dy - h * 0.31} ${lx + dir * w * 0.12},${dy - h * 0.33} ${lx + dir * w * 0.21},${dy - h * 0.21} ${lx + dir * w * 0.09},${dy - h * 0.25}`} fill="#ff5fa2" />
        <ellipse cx={lx + dir * w * 0.15} cy={dy - h * 0.238} rx={w * 0.055} ry={9} fill="#fff3c2" transform={`rotate(${dir * 22} ${lx + dir * w * 0.15} ${dy - h * 0.238})`} />
        {/* livres */}
        <g>
          <rect x={L ? w * 0.74 : w * 0.06} y={dy - 24} width={w * 0.2} height={26} rx={5} fill="#5cc8ff" />
          <rect x={L ? w * 0.755 : w * 0.075} y={dy - 46} width={w * 0.17} height={24} rx={5} fill="#ffe94a" />
          <rect x={L ? w * 0.75 : w * 0.07} y={dy - 66} width={w * 0.15} height={22} rx={5} fill="#ff9a3d" />
          <rect x={L ? w * 0.74 : w * 0.06} y={dy - 24} width={w * 0.2} height={26} rx={5} fill="rgba(8,6,30,0.35)" />
          <rect x={L ? w * 0.755 : w * 0.075} y={dy - 46} width={w * 0.17} height={24} rx={5} fill="rgba(8,6,30,0.3)" />
          <rect x={L ? w * 0.75 : w * 0.07} y={dy - 66} width={w * 0.15} height={22} rx={5} fill="rgba(8,6,30,0.25)" />
        </g>
        <rect width={w} height={h} fill={`url(#${id}v)`} />
        {clock ? (
          <g>
            <rect x={L ? w * 0.755 : w * 0.085} y={dy - 132} width={150} height={64} rx={10} fill="#0a0c24" stroke="#2c2a5a" strokeWidth={4} />
            <text x={(L ? w * 0.755 : w * 0.085) + 75} y={dy - 86} textAnchor="middle" fontFamily={FONT.display} fontWeight={800} fontSize={44} fill="#ff4d5e" letterSpacing={2}>
              {clock}
            </text>
          </g>
        ) : null}
      </Svg>
      {children}
    </div>
  );
}

/** Intérieur de bus : fenêtres avec paysage qui défile, barres jaunes, sièges à motifs au premier plan. */
export function Bus({ x = 0, y = 0, w, h, floorY = 0.62, children }: SceneProps) {
  const id = useUid();
  const sy = r1(h * floorY);
  const nw = Math.max(2, Math.round(w / 330));
  const ww = (w - 40 * (nw + 1)) / nw;
  const wy = h * 0.14;
  const wh = h * 0.36;
  const seats = [];
  const ns = Math.max(2, Math.round(w / 300));
  const sw = w / ns;
  for (let i = 0; i < ns; i++) {
    const sx = i * sw + sw * 0.07;
    const sW = sw * 0.86;
    seats.push(
      <g key={i}>
        <rect x={sx} y={sy} width={sW} height={h - sy + 30} rx={34} fill="#2a4fa3" />
        <rect x={sx} y={sy} width={sW} height={h - sy + 30} rx={34} fill={`url(#${id}m)`} />
        <rect x={sx + sW * 0.08} y={sy + 12} width={sW * 0.84} height={12} rx={6} fill="rgba(255,255,255,0.2)" />
        <rect x={sx + sW * 0.3} y={sy - 16} width={sW * 0.4} height={30} rx={14} fill="none" stroke="#ffcf33" strokeWidth={9} />
      </g>,
    );
  }
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, overflow: "hidden" }}>
      <Svg w={w} h={h}>
        <defs>
          <linearGradient id={`${id}k`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8fd0f7" />
            <stop offset="1" stopColor="#e3f5ff" />
          </linearGradient>
          <pattern id={`${id}m`} width={64} height={64} patternUnits="userSpaceOnUse">
            <rect x={8} y={10} width={18} height={7} rx={3} fill="#ff5fa2" transform="rotate(30 17 13)" />
            <rect x={40} y={36} width={18} height={7} rx={3} fill="#ffe94a" transform="rotate(-25 49 39)" />
            <circle cx={46} cy={12} r={5} fill="#5df2a0" />
            <circle cx={14} cy={46} r={4} fill="#5cc8ff" />
          </pattern>
          <radialGradient id={`${id}v`} cx="0.5" cy="0.45" r="0.8">
            <stop offset="0.55" stopColor="rgba(20,19,43,0)" />
            <stop offset="1" stopColor="rgba(20,19,43,0.35)" />
          </radialGradient>
        </defs>
        <rect width={w} height={h} fill="#e9e4d8" />
        <rect width={w} height={h * 0.09} fill="#cfc9bb" />
        <rect y={h * 0.55} width={w} height={h * 0.45} fill="#b9c2cf" />
        <rect y={h * 0.55} width={w} height={8} fill="rgba(20,15,30,0.15)" />
        {Array.from({ length: nw }, (_, i) => {
          const wx = 40 + i * (ww + 40);
          return (
            <g key={i}>
              <rect x={wx - 8} y={wy - 8} width={ww + 16} height={wh + 16} rx={36} fill="#2b2c3f" />
              <clipPath id={`${id}c${i}`}>
                <rect x={wx} y={wy} width={ww} height={wh} rx={28} />
              </clipPath>
              <g clipPath={`url(#${id}c${i})`}>
                <rect x={wx} y={wy} width={ww} height={wh} fill={`url(#${id}k)`} />
                <ellipse cx={wx + ww * 0.3} cy={wy + wh} rx={ww * 0.5} ry={wh * 0.34} fill="#7cc48a" />
                <ellipse cx={wx + ww * 0.85} cy={wy + wh} rx={ww * 0.45} ry={wh * 0.24} fill="#5aa873" />
                <rect x={wx + ww * 0.58} y={wy + wh * 0.42} width={ww * 0.16} height={wh * 0.4} fill="#f1e0be" />
                <polygon points={`${wx + ww * 0.55},${wy + wh * 0.42} ${wx + ww * 0.66},${wy + wh * 0.28} ${wx + ww * 0.77},${wy + wh * 0.42}`} fill="#c66a4a" />
                {[0.2, 0.34, 0.5].map((p, k) => (
                  <rect key={k} x={wx + ww * (0.08 + k * 0.28)} y={wy + wh * p} width={ww * 0.22} height={5} rx={2} fill="rgba(255,255,255,0.8)" />
                ))}
                <polygon points={`${wx + ww * 0.1},${wy} ${wx + ww * 0.26},${wy} ${wx + ww * 0.1},${wy + wh} ${wx - ww * 0.06},${wy + wh}`} fill="rgba(255,255,255,0.22)" />
              </g>
            </g>
          );
        })}
        {/* barre et poignées */}
        <rect x={0} y={h * 0.075} width={w} height={12} rx={6} fill="#ffcf33" />
        {Array.from({ length: nw * 2 }, (_, i) => {
          const px = (w / (nw * 2)) * (i + 0.5);
          return (
            <g key={i}>
              <rect x={px - 4} y={h * 0.085} width={8} height={h * 0.07} fill="#3a3b52" />
              <rect x={px - 22} y={h * 0.15} width={44} height={34} rx={12} fill="none" stroke="#3a3b52" strokeWidth={8} />
            </g>
          );
        })}
        {seats}
        <rect width={w} height={h} fill={`url(#${id}v)`} />
      </Svg>
      {children}
    </div>
  );
}

export interface CpeOfficeProps extends SceneProps {
  /** texte du chevalet posé sur le bureau */
  label?: string;
}

/** Bureau du CPE : store, planning des absences, armoire à dossiers, plante, grand bureau avec chevalet. */
export function CpeOffice({ x, y, w, h, floorY = 0.7, label = "C.P.E.", children }: CpeOfficeProps) {
  const fy = h * floorY;
  const dy = h * 0.72;
  const mags = ["#e5383b", "#ffe94a", "#5df2a0", "#5cc8ff", "#ff9a3d"];
  return (
    <Room x={x} y={y} w={w} h={h} floorY={floorY} wall={["#efe8dc", "#e2d8c8"]} band="#c9b89d" bandH={0.14} floor="carpet" floorColors={["#75698a", "#5a5070"]} light="none" vignette={0.28}>
      <Svg w={w} h={h}>
        {/* fenêtre à store */}
        <rect x={w * 0.05} y={h * 0.1} width={w * 0.24} height={h * 0.34} rx={8} fill="#f6f2e8" />
        <rect x={w * 0.05 + 12} y={h * 0.1 + 12} width={w * 0.24 - 24} height={h * 0.34 - 24} fill="#a9d8f2" />
        {Array.from({ length: 9 }, (_, i) => (
          <rect key={i} x={w * 0.05 + 8} y={h * 0.1 + 12 + i * ((h * 0.34 - 24) / 9)} width={w * 0.24 - 16} height={(h * 0.34 - 24) / 9 - 7} rx={3} fill="#fdfbf3" opacity={0.92} />
        ))}
        {/* planning des absences */}
        <rect x={w * 0.36} y={h * 0.08} width={w * 0.3} height={h * 0.26} rx={8} fill="#fdfbf3" stroke="#8a8fa3" strokeWidth={6} />
        <rect x={w * 0.36} y={h * 0.08} width={w * 0.3} height={h * 0.055} rx={8} fill="#e5383b" />
        <text x={w * 0.51} y={h * 0.122} textAnchor="middle" fontFamily={FONT.display} fontWeight={800} fontSize={h * 0.036} fill="#fff" letterSpacing={3}>
          ABSENCES
        </text>
        {Array.from({ length: 15 }, (_, i) => (
          <rect key={i} x={w * 0.375 + (i % 5) * w * 0.056} y={h * 0.155 + Math.floor(i / 5) * h * 0.058} width={w * 0.046} height={h * 0.042} rx={5} fill={i % 4 === 1 ? "#eceaf2" : mags[(i * 3) % mags.length]} opacity={0.9} />
        ))}
        {/* armoire */}
        <rect x={w * 0.75} y={h * 0.2} width={w * 0.2} height={fy - h * 0.2} rx={6} fill="#8a93a3" />
        {[0, 1, 2].map((k) => (
          <g key={k}>
            <rect x={w * 0.76} y={h * 0.215 + k * ((fy - h * 0.23) / 3)} width={w * 0.18} height={(fy - h * 0.23) / 3 - 10} rx={5} fill="#a6aebc" />
            <rect x={w * 0.82} y={h * 0.24 + k * ((fy - h * 0.23) / 3)} width={w * 0.06} height={10} rx={5} fill="#5b6472" />
          </g>
        ))}
        <rect x={w * 0.81} y={h * 0.13} width={w * 0.08} height={h * 0.075} rx={6} fill="#c66a4a" />
        <ellipse cx={w * 0.82} cy={h * 0.09} rx={w * 0.035} ry={h * 0.06} fill="#3f9d63" transform={`rotate(-24 ${w * 0.82} ${h * 0.09})`} />
        <ellipse cx={w * 0.88} cy={h * 0.085} rx={w * 0.035} ry={h * 0.065} fill="#46ab6d" transform={`rotate(22 ${w * 0.88} ${h * 0.085})`} />
        <ellipse cx={w * 0.85} cy={h * 0.07} rx={w * 0.028} ry={h * 0.07} fill="#358a56" />
        {/* fauteuil */}
        <rect x={w * 0.36} y={h * 0.4} width={w * 0.28} height={h * 0.4} rx={36} fill="#2b2c3f" />
        <rect x={w * 0.38} y={h * 0.42} width={w * 0.24} height={h * 0.3} rx={28} fill="#3d3f58" />
      </Svg>
      {children}
      <Svg w={w} h={h}>
        {/* bureau */}
        <rect x={0} y={dy} width={w} height={h - dy} fill="#7a4f33" />
        <rect x={0} y={dy} width={w} height={h * 0.05} fill="#a36c44" />
        <rect x={0} y={dy} width={w} height={6} fill="rgba(255,255,255,0.2)" />
        <rect x={0} y={dy + h * 0.05} width={w} height={8} fill="rgba(0,0,0,0.25)" />
        <rect x={w * 0.06} y={dy + h * 0.09} width={w * 0.88} height={h - dy} rx={8} fill="rgba(0,0,0,0.12)" />
        {/* chevalet */}
        <polygon points={`${w * 0.36},${dy + h * 0.035} ${w * 0.64},${dy + h * 0.035} ${w * 0.62},${dy - h * 0.045} ${w * 0.38},${dy - h * 0.045}`} fill="#14132b" />
        <rect x={w * 0.385} y={dy - h * 0.038} width={w * 0.23} height={h * 0.062} rx={3} fill="#f1d38a" />
        <text x={w / 2} y={dy + h * 0.008} textAnchor="middle" fontFamily={FONT.display} fontWeight={800} fontSize={h * 0.045} fill="#14132b" letterSpacing={3}>
          {label}
        </text>
        {/* piles de carnets */}
        <rect x={w * 0.08} y={dy - 18} width={w * 0.16} height={22} rx={4} fill="#5cc8ff" />
        <rect x={w * 0.085} y={dy - 38} width={w * 0.15} height={22} rx={4} fill="#ffe94a" />
        <rect x={w * 0.09} y={dy - 58} width={w * 0.15} height={22} rx={4} fill="#ff5fa2" />
        {/* pot à crayons */}
        <rect x={w * 0.8} y={dy - 60} width={w * 0.06} height={64} rx={6} fill="#3d3f58" />
        <rect x={w * 0.81} y={dy - 104} width={9} height={50} rx={3} fill="#ffe94a" transform={`rotate(-8 ${w * 0.81} ${dy - 60})`} />
        <rect x={w * 0.83} y={dy - 110} width={9} height={56} rx={3} fill="#e5383b" />
        <rect x={w * 0.845} y={dy - 100} width={9} height={46} rx={3} fill="#5df2a0" transform={`rotate(10 ${w * 0.85} ${dy - 60})`} />
      </Svg>
    </Room>
  );
}

export interface ExamHallProps extends SceneProps {
  /** heure de la grande horloge */
  time?: string;
  /** texte du panneau */
  sign?: string;
}

/** Salle d'examen : rangées de tables individuelles en perspective, grande horloge, panneau « SILENCE ». */
export function ExamHall({ x, y, w, h, floorY = 0.42, time = "13:59", sign = "SILENCE — ÉPREUVE EN COURS", children }: ExamHallProps) {
  const fy = h * floorY;
  const rows = [
    { n: 6, s: 0.5, t: 0.06 },
    { n: 5, s: 0.68, t: 0.25 },
    { n: 4, s: 0.9, t: 0.52 },
  ];
  const desks: ReactNode[] = [];
  rows.forEach((row, ri) => {
    const dw = (w / 4.6) * row.s;
    const gap = (w * (0.62 + ri * 0.19)) / (row.n - 1);
    for (let i = 0; i < row.n; i++) {
      const cx = w / 2 + (i - (row.n - 1) / 2) * gap;
      const top = fy + (h - fy) * row.t;
      const dh = dw * 0.5;
      desks.push(
        <g key={`${ri}-${i}`}>
          <ellipse cx={cx} cy={top + dh} rx={dw * 0.55} ry={dh * 0.14} fill="rgba(20,15,30,0.2)" />
          <rect x={cx - dw * 0.42} y={top + dh * 0.28} width={dw * 0.06} height={dh * 0.72} fill="#5c6f7a" />
          <rect x={cx + dw * 0.36} y={top + dh * 0.28} width={dw * 0.06} height={dh * 0.72} fill="#5c6f7a" />
          <polygon points={`${cx - dw * 0.42},${top} ${cx + dw * 0.42},${top} ${cx + dw * 0.5},${top + dh * 0.24} ${cx - dw * 0.5},${top + dh * 0.24}`} fill="#ecc994" />
          <rect x={cx - dw * 0.5} y={top + dh * 0.24} width={dw} height={dh * 0.1} rx={3} fill="#c4935a" />
          <polygon points={`${cx - dw * 0.16},${top + dh * 0.04} ${cx + dw * 0.1},${top + dh * 0.04} ${cx + dw * 0.13},${top + dh * 0.2} ${cx - dw * 0.19},${top + dh * 0.2}`} fill="#fdfcf7" />
        </g>,
      );
    }
  });
  const cs = Math.round(Math.min(w * 0.14, fy * 0.5));
  return (
    <Room x={x} y={y} w={w} h={h} floorY={floorY} wall={["#f1ece1", "#e3dccd"]} band="#b9c7d6" bandH={0.08} floor="wood" floorColors={["#dcb277", "#c39355"]} light="right" vignette={0.26}>
      <Svg w={w} h={h}>
        <rect x={w * 0.12} y={fy * 0.2} width={w * 0.56} height={fy * 0.3} rx={8} fill="#14132b" />
        <text x={w * 0.4} y={fy * 0.4} textAnchor="middle" fontFamily={FONT.display} fontWeight={800} fontSize={Math.min(fy * 0.13, w * 0.025)} fill="#ffe94a" letterSpacing={1}>
          {sign}
        </text>
        {desks}
      </Svg>
      <WallClock x={Math.round(w * 0.74)} y={Math.round(fy * 0.12)} size={cs} time={time} />
      {children}
    </Room>
  );
}
