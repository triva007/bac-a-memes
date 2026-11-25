"use client";

/** Petites briques de l'écran de classe. Toutes les tailles sont en px de maquette (cadre de 1920). */
import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import { animate, motion } from "motion/react";
import QRCode from "qrcode";
import type { Meme, PlayerView } from "@/lib/game/types";
import { emojiUrl } from "@/lib/content/emoji-lite";
import { hashSeed } from "@/lib/content/phrases";
import { getTemplate } from "@/lib/templates";
import { MemeView } from "@/components/meme/MemeView";
import { usePersoImage } from "@/components/meme/perso";

export const INK = "#14132b";
export const PAPER = "#fbf7ec";
export const FLUO = {
  yellow: "#ffe94a",
  pink: "#ff5fa2",
  green: "#5df2a0",
  blue: "#5cc8ff",
  orange: "#ff9a3d",
} as const;

export const DISPLAY: CSSProperties = { fontFamily: "var(--font-display)", fontWeight: 800, letterSpacing: "-0.02em" };
export const HAND: CSSProperties = { fontFamily: "var(--font-hand)", fontWeight: 700 };

export const hard = (px: number, color = "rgba(0,0,0,0.55)") => `${px}px ${px}px 0 0 ${color}`;

/** Inclinaison stable (en degrés) dérivée d'une graine : donne du relief sans bouger d'un rendu à l'autre. */
export function tiltOf(seed: string, max = 3): number {
  return ((hashSeed(seed) % 1000) / 1000 - 0.5) * 2 * max;
}

