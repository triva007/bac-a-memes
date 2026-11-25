/**
 * Petites briques du LOT D (« scènes de réaction ») — SANS hooks ni "use client".
 * Des personnages (tête-emoji + corps dessiné), du mobilier de premier plan et
 * les habillages de champs propres aux scènes (étiquette-nom, légende de mème).
 * Coordonnées en px du canevas virtuel (1000 de large).
 *
 * Comme le kit, ces composants ne s'utilisent QUE dans le JSX d'un `Render`.
 */
import type { CSSProperties, ReactNode } from "react";
import { Emo, IfField, T } from "@/components/meme/kit";
import { C } from "@/components/meme/palette";

// ------------------------------------------------------------------ ombres

/** Ombre elliptique posée au sol (sous un personnage, un objet). */
export function Ombre({ x, y, w, h, o = 0.36 }: { x: number; y: number; w: number; h?: number; o?: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h ?? Math.round(w * 0.2),
        borderRadius: "50%",
        background: `radial-gradient(closest-side, rgba(10,8,30,${o}), rgba(10,8,30,0))`,
        pointerEvents: "none",
      }}
    />
  );
}

// ------------------------------------------------------------------ personnages

export interface PersoProps {
  /** id de l'emoji-visage */
  id: string;
  /** coin haut-gauche de la TÊTE */
  x: number;
  y: number;
  /** côté de la tête */
  size: number;
  /** couleur du corps (sweat) ; sans couleur : tête seule */
  corps?: string;
  /** hauteur du corps en fraction de `size` (0.7 = buste, 1.2 = debout) */
  corpsH?: number;
  /** largeur du corps en fraction de `size` */
  corpsW?: number;
  /** bretelles de sac à dos (couleur) */
  sac?: string;
  /** col de chemise + cravate (couleur de la cravate) : les profs */
  cravate?: string;
  /** ombre au sol sous le corps (personnage debout) */
  sol?: boolean;
  rotate?: number;
  flip?: boolean;
  filter?: string;
  opacity?: number;
}

/**
 * Personnage : une tête-emoji posée sur un corps tout simple (un « pion » en
 * sweat). Le corps se dessine AVANT la tête ; placer le mobilier qui masque le
 * bas du corps après le personnage.
 */
export function Perso({ id, x, y, size, corps, corpsH = 0.7, corpsW = 1.08, sac, cravate, sol = false, rotate, flip, filter, opacity }: PersoProps) {
  const bw = Math.round(size * corpsW);
  const bh = Math.round(size * corpsH);
  const bx = Math.round(x + size / 2 - bw / 2);
  const by = Math.round(y + size * 0.8);
  const rx = Math.round(bw * 0.46);
  const ry = Math.round(Math.min(bh * 0.8, size * 0.36));
  const rb = Math.round(size * 0.1);
  return (
    <>
      {corps && sol ? <Ombre x={Math.round(bx - bw * 0.14)} y={Math.round(by + bh - size * 0.13)} w={Math.round(bw * 1.28)} h={Math.round(size * 0.26)} /> : null}
      {corps ? (
        <div
          style={{
            position: "absolute",
            left: bx,
            top: by,
            width: bw,
            height: bh,
            borderRadius: `${rx}px ${rx}px ${rb}px ${rb}px / ${ry}px ${ry}px ${rb}px ${rb}px`,
            background: `linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 36%, rgba(10,8,30,0.28) 100%), ${corps}`,
            boxShadow: `inset 0 ${Math.round(size * 0.12)}px ${Math.round(size * 0.1)}px rgba(10,8,30,0.3), 0 ${Math.round(size * 0.03)}px ${Math.round(size * 0.05)}px rgba(10,8,30,0.22)`,
            overflow: "hidden",
            opacity,
            pointerEvents: "none",
          }}
        >
          {sac ? (
            <>
              <div style={{ position: "absolute", left: "15%", top: 0, bottom: 0, width: "11%", background: sac, boxShadow: "inset -3px 0 0 rgba(10,8,30,0.2)" }} />
              <div style={{ position: "absolute", right: "15%", top: 0, bottom: 0, width: "11%", background: sac, boxShadow: "inset 3px 0 0 rgba(10,8,30,0.2)" }} />
            </>
          ) : null}
          {bh >= size && !cravate ? (
            <>
              <div
                style={{
                  position: "absolute",
                  left: "27%",
                  right: "27%",
                  top: Math.round(size * 0.62),
                  height: Math.round(size * 0.24),
                  borderRadius: `${Math.round(size * 0.1)}px ${Math.round(size * 0.1)}px ${Math.round(size * 0.04)}px ${Math.round(size * 0.04)}px`,
                  background: "rgba(10,8,30,0.14)",
                  boxShadow: "inset 0 3px 0 rgba(255,255,255,0.16)",
                }}
              />
              {[0.44, 0.56].map((p) => (
                <div
                  key={p}
                  style={{
                    position: "absolute",
                    left: `calc(${p * 100}% - ${Math.max(2, Math.round(size * 0.012))}px)`,
                    top: Math.round(size * 0.14),
                    width: Math.max(4, Math.round(size * 0.024)),
                    height: Math.round(size * 0.22),
                    borderRadius: 4,
                    background: "rgba(255,255,255,0.6)",
                  }}
                />
              ))}
            </>
          ) : null}
          {cravate ? (
            <>
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: Math.round(size * 0.08),
                  width: Math.round(size * 0.52),
                  height: Math.round(size * 0.34),
                  marginLeft: -Math.round(size * 0.26),
                  background: "#fdfcf7",
                  clipPath: "polygon(0 0, 100% 0, 50% 100%)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: Math.round(size * 0.16),
                  width: Math.round(size * 0.15),
                  height: Math.round(size * 0.6),
                  marginLeft: -Math.round(size * 0.075),
                  background: cravate,
                  clipPath: "polygon(28% 0, 72% 0, 62% 16%, 100% 84%, 50% 100%, 0 84%, 38% 16%)",
                }}
              />
            </>
          ) : null}
        </div>
      ) : null}
      <Emo id={id} x={x} y={y} size={size} rotate={rotate} flip={flip} filter={filter} opacity={opacity} />
    </>
  );
}

