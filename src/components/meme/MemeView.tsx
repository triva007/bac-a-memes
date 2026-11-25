"use client";

/**
 * MemeView — affiche un mème ({ templateId, values, stickers }) à n'importe
 * quelle taille : le gabarit est dessiné dans un canevas virtuel de 1000 px de
 * large, mis à l'échelle par un `transform: scale()` selon la largeur mesurée.
 *
 *   <MemeView meme={meme} />                              affichage (mode "final")
 *   <MemeView meme={meme} mode="edit" activeField={id} onFieldTap={fn} />
 *   <MemeView meme={meme} editableStickers onStickersChange={fn} />
 *   <MemeView meme={meme} fit="contain" />                tient dans un parent de taille fixe
 *   <TemplateThumb templateId="bulletin" />               vignette de sélecteur
 *   await exportMemePng(element, "mon-meme.png")          export PNG ×2
 */

import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type Ref,
} from "react";
import { flushSync } from "react-dom";
import type { Meme, Sticker } from "@/lib/game/types";
import { getMemeFields, getTemplate } from "@/lib/templates";
import packManifest from "@/lib/templates/pack-manifest.json";
import { CANVAS_W, FONT } from "./palette";
import { Emo, MemeProvider, emojiSrc, type MemeContextValue } from "./kit-core";
import { PersoRender, isPersoTemplateId, usePersoImage } from "./perso";

const FALLBACK_H = 640;
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

// ------------------------------------------------------------------ contenu du canevas

interface CanvasContentProps {
  templateId: string;
  values: Record<string, string>;
  mode: "edit" | "final";
  activeField: string | null;
  onFieldTap?: (fieldId: string) => void;
  ready: boolean;
  persoUrl: string | null;
  height: number;
}

const CanvasContent = memo(function CanvasContent({ templateId, values, mode, activeField, onFieldTap, ready, persoUrl, height }: CanvasContentProps) {
  const tpl = getTemplate(templateId);
  const placeholders = useMemo(() => {
    const map: Record<string, string> = {};
    for (const f of getMemeFields(templateId)) map[f.id] = f.placeholder;
    return map;
  }, [templateId]);
  const ctx = useMemo<MemeContextValue>(
    () => ({ values, mode, activeField, placeholders, onFieldTap, ready }),
    [values, mode, activeField, placeholders, onFieldTap, ready],
  );
  if (tpl) {
    const Render = tpl.Render;
    return (
      <MemeProvider value={ctx}>
        <Render values={values} mode={mode} activeField={activeField} />
      </MemeProvider>
    );
  }
  if (persoUrl) {
    return (
      <MemeProvider value={ctx}>
        <PersoRender url={persoUrl} height={height} />
      </MemeProvider>
    );
  }
  return <FallbackCard perso={isPersoTemplateId(templateId)} />;
});

/** Carte de repli : gabarit inconnu ou image perso supprimée. */
function FallbackCard({ perso }: { perso: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: "#1e1d40",
        backgroundImage:
          "linear-gradient(rgba(185,212,240,0.08) 2px, transparent 2px), linear-gradient(90deg, rgba(185,212,240,0.08) 2px, transparent 2px)",
        backgroundSize: "50px 50px",
      }}
    >
      <div style={{ position: "absolute", left: 90, top: 90, right: 90, bottom: 90, border: "6px dashed rgba(251,247,236,0.3)", borderRadius: 44 }} />
      <Emo id={perso ? "framed-picture" : "puzzle-piece"} x={400} y={150} size={200} filter="grayscale(0.35)" opacity={0.9} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 380, textAlign: "center", fontFamily: FONT.display, fontWeight: 800, fontSize: 62, color: "#fbf7ec" }}>
        {perso ? "Image supprimée" : "Gabarit introuvable"}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 466, textAlign: "center", fontFamily: FONT.sans, fontWeight: 500, fontSize: 34, color: "#8f8db3" }}>
        {perso ? "Cette image n'est plus dans le pack de la salle." : "Ce mème utilise un gabarit qui n'existe plus."}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ stickers

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const normAngle = (a: number) => {
  let r = ((a + 180) % 360) - 180;
  if (r < -180) r += 360;
  return r;
};
const roundSticker = (s: Sticker): Sticker => ({
  e: s.e,
  x: Math.round(clamp(s.x, 0, 1) * 10000) / 10000,
  y: Math.round(clamp(s.y, 0, 1) * 10000) / 10000,
  s: Math.round(clamp(s.s, 0.06, 0.6) * 10000) / 10000,
  r: Math.round(normAngle(s.r) * 10) / 10,
});