/** Taille de police selon la longueur du texte : `steps` = [longueur max, taille] du plus court au plus long. */
export function fitSize(text: string, steps: readonly (readonly [number, number])[]): number {
  const n = [...text].length;
  for (const [max, size] of steps) if (n <= max) return size;
  return steps[steps.length - 1][1];
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n > 1 ? many : one}`;
}

// ------------------------------------------------------------------ emoji / avatar

export function Emo({ id, size, className, style }: { id: string; size: number; className?: string; style?: CSSProperties }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={emojiUrl(id)}
      alt=""
      width={size}
      height={size}
      draggable={false}
      decoding="async"
      className={className}
      style={{ width: size, height: size, flex: "none", objectFit: "contain", ...style }}
    />
  );
}

export function Avatar({
  avatar,
  color,
  size,
  border,
  shadow = true,
  style,
}: {
  avatar: string;
  color: string;
  size: number;
  border?: number;
  shadow?: boolean;
  style?: CSSProperties;
}) {
  const b = border ?? Math.max(3, Math.round(size * 0.045));
  return (
    <div
      style={{
        width: size,
        height: size,
        flex: "none",
        borderRadius: "50%",
        background: color,
        border: `${b}px solid ${INK}`,
        boxShadow: shadow ? hard(Math.max(3, Math.round(size * 0.05))) : undefined,
        display: "grid",
        placeItems: "center",
        ...style,
      }}
    >
      <Emo id={avatar} size={Math.round(size * 0.68)} />
    </div>
  );
}

// ------------------------------------------------------------------ grille de joueurs

export interface Packed {
  cols: number;
  rows: number;
  /** largeur d'une tuile */
  w: number;
  /** hauteur d'une tuile */
  h: number;
  /** position de la tuile i (coin haut-gauche), grille centrée dans la zone */
  at(i: number): { x: number; y: number };
}

/** Plus grande tuile (ratio hauteur/largeur donné) permettant de ranger `n` éléments dans W × H. */
export function packGrid(n: number, W: number, H: number, ratio: number, maxW: number, gap: number): Packed {
  const count = Math.max(1, n);
  let best = { cols: 1, rows: count, w: 0 };
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const w = Math.min((W - gap * (cols - 1)) / cols, (H - gap * (rows - 1)) / rows / ratio, maxW);
    if (w > best.w + 0.01) best = { cols, rows, w };
  }
  const w = Math.max(1, Math.floor(best.w));
  const h = Math.floor(w * ratio);
  const { cols, rows } = best;
  const gridH = rows * h + (rows - 1) * gap;
  const top = Math.max(0, (H - gridH) / 2);
  return {
    cols,
    rows,
    w,
    h,
    at(i: number) {
      const row = Math.floor(i / cols);
      const inRow = row === rows - 1 ? count - cols * (rows - 1) : cols;
      const rowW = inRow * w + (inRow - 1) * gap;
      const left = (W - rowW) / 2;
      return { x: left + (i % cols) * (w + gap), y: top + row * (h + gap) };
    },
  };
}

/** Tuile joueur : avatar dans sa pastille de couleur + étiquette du pseudo. `w` = largeur de la tuile. */
export function PlayerTile({
  player,
  w,
  done = false,
  showDone = false,
  dim = false,
  badge,
}: {
  player: Pick<PlayerView, "id" | "name" | "avatar" | "color" | "isHost">;
  w: number;
  /** a rendu sa copie */
  done?: boolean;
  /** affiche l'état « rendu / cherche encore » */
  showDone?: boolean;
  dim?: boolean;
  badge?: ReactNode;
}) {
  const disc = Math.round(w * 0.7);
  const label = Math.max(15, Math.round(w * 0.155));
  const tilt = tiltOf(player.id, 4);
  return (
    <div
      style={{
        width: w,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        opacity: dim ? 0.4 : 1,
        transition: "opacity 0.4s",
      }}
    >
      <div style={{ position: "relative", width: disc, height: disc, transform: `rotate(${tilt}deg)` }}>
        <Avatar
          avatar={player.avatar}
          color={player.color}
          size={disc}
          style={showDone && !done ? { filter: "saturate(0.55) brightness(0.82)", transition: "filter 0.3s" } : { transition: "filter 0.3s" }}
        />
        {showDone && done ? (
          <motion.div
            initial={{ scale: 0, rotate: -40 }}
            animate={{ scale: 1, rotate: -8 }}
            transition={{ type: "spring", stiffness: 520, damping: 16 }}
            style={{
              position: "absolute",
              right: -disc * 0.1,
              bottom: -disc * 0.04,
              width: disc * 0.46,
              height: disc * 0.46,
              borderRadius: "50%",
              background: FLUO.green,
              border: `${Math.max(3, disc * 0.035)}px solid ${INK}`,
              display: "grid",
              placeItems: "center",
              boxShadow: hard(Math.max(2, disc * 0.03)),
            }}
          >
            <svg viewBox="0 0 24 24" width="62%" height="62%" fill="none" stroke={INK} strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4.5 12.5l5 5L19.5 7" />
            </svg>
          </motion.div>
        ) : null}
        {badge ? <div style={{ position: "absolute", left: -disc * 0.1, top: -disc * 0.14 }}>{badge}</div> : null}
      </div>
      <div
        style={{
          ...DISPLAY,
          marginTop: Math.round(w * 0.045),
          maxWidth: "100%",
          padding: `${Math.round(label * 0.12)}px ${Math.round(label * 0.5)}px`,
          fontSize: label,
          lineHeight: 1.15,
          color: INK,
          background: showDone && done ? FLUO.green : PAPER,
          border: `${Math.max(2, Math.round(w * 0.016))}px solid ${INK}`,
          borderRadius: label * 0.55,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          transition: "background-color 0.3s",
        }}
      >
        {player.name}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ QR code

/** QR code vectoriel, modules noirs sur fond blanc, marge blanche de 4 modules (norme) : se scanne de loin. */
export function QrCode({ text, size }: { text: string; size: number }) {
  const qr = useMemo(() => {
    try {
      const { modules } = QRCode.create(text, { errorCorrectionLevel: "M" });
      const n = modules.size;
      let d = "";
      for (let y = 0; y < n; y++) {
        let run = 0;
        for (let x = 0; x <= n; x++) {
          const on = x < n && modules.data[y * n + x];
          if (on) run++;
          else if (run) {
            d += `M${x - run} ${y}h${run}v1h-${run}z`;
            run = 0;
          }
        }
      }
      return { n, d };
    } catch {
      return null;
    }
  }, [text]);
  if (!qr) return null;
  const quiet = 4;
  const total = qr.n + quiet * 2;
  return (
    <svg
      role="img"
      aria-label={`QR code pour rejoindre : ${text}`}
      width={size}
      height={size}
      viewBox={`${-quiet} ${-quiet} ${total} ${total}`}
      shapeRendering="crispEdges"
      style={{ display: "block", background: "#fff", flex: "none" }}
    >
      <rect x={-quiet} y={-quiet} width={total} height={total} fill="#fff" />
      <path d={qr.d} fill="#000" />
    </svg>
  );
}

// ------------------------------------------------------------------ minuteur circulaire

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : String(s);
}

export function TimerRing({ left, total, size, urgent }: { left: number | null; total: number; size: number; urgent: boolean }) {
  const stroke = Math.round(size * 0.085);
  const r = (size - stroke) / 2 - 6;
  const circ = 2 * Math.PI * r;
  const frac = left == null ? 1 : Math.max(0, Math.min(1, left / Math.max(1, total)));
  const text = left == null ? "" : formatClock(left);
  const color = urgent ? FLUO.pink : frac < 0.34 ? FLUO.orange : FLUO.green;
  return (
    <div style={{ position: "relative", width: size, height: size, flex: "none" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block", overflow: "visible" }} aria-hidden>
        <circle cx={size / 2 + 7} cy={size / 2 + 7} r={r + stroke / 2 + 3} fill="rgba(0,0,0,0.5)" />
        <circle cx={size / 2} cy={size / 2} r={r + stroke / 2 + 3} fill={INK} />
        <circle cx={size / 2} cy={size / 2} r={r - stroke / 2} fill={PAPER} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2c2a5a" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="butt"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - frac)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.28s linear, stroke 0.4s" }}
        />
      </svg>
      <div
        role="timer"
        aria-label={left == null ? undefined : `${Math.ceil(left)} secondes restantes`}
        style={{
          ...DISPLAY,
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          color: urgent ? "#e5383b" : INK,
          fontSize: size * (text.length >= 4 ? 0.26 : text.length === 3 ? 0.3 : 0.4),
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
        }}
      >
        {text}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ compteur qui monte

export function CountUp({
  from = 0,
  to,
  duration = 0.9,
  delay = 0,
  prefix = "",
  suffix = "",
}: {
  from?: number;
  to: number;
  duration?: number;
  delay?: number;
  prefix?: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(from);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const controls = animate(shown.current, to, {
      duration,
      delay,
      ease: "easeOut",
      onUpdate: (v) => {
        shown.current = v;
        el.textContent = `${prefix}${Math.round(v)}${suffix}`;
      },
    });
    return () => controls.stop();
  }, [to, duration, delay, prefix, suffix]);
  return (
    <span ref={ref} style={{ fontVariantNumeric: "tabular-nums" }}>
      {`${prefix}${from}${suffix}`}
    </span>
  );
}

// ------------------------------------------------------------------ mème encadré

/** Hauteur du canevas (largeur 1000) d'un mème, gabarit du registre ou image perso. */
export function useMemeHeight(templateId: string): number {
  const perso = usePersoImage(templateId);
  return getTemplate(templateId)?.height ?? perso?.height ?? 640;
}

/**
 * Mème entier, jamais coupé, dans la plus grande boîte possible de maxW × maxH,
 * avec un cadre encre et une ombre dure aux dimensions exactes du mème.
 */
export function MemeFrame({
  meme,
  maxW,
  maxH,
  border = 6,
  shadow = 12,
  children,
}: {
  meme: Meme;
  maxW: number;
  maxH: number;
  border?: number;
  shadow?: number;
  children?: ReactNode;
}) {
  const height = useMemeHeight(meme.templateId);
  const innerW = Math.max(40, maxW - border * 2);
  const innerH = Math.max(40, maxH - border * 2);
  const k = Math.min(innerW / 1000, innerH / height);
  const w = Math.floor(1000 * k);
  const h = Math.floor(height * k);
  const radius = Math.max(8, Math.round(w * 0.022));
  return (
    <div
      style={{
        position: "relative",
        width: w + border * 2,
        height: h + border * 2,
        flex: "none",
        background: INK,
        border: `${border}px solid ${INK}`,
        borderRadius: radius + border,
        boxShadow: hard(shadow),
      }}
    >
      <div style={{ width: w, height: h, borderRadius: radius, overflow: "hidden" }}>
        <MemeView meme={meme} fit="contain" rounded={false} />
      </div>
      {children}
    </div>
  );
}

// ------------------------------------------------------------------ étiquettes

export function Chip({ children, color = PAPER, size = 30, style }: { children: ReactNode; color?: string; size?: number; style?: CSSProperties }) {
  return (
    <div
      style={{
        ...DISPLAY,
        display: "inline-flex",
        alignItems: "center",
        gap: size * 0.35,
        padding: `${size * 0.28}px ${size * 0.7}px`,
        fontSize: size,
        lineHeight: 1.1,
        color: INK,
        background: color,
        border: `4px solid ${INK}`,
        borderRadius: size * 0.75,
        boxShadow: hard(5),
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Phrase d'ambiance manuscrite qui change en fondu quand son texte change. */
export function HandLine({ text, size = 48, color = FLUO.yellow, style }: { text: string; size?: number; color?: string; style?: CSSProperties }) {
  return (
    <div style={{ position: "relative", minHeight: size * 1.15, ...style }}>
      <motion.div
        key={text}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        style={{ ...HAND, fontSize: size, lineHeight: 1.1, color }}
      >
        {text}
      </motion.div>
    </div>
  );
}

// ------------------------------------------------------------------ libellés

export const MODE_INFO: Record<string, { label: string; emoji: string; pitch: string }> = {
  classique: { label: "Classique", emoji: "artist-palette", pitch: "Chacun choisit son gabarit" },
  "meme-image": { label: "Même image", emoji: "framed-picture", pitch: "Tout le monde légende la même image" },
  theme: { label: "Thème imposé", emoji: "bullseye", pitch: "Une situation imposée à tous" },
};
