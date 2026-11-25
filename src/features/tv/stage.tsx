"use client";

/**
 * Cadre de l'écran de classe : tout est composé dans un canevas de 1920 px de
 * large (hauteur 1080 en 16:9, jusqu'à 1440 en 4:3) puis mis à l'échelle sur la
 * fenêtre. Les scènes travaillent donc en « px de maquette », jamais en px réels.
 */
import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";

export const STAGE_W = 1920;
/** hauteur de la barre du haut (px de maquette) */
export const BAR_H = 104;
/** marge latérale des scènes */
export const PAD = 48;

export interface StageDims {
  W: number;
  H: number;
  scale: number;
  /** hauteur utile sous la barre */
  bodyH: number;
}

const StageContext = createContext<StageDims>({ W: STAGE_W, H: 1080, scale: 1, bodyH: 1080 - BAR_H });

export function useStage(): StageDims {
  return useContext(StageContext);
}

function subscribe(cb: () => void) {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
}
const getSize = () => `${window.innerWidth}x${window.innerHeight}`;
const getServerSize = () => "";

export function Stage({ children, cursorHidden = false }: { children: ReactNode; cursorHidden?: boolean }) {
  const size = useSyncExternalStore(subscribe, getSize, getServerSize);
  const dims = useMemo(() => {
    if (!size) return null;
    const [vw, vh] = size.split("x").map(Number);
    if (!(vw > 0) || !(vh > 0)) return null;
    // le cadre suit la fenêtre entre 4:3 et 16:9 ; au-delà il est centré (bandes au fond de la charte)
    const aspect = Math.min(16 / 9, Math.max(4 / 3, vw / vh));
    const H = Math.round(STAGE_W / aspect);
    const scale = Math.min(vw / STAGE_W, vh / H);
    return { W: STAGE_W, H, scale, bodyH: H - BAR_H, left: (vw - STAGE_W * scale) / 2, top: (vh - H * scale) / 2 };
  }, [size]);

  return (
    <div
      className="fixed inset-0 overflow-hidden select-none"
      style={{
        cursor: cursorHidden ? "none" : "default",
        backgroundColor: "var(--color-ink)",
        backgroundImage: dims
          ? "linear-gradient(rgba(185,212,240,0.075) 1px, transparent 1px), linear-gradient(90deg, rgba(185,212,240,0.075) 1px, transparent 1px)"
          : undefined,
        backgroundSize: dims ? `${Math.max(16, 48 * dims.scale)}px ${Math.max(16, 48 * dims.scale)}px` : undefined,
      }}
    >
      {dims ? (
        <StageContext.Provider value={dims}>
          <div
            data-tv-stage=""
            style={{
              position: "absolute",
              left: dims.left,
              top: dims.top,
              width: dims.W,
              height: dims.H,
              transform: `scale(${dims.scale})`,
              transformOrigin: "0 0",
              color: "var(--color-paper)",
              fontFamily: "var(--font-sans)",
              fontSize: 32,
              lineHeight: 1.2,
            }}
          >
            {children}
          </div>
        </StageContext.Provider>
      ) : null}
    </div>
  );
}