interface Gesture {
  index: number;
  kind: "move" | "handle";
  pointers: Map<number, { x: number; y: number }>;
  /** sticker au dernier point de référence */
  start: Sticker;
  current: Sticker;
  /** référence : barycentre, écart et angle des doigts (move) ou distance/angle au centre (handle) */
  cx: number;
  cy: number;
  dist: number;
  angle: number;
  moved: boolean;
}

function pointerStats(pointers: Map<number, { x: number; y: number }>) {
  const pts = Array.from(pointers.values());
  const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
  const cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
  if (pts.length < 2) return { cx, cy, dist: 0, angle: 0 };
  const dx = pts[1].x - pts[0].x;
  const dy = pts[1].y - pts[0].y;
  return { cx, cy, dist: Math.hypot(dx, dy), angle: (Math.atan2(dy, dx) * 180) / Math.PI };
}

interface StickerLayerProps {
  stickers: Sticker[];
  height: number;
  scale: number;
  editable: boolean;
  onChange?: (stickers: Sticker[]) => void;
}

function StickerLayer({ stickers, height, scale, editable, onChange }: StickerLayerProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [live, setLive] = useState<{ index: number; sticker: Sticker } | null>(null);
  const [prevLen, setPrevLen] = useState(stickers.length);

  // un sticker vient d'être ajouté : on le sélectionne ; la liste a rétréci : on désélectionne
  if (prevLen !== stickers.length) {
    setPrevLen(stickers.length);
    if (editable && stickers.length > prevLen) setSelected(stickers.length - 1);
    else setSelected(null);
  }

  const hasSelection = editable && selected !== null;
  useEffect(() => {
    if (!hasSelection) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (target && layerRef.current?.contains(target) && target.closest("[data-sticker]")) return;
      setSelected(null);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [hasSelection]);

  const commit = (g: Gesture) => {
    gesture.current = null;
    setLive(null);
    if (g.moved && onChange) onChange(stickers.map((s, i) => (i === g.index ? roundSticker(g.current) : s)));
  };

  const onStickerDown = (e: ReactPointerEvent<HTMLDivElement>, index: number) => {
    if (!editable) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelected(index);
    let g = gesture.current;
    if (!g || g.index !== index || g.kind !== "move") {
      const st = stickers[index];
      g = { index, kind: "move", pointers: new Map(), start: st, current: st, cx: 0, cy: 0, dist: 0, angle: 0, moved: false };
      gesture.current = g;
    }
    g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    Object.assign(g, pointerStats(g.pointers));
    g.start = g.current;
  };

  const onStickerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    const rect = layerRef.current?.getBoundingClientRect();
    if (!g || g.kind !== "move" || !rect || !g.pointers.has(e.pointerId) || rect.width === 0) return;
    g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const now = pointerStats(g.pointers);
    const next: Sticker = {
      ...g.start,
      x: clamp(g.start.x + (now.cx - g.cx) / rect.width, 0, 1),
      y: clamp(g.start.y + (now.cy - g.cy) / rect.height, 0, 1),
    };
    if (g.pointers.size >= 2 && g.dist > 0) {
      next.s = clamp(g.start.s * (now.dist / g.dist), 0.06, 0.6);
      next.r = normAngle(g.start.r + (now.angle - g.angle));
    }
    if (Math.abs(now.cx - g.cx) + Math.abs(now.cy - g.cy) > 2 || g.pointers.size >= 2) g.moved = true;
    g.current = next;
    setLive({ index: g.index, sticker: next });
  };

  const onStickerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.kind !== "move" || !g.pointers.has(e.pointerId)) return;
    g.pointers.delete(e.pointerId);
    if (g.pointers.size === 0) commit(g);
    else {
      Object.assign(g, pointerStats(g.pointers));
      g.start = g.current;
    }
  };

  const onHandleDown = (e: ReactPointerEvent<HTMLDivElement>, index: number) => {
    const rect = layerRef.current?.getBoundingClientRect();
    if (!editable || !rect) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const st = stickers[index];
    const cx = rect.left + st.x * rect.width;
    const cy = rect.top + st.y * rect.height;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    gesture.current = {
      index,
      kind: "handle",
      pointers: new Map([[e.pointerId, { x: e.clientX, y: e.clientY }]]),
      start: st,
      current: st,
      cx,
      cy,
      dist: Math.max(1, Math.hypot(dx, dy)),
      angle: (Math.atan2(dy, dx) * 180) / Math.PI,
      moved: false,
    };
  };

  const onHandleMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.kind !== "handle" || !g.pointers.has(e.pointerId)) return;
    const dx = e.clientX - g.cx;
    const dy = e.clientY - g.cy;
    const next: Sticker = {
      ...g.start,
      s: clamp(g.start.s * (Math.hypot(dx, dy) / g.dist), 0.06, 0.6),
      r: normAngle(g.start.r + (Math.atan2(dy, dx) * 180) / Math.PI - g.angle),
    };
    g.moved = true;
    g.current = next;
    setLive({ index: g.index, sticker: next });
  };

  const onHandleUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.kind !== "handle" || !g.pointers.has(e.pointerId)) return;
    commit(g);
  };

  const remove = (index: number) => {
    setSelected(null);
    onChange?.(stickers.filter((_, i) => i !== index));
  };

  const inv = scale > 0 ? 1 / scale : 1;
  const btn = 34 * inv; // taille visible des boutons, constante à l'écran
  const touch = 46 * inv; // cible tactile

  return (
    <div ref={layerRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 40 }}>
      {stickers.map((raw, i) => {
        const st = live && live.index === i ? live.sticker : raw;
        const size = clamp(st.s, 0.02, 1) * CANVAS_W;
        const isSel = editable && selected === i;
        const pad = 7 * inv;
        const half = size / 2 + pad;
        const hitPad = isSel ? Math.max(0, (100 * inv - size) / 2) : Math.max(0, (48 * inv - size) / 2);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: clamp(st.x, 0, 1) * CANVAS_W,
              top: clamp(st.y, 0, 1) * height,
              width: 0,
              height: 0,
              transform: `rotate(${st.r}deg)`,
              zIndex: isSel ? 2 : 1,
            }}
          >
            <div
              data-sticker={i}
              onPointerDown={editable ? (e) => onStickerDown(e, i) : undefined}
              onPointerMove={editable ? onStickerMove : undefined}
              onPointerUp={editable ? onStickerUp : undefined}
              onPointerCancel={editable ? onStickerUp : undefined}
              style={{
                position: "absolute",
                left: -size / 2 - hitPad,
                top: -size / 2 - hitPad,
                width: size + hitPad * 2,
                height: size + hitPad * 2,
                padding: hitPad,
                boxSizing: "border-box",
                touchAction: editable ? "none" : undefined,
                pointerEvents: editable ? "auto" : "none",
                cursor: editable ? "grab" : undefined,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={emojiSrc(st.e)}
                alt=""
                draggable={false}
                decoding="async"
                style={{
                  display: "block",
                  width: size,
                  height: size,
                  objectFit: "contain",
                  pointerEvents: "none",
                  userSelect: "none",
                  filter: `drop-shadow(0 ${(size * 0.03).toFixed(1)}px ${(size * 0.045).toFixed(1)}px rgba(10,8,30,0.4))`,
                }}
              />
            </div>
            {isSel ? (
              <>
                <div
                  data-export-ignore
                  style={{
                    position: "absolute",
                    left: -half,
                    top: -half,
                    width: half * 2,
                    height: half * 2,
                    boxSizing: "border-box",
                    border: `${2.5 * inv}px dashed #5df2a0`,
                    borderRadius: 10 * inv,
                    boxShadow: `0 0 0 ${1 * inv}px rgba(20,19,43,0.55)`,
                    pointerEvents: "none",
                  }}
                />
                <button
                  type="button"
                  data-sticker={i}
                  data-export-ignore
                  data-sticker-delete
                  aria-label="Supprimer le sticker"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => remove(i)}
                  style={{
                    position: "absolute",
                    left: -half - touch / 2,
                    top: -half - touch / 2,
                    width: touch,
                    height: touch,
                    padding: 0,
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    pointerEvents: "auto",
                    touchAction: "manipulation",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      left: (touch - btn) / 2,
                      top: (touch - btn) / 2,
                      width: btn,
                      height: btn,
                      boxSizing: "border-box",
                      borderRadius: "50%",
                      background: "#ff5fa2",
                      border: `${2.5 * inv}px solid #14132b`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg aria-hidden width={btn * 0.5} height={btn * 0.5} viewBox="0 0 24 24">
                      <path d="M5 5l14 14M19 5L5 19" stroke="#14132b" strokeWidth={4.5} strokeLinecap="round" />
                    </svg>
                  </span>
                </button>
                <div
                  data-sticker={i}
                  data-export-ignore
                  data-sticker-handle
                  role="img"
                  aria-label="Redimensionner et pivoter le sticker"
                  onPointerDown={(e) => onHandleDown(e, i)}
                  onPointerMove={onHandleMove}
                  onPointerUp={onHandleUp}
                  onPointerCancel={onHandleUp}
                  style={{
                    position: "absolute",
                    left: half - touch / 2,
                    top: half - touch / 2,
                    width: touch,
                    height: touch,
                    cursor: "nwse-resize",
                    pointerEvents: "auto",
                    touchAction: "none",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      left: (touch - btn) / 2,
                      top: (touch - btn) / 2,
                      width: btn,
                      height: btn,
                      boxSizing: "border-box",
                      borderRadius: "50%",
                      background: "#5df2a0",
                      border: `${2.5 * inv}px solid #14132b`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg aria-hidden width={btn * 0.56} height={btn * 0.56} viewBox="0 0 24 24">
                      <path d="M7 17 17 7M9.500 6.500H17.500V14.500M14.500 17.500H6.500V9.500" fill="none" stroke="#14132b" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
              </>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------ MemeView

export interface MemeViewProps {
  meme: Meme;
  /** "final" (défaut) : champs vides masqués ; "edit" : placeholders estompés + zones cliquables */
  mode?: "edit" | "final";
  /** champ en cours d'édition, surligné dans l'aperçu */
  activeField?: string | null;
  /** appelé quand on touche une zone de texte (mode "edit") */
  onFieldTap?: (fieldId: string) => void;
  /**
   * "width" (défaut) : prend 100 % de la largeur du parent, la hauteur suit le ratio du gabarit.
   * "contain" : tient en entier dans un parent de taille FIXE (largeur ET hauteur), centré.
   */
  fit?: "width" | "contain";
  /** stickers déplaçables / redimensionnables / supprimables */
  editableStickers?: boolean;
  /** nouvelle liste de stickers, appelée à la fin de chaque geste */
  onStickersChange?: (stickers: Sticker[]) => void;
  /** coins arrondis (défaut vrai) */
  rounded?: boolean;
  className?: string;
  style?: CSSProperties;
  /** ref de l'élément racine (à passer à `exportMemePng`) */
  ref?: Ref<HTMLDivElement>;
}

export function MemeView({
  meme,
  mode = "final",
  activeField = null,
  onFieldTap,
  fit = "width",
  editableStickers = false,
  onStickersChange,
  rounded = true,
  className,
  style,
  ref,
}: MemeViewProps) {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const tapRef = useRef(onFieldTap);
  useEffect(() => {
    tapRef.current = onFieldTap;
  }, [onFieldTap]);
  const stableTap = useCallback((id: string) => tapRef.current?.(id), []);

  const tpl = getTemplate(meme.templateId);
  const perso = usePersoImage(meme.templateId);
  const height = tpl?.height ?? perso?.height ?? FALLBACK_H;

  useIsoLayoutEffect(() => {
    const el = outerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let first = true;
    const ro = new ResizeObserver((entries) => {
      const r = entries[entries.length - 1].contentRect;
      const update = () =>
        setBox((prev) => (prev && Math.abs(prev.w - r.width) < 0.25 && Math.abs(prev.h - r.height) < 0.25 ? prev : { w: r.width, h: r.height }));
      if (first) {
        // première mesure : rendu synchrone, pour ne jamais peindre un canevas sans échelle
        first = false;
        flushSync(update);
      } else update();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      outerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  const scale = box ? (fit === "contain" ? Math.min(box.w / CANVAS_W, box.h / height) : box.w / CANVAS_W) : 0;
  const ready = scale > 0;
  const fw = CANVAS_W * scale;
  const fh = height * scale;

  return (
    <div
      ref={setRefs}
      className={className}
      data-meme-view=""
      data-template={meme.templateId}
      style={{
        position: "relative",
        width: "100%",
        ...(fit === "contain" ? { height: "100%" } : { aspectRatio: `${CANVAS_W} / ${height}` }),
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: box && fit === "contain" ? (box.w - fw) / 2 : 0,
          top: box && fit === "contain" ? (box.h - fh) / 2 : 0,
          width: fw,
          height: fh,
          overflow: "hidden",
          borderRadius: rounded ? Math.max(4, 26 * scale) : 0,
          visibility: ready ? "visible" : "hidden",
          background: "#14132b",
          isolation: "isolate",
        }}
      >
        <div
          data-meme-canvas=""
          data-canvas-height={height}
          lang="fr"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: CANVAS_W,
            height,
            overflow: "hidden",
            transform: `scale(${scale})`,
            transformOrigin: "0 0",
            background: "#14132b",
            color: "#14132b",
            fontFamily: FONT.sans,
            fontSize: 32,
            fontWeight: 400,
            fontStyle: "normal",
            lineHeight: 1.2,
            letterSpacing: "normal",
            textAlign: "left",
            textTransform: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
            WebkitTextSizeAdjust: "100%",
          }}
        >
          <CanvasContent
            templateId={meme.templateId}
            values={meme.values}
            mode={mode}
            activeField={mode === "edit" ? activeField : null}
            onFieldTap={mode === "edit" && onFieldTap ? stableTap : undefined}
            ready={ready}
            persoUrl={perso?.url ?? null}
            height={height}
          />
          {meme.stickers.length > 0 || editableStickers ? (
            <StickerLayer stickers={meme.stickers} height={height} scale={scale} editable={editableStickers} onChange={onStickersChange} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ TemplateThumb

/** Image source des gabarits du pack intégré (`pack-*`) : id -> URL dans /public/pack. */
const PACK_IMAGE_URL = new Map<string, string>((packManifest as { id: string; file: string }[]).map((e) => [e.id, `/pack/${encodeURIComponent(e.file)}`]));

export interface TemplateThumbProps {
  /** id du registre ou "perso:<imageId>" */
  templateId: string;
  /** "width" (défaut) ou "contain" (cellule de taille fixe) — voir MemeView */
  fit?: "width" | "contain";
  /** rend tout de suite, sans attendre que la vignette approche de l'écran */
  eager?: boolean;
  /**
   * Vignette « image seule » : pour les gabarits à légender (`pack-*`, `perso:*`),
   * n'affiche que l'image, recadrée (`object-fit: cover`) pour remplir la cellule
   * — sans le cadre blanc ni les bandeaux vides ; un GIF reste animé. La cellule
   * (carrée, 4:5…) est dimensionnée par le parent. L'image n'existe dans la page
   * que lorsqu'elle est à l'écran ou tout près : hors champ, un GIF ne tourne plus.
   * Sans effet sur les autres gabarits (rendu normal).
   */
  imageOnly?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Vignette d'un gabarit vide (placeholders visibles) pour le sélecteur.
 * Légère : le gabarit n'est monté que lorsque la vignette approche de l'écran.
 */
export function TemplateThumb({ templateId, fit = "width", eager = false, imageOnly = false, className, style }: TemplateThumbProps) {
  const holder = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(eager);
  const tpl = getTemplate(templateId);
  const perso = usePersoImage(templateId);
  const height = tpl?.height ?? perso?.height ?? FALLBACK_H;
  const meme = useMemo<Meme>(() => ({ templateId, values: {}, stickers: [] }), [templateId]);
  const coverUrl = imageOnly ? (perso?.url ?? PACK_IMAGE_URL.get(templateId) ?? null) : null;
  const cover = coverUrl !== null;
  const show = cover ? seen : eager || seen;

  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    if (!cover && show) return;
    if (typeof IntersectionObserver === "undefined") {
      const t = setTimeout(() => setSeen(true), 0);
      return () => clearTimeout(t);
    }
    const io = new IntersectionObserver(
      (entries) => {
        const last = entries[entries.length - 1];
        // image seule : on suit les entrées ET les sorties (un GIF hors champ est démonté)
        if (cover) setSeen(last.isIntersecting);
        else if (entries.some((e) => e.isIntersecting)) setSeen(true);
      },
      { rootMargin: cover ? "200px" : "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [show, cover]);

  if (cover) {
    return (
      <div ref={holder} className={className} style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "#1e1d40", ...style }} data-thumb-cover>
        {show ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="" aria-hidden draggable={false} decoding="async" loading={eager ? "eager" : "lazy"} className="thumb-cover" />
        ) : null}
      </div>
    );
  }

  return (
    <div
      ref={holder}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        ...(fit === "contain" ? { height: "100%" } : { aspectRatio: `${CANVAS_W} / ${height}` }),
        ...style,
      }}
    >
      {show ? <MemeView meme={meme} mode="edit" fit={fit} /> : null}
    </div>
  );
}

// ------------------------------------------------------------------ export PNG

const BLANK_PX = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
let fontCssCache: { key: string; css: string | undefined } | null = null;

const normCss = (s: string) => s.replace(/["'\s]/g, "").toLowerCase();

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}

/**
 * CSS @font-face à embarquer dans l'export : uniquement les fichiers de police
 * réellement chargés par la page (au lieu de tous les sous-ensembles déclarés).
 */
async function buildFontEmbedCss(): Promise<string | undefined> {
  const used = new Set<string>();
  document.fonts.forEach((f) => {
    if (f.status === "loaded") used.add([normCss(f.family), normCss(f.style), normCss(f.weight), normCss(f.unicodeRange)].join("|"));
  });
  const key = Array.from(used).sort().join(";");
  if (fontCssCache && fontCssCache.key === key) return fontCssCache.css;
  const jobs: Promise<string>[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      const st = rule.style;
      const family = st.getPropertyValue("font-family");
      const fStyle = st.getPropertyValue("font-style") || "normal";
      const weight = st.getPropertyValue("font-weight") || "400";
      const range = st.getPropertyValue("unicode-range") || "U+0-10FFFF";
      if (!used.has([normCss(family), normCss(fStyle), normCss(weight), normCss(range)].join("|"))) continue;
      const src = st.getPropertyValue("src");
      const m = /url\((["']?)([^"')]+)\1\)\s*format\((["']?)woff2/.exec(src) ?? /url\((["']?)([^"')]+)\1\)/.exec(src);
      if (!m) continue;
      const url = new URL(m[2], sheet.href ?? document.baseURI).href;
      jobs.push(
        fetch(url)
          .then((r) => r.blob())
          .then(blobToDataUrl)
          .then(
            (data) =>
              `@font-face{font-family:${family};font-style:${fStyle};font-weight:${weight};font-display:block;src:url(${data}) format("woff2");unicode-range:${range};}`,
          ),
      );
    }
  }
  let css: string | undefined;
  try {
    css = (await Promise.all(jobs)).join("\n") || undefined;
  } catch {
    css = undefined; // html-to-image fera son embarquement par défaut
  }
  fontCssCache = { key, css };
  return css;
}

export interface MemePngOptions {
  /** facteur appliqué au canevas de 1000 px (défaut 2 → image de 2000 px de large) */
  pixelRatio?: number;
}

/**
 * Rend en PNG le mème contenu dans `element` (la racine d'un <MemeView>, ou un
 * parent qui en contient un). Attend polices et images. Les poignées d'édition
 * des stickers sont exclues. Renvoie un Blob (pour `navigator.share`, etc.).
 */
export async function memeToPngBlob(element: HTMLElement, options: MemePngOptions = {}): Promise<Blob> {
  const canvas = element.matches("[data-meme-canvas]") ? element : element.querySelector<HTMLElement>("[data-meme-canvas]");
  if (!canvas) throw new Error("exportMemePng : aucun mème dans cet élément");
  const height = Number(canvas.dataset.canvasHeight) || canvas.offsetHeight;
  if (document.fonts?.ready) await document.fonts.ready;
  await Promise.all(
    Array.from(canvas.querySelectorAll("img")).map(async (img) => {
      img.loading = "eager";
      if (img.complete && img.naturalWidth > 0) return;
      try {
        await img.decode();
      } catch {
        /* image cassée : on exporte sans elle */
      }
    }),
  );
  const { toBlob } = await import("html-to-image");
  const fontEmbedCSS = await buildFontEmbedCss();
  const opts = {
    width: CANVAS_W,
    height,
    pixelRatio: options.pixelRatio ?? 2,
    cacheBust: false,
    includeQueryParams: true,
    imagePlaceholder: BLANK_PX,
    fontEmbedCSS,
    style: { transform: "none", left: "0", top: "0" },
    filter: (node: HTMLElement) => !(node instanceof HTMLElement && node.dataset.exportIgnore !== undefined),
  };
  // WebKit rend parfois les images au 2e passage seulement : on fait un tour de chauffe
  if (/^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent)) {
    try {
      await toBlob(canvas, opts);
    } catch {
      /* ignoré */
    }
  }
  const blob = await toBlob(canvas, opts);
  if (!blob) throw new Error("exportMemePng : le rendu a échoué");
  return blob;
}

/** Télécharge le mème contenu dans `element` en PNG ×2 (2000 px de large). */
export async function exportMemePng(element: HTMLElement, filename = "meme.png", options?: MemePngOptions): Promise<void> {
  const blob = await memeToPngBlob(element, options);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".png") ? filename : `${filename}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