// ------------------------------------------------------------------ mobilier

/** Longue table vue de face (rangée de classe, table de réunion) : plateau clair + façade. */
export function Rangee({ x, y, w, h, tone = "#e6bd80", face = "#bd8c53", plateau = 0.28 }: { x: number; y: number; w: number; h: number; tone?: string; face?: string; plateau?: number }) {
  const ph = Math.max(12, Math.round(h * plateau));
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: ph - 2,
          bottom: 0,
          background: `repeating-linear-gradient(90deg, rgba(40,20,10,0.1) 0 3px, transparent 3px 250px), linear-gradient(180deg, rgba(10,8,30,0.3) 0, rgba(10,8,30,0) ${Math.min(34, h * 0.3)}px, rgba(10,8,30,0.14) 100%), ${face}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: ph,
          borderRadius: 5,
          background: `linear-gradient(180deg, rgba(255,255,255,0.4) 0, rgba(255,255,255,0.1) 30%, rgba(255,255,255,0) 100%), ${tone}`,
          boxShadow: "0 4px 0 rgba(60,35,15,0.35)",
        }}
      />
    </div>
  );
}

// ------------------------------------------------------------------ habillages de champs

/** Légende de mème classique : Anton blanc, contour noir, majuscules, pleine largeur. */
export function Legende({ id, y, h, x = 40, w = 920, max = 88, min = 40, valign = "middle" }: { id: string; y: number; h: number; x?: number; w?: number; max?: number; min?: number; valign?: "top" | "middle" | "bottom" }) {
  return <T id={id} x={x} y={y} w={w} h={h} font="meme" max={max} min={min} upper outline valign={valign} />;
}

/** Voile sombre dégradé derrière une légende OPTIONNELLE (disparaît avec elle). */
export function Voile({ id, y, h, vers = "bas", force = 0.55 }: { id: string; y: number; h: number; vers?: "haut" | "bas"; force?: number }) {
  return (
    <IfField id={id}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: y,
          width: 1000,
          height: h,
          background: `linear-gradient(${vers === "bas" ? "180deg" : "0deg"}, rgba(10,8,30,0) 0%, rgba(10,8,30,${force}) 100%)`,
          pointerEvents: "none",
        }}
      />
    </IfField>
  );
}

/**
 * Étiquette-nom collée sur un acteur ou un meuble (champ `kind: "name"`).
 * L'habillage disparaît quand le champ n'affiche rien.
 */
export function Etiquette({ id, x, y, w, h = 96, rotate = -3, color = C.yellow, max = 60, style }: { id: string; x: number; y: number; w: number; h?: number; rotate?: number; color?: string; max?: number; style?: CSSProperties }) {
  return (
    <IfField id={id}>
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: w,
          height: h,
          boxSizing: "border-box",
          border: `6px solid ${C.ink}`,
          borderRadius: 18,
          background: `linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0) 55%), ${color}`,
          boxShadow: "0 9px 0 rgba(20,19,43,0.4)",
          transform: rotate ? `rotate(${rotate}deg)` : undefined,
          ...style,
        }}
      >
        <T id={id} x={14} y={4} w={w - 40} h={h - 22} font="display" max={max} min={28} lh={1.02} />
      </div>
    </IfField>
  );
}

/** Calque en px du canevas pour dessiner du SVG original par-dessus le décor. */
export function Dessin({ x = 0, y = 0, w, h, children, style }: { x?: number; y?: number; w: number; h: number; children: ReactNode; style?: CSSProperties }) {
  return (
    <svg aria-hidden width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: "absolute", left: x, top: y, display: "block", overflow: "visible", pointerEvents: "none", ...style }}>
      {children}
    </svg>
  );
}
