"use client";

/**
 * KIT — CŒUR : contexte du mème, <T> (texte de champ ajusté automatiquement),
 * <Emo> (emoji 3D), <Box> et <Txt> (briques de mise en page).
 * Importer depuis "@/components/meme/kit" (barrel), pas depuis ce fichier.
 */

import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { FONT, FONT_WEIGHT, type FontKey } from "./palette";

// ------------------------------------------------------------------ contexte

export interface MemeContextValue {
  values: Record<string, string>;
  mode: "edit" | "final";
  activeField: string | null;
  /** fieldId -> placeholder (rempli par MemeView à partir des champs du gabarit) */
  placeholders: Record<string, string>;
  /** appelé quand on touche une zone de texte en mode edit */
  onFieldTap?: (fieldId: string) => void;
  /** faux tant que le canevas n'est pas mesurable (conteneur masqué) */
  ready: boolean;
}

const MemeContext = createContext<MemeContextValue>({
  values: {},
  mode: "final",
  activeField: null,
  placeholders: {},
  ready: true,
});

export function MemeProvider({
  value,
  children,
}: {
  value: MemeContextValue;
  children: ReactNode;
}) {
  return <MemeContext.Provider value={value}>{children}</MemeContext.Provider>;
}

export function useMeme(): MemeContextValue {
  return useContext(MemeContext);
}

function cleanText(raw: string | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/\r/g, "")
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export interface FieldState {
  /** texte à afficher (valeur saisie, sinon placeholder en mode edit, sinon "") */
  text: string;
  /** vrai si `text` est le placeholder */
  isPlaceholder: boolean;
  /** vrai si rien ne doit s'afficher (champ vide en mode final) */
  hidden: boolean;
  active: boolean;
}

/** État d'affichage d'un champ (pour les composants du kit qui habillent un champ). */
export function useField(id: string): FieldState {
  const { values, mode, placeholders, activeField } = useMeme();
  const value = cleanText(values[id]);
  if (value) return { text: value, isPlaceholder: false, hidden: false, active: activeField === id };
  if (mode === "edit") {
    const ph = placeholders[id] ?? "";
    return { text: ph, isPlaceholder: true, hidden: !ph, active: activeField === id };
  }
  return { text: "", isPlaceholder: false, hidden: true, active: false };
}

/**
 * N'affiche ses enfants que si le champ `id` affiche quelque chose
 * (valeur saisie, ou placeholder en mode edit). Sert à faire disparaître
 * l'habillage d'un champ optionnel laissé vide (bulle, étiquette…).
 * `not` inverse la condition.
 */
export function IfField({ id, not, children }: { id: string; not?: boolean; children: ReactNode }) {
  const f = useField(id);
  return f.hidden === !!not ? <>{children}</> : null;
}

// ------------------------------------------------------------------ polices chargées

let fontEpoch = 0;
let fontsHooked = false;
const fontListeners = new Set<() => void>();
const fitCache = new Map<string, FitResult>();

function bumpFonts() {
  fontEpoch++;
  fitCache.clear();
  fontListeners.forEach((l) => l());
}

function subscribeFonts(cb: () => void) {
  if (!fontsHooked && typeof document !== "undefined" && document.fonts) {
    fontsHooked = true;
    document.fonts.addEventListener("loadingdone", bumpFonts);
    if (document.fonts.status !== "loaded") void document.fonts.ready.then(bumpFonts);
  }
  fontListeners.add(cb);
  return () => {
    fontListeners.delete(cb);
  };
}
const getFontEpoch = () => fontEpoch;
const getServerFontEpoch = () => 0;

// ------------------------------------------------------------------ ajustement du texte

interface FitResult {
  size: number;
  /** coupe les mots trop longs */
  brk: boolean;
  /** rien ne tient même au minimum : on coupe proprement */
  clip: boolean;
}

interface FitOptions {
  w: number;
  h: number;
  min: number;
  max: number;
  nowrap: boolean;
}

function fitText(inner: HTMLElement, o: FitOptions): FitResult {
  const st = inner.style;
  const fits = (size: number) => {
    st.fontSize = `${size}px`;
    return inner.offsetHeight <= o.h + 0.5 && inner.scrollWidth <= o.w + 0.5;
  };
  const search = (lo: number, hi: number): number | null => {
    if (fits(hi)) return hi;
    if (!fits(lo)) return null;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (fits(mid)) lo = mid;
      else hi = mid;
    }
    return lo;
  };
  const max = Math.max(8, Math.round(o.max));
  const min = Math.max(6, Math.min(max, Math.round(o.min)));
  const floor = Math.max(6, Math.min(min, Math.round(o.min * 0.6)));

  st.overflowWrap = "normal";
  st.wordBreak = "normal";
  if (o.nowrap) {
    const s = search(floor, max);
    return s !== null ? { size: s, brk: false, clip: false } : { size: floor, brk: false, clip: true };
  }
  // 1) sans couper les mots
  const s1 = search(min, max);
  if (s1 !== null) return { size: s1, brk: false, clip: false };
  // 2) en coupant les mots interminables
  st.overflowWrap = "anywhere";
  st.wordBreak = "break-word";
  const s2 = search(floor, max);
  if (s2 !== null) return { size: s2, brk: true, clip: false };
  return { size: floor, brk: true, clip: true };
}

function applyFit(outer: HTMLElement, inner: HTMLElement, r: FitResult, nowrap: boolean) {
  inner.style.fontSize = `${r.size}px`;
  inner.style.overflowWrap = r.brk ? "anywhere" : "normal";
  inner.style.wordBreak = r.brk ? "break-word" : "normal";
  outer.style.overflow = r.clip ? "hidden" : "";
  inner.style.textOverflow = r.clip && nowrap ? "ellipsis" : "";
  inner.style.overflow = r.clip && nowrap ? "hidden" : "";
  inner.style.maxWidth = r.clip && nowrap ? "100%" : "";
}

// ------------------------------------------------------------------ <T>

export interface TProps {
  /** id du champ du gabarit à afficher… */
  id?: string;
  /** …ou texte fixe (décor pré-rempli ajusté de la même façon) */
  text?: string;
  /** coin haut-gauche de la boîte (ignoré avec `flow`) */
  x?: number;
  y?: number;
  /** largeur de la boîte (largeur MAX avec `flow`) */
  w: number;
  /** hauteur de la boîte (hauteur MAX avec `flow`) */
  h: number;
  /**
   * Mode « dans le flux » : la boîte épouse le texte (bulles de discussion,
   * étiquettes) au lieu d'être posée en absolu. w/h deviennent des maximums.
   */
  flow?: boolean;
  /** police de la charte — défaut "meme" */
  font?: FontKey;
  /** taille de police maximale / minimale en px du canevas */
  max?: number;
  min?: number;
  align?: "left" | "center" | "right";
  valign?: "top" | "middle" | "bottom";
  /** tout en majuscules */
  upper?: boolean;
  color?: string;
  weight?: number;
  italic?: boolean;
  /** interligne (sans unité) */
  lh?: number;
  /** interlettrage en em */
  ls?: number;
  /** contour type légende de mème : true = noir, ou une couleur */
  outline?: boolean | string;
  /** épaisseur visible du contour en em (défaut 0.075) */
  outlineWidth?: number;
  /** text-shadow CSS libre (ex. halo de craie) */
  shadow?: string;
  /** fond collé au texte, ligne par ligne : surligneur fluo, sous-titres de vidéo… */
  mark?: string;
  /** une seule ligne (réduit la police, puis points de suspension) */
  nowrap?: boolean;
  /** rotation de la boîte en degrés */
  rotate?: number;
  z?: number;
  style?: CSSProperties;
}

const JUSTIFY = { top: "flex-start", middle: "center", bottom: "flex-end" } as const;
const ACTIVE_COLOR = "#5df2a0";

/**
 * Texte d'un champ ajusté automatiquement : cherche la plus grande taille de
 * police entre `min` et `max` qui tient dans la boîte w × h, sans couper les
 * mots si possible. Recalculé quand le texte change et quand les polices sont
 * chargées. Champ vide : placeholder estompé en mode "edit", rien en "final".
 */
export function T(props: TProps) {
  const {
    id,
    x = 0,
    y = 0,
    w,
    h,
    flow = false,
    font = "meme",
    align = "center",
    valign = "middle",
    upper = false,
    color,
    italic = false,
    ls,
    outline = false,
    outlineWidth = 0.075,
    shadow,
    mark,
    nowrap = false,
    rotate,
    z,
    style,
  } = props;
  const ctx = useMeme();
  const epoch = useSyncExternalStore(subscribeFonts, getFontEpoch, getServerFontEpoch);
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  const isField = props.text === undefined && id !== undefined;
  const value = isField ? cleanText(ctx.values[id]) : cleanText(props.text);
  const isPlaceholder = isField && !value && ctx.mode === "edit";
  const shown = value || (isPlaceholder ? (ctx.placeholders[id] ?? "") : "");
  const editable = isField && ctx.mode === "edit";
  const active = editable && ctx.activeField === id;

  const max = props.max ?? Math.min(h, 96);
  const min = Math.min(max, props.min ?? 30);
  const weight = props.weight ?? FONT_WEIGHT[font];
  const lh = props.lh ?? (font === "meme" ? 1.12 : font === "hand" ? 1.02 : 1.16);
  const ready = ctx.ready;

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner || !shown) return;
    if (outer.getClientRects().length === 0) return; // masqué : on mesurera plus tard
    const key = [font, weight, italic, upper, lh, ls, w, h, min, max, nowrap, flow, !!mark, shown].join("|");
    let r = fitCache.get(key);
    if (!r) {
      r = fitText(inner, { w, h, min, max, nowrap });
      if (document.fonts?.status === "loaded") {
        if (fitCache.size > 4000) fitCache.clear();
        fitCache.set(key, r);
      }
    }
    applyFit(outer, inner, r, nowrap);
  }, [shown, font, weight, italic, upper, lh, ls, w, h, min, max, nowrap, flow, mark, epoch, ready]);

  if (!shown) {
    // champ vide en mode final : rien. (En mode edit sans placeholder : zone cliquable vide.)
    if (!editable) return null;
  }

  // estimation de départ (rendu serveur / avant mesure)
  const guess = Math.max(
    min,
    Math.min(max, Math.sqrt((w * h) / (Math.max(shown.length, 1) * 0.62 * lh)) * (nowrap ? 0.6 : 0.9)),
  );
  const strokeColor = outline === true ? "#000" : outline || undefined;
  const fill = color ?? (outline ? "#fff" : "#14132b");

  const outerStyle: CSSProperties = flow
    ? { position: "relative", maxWidth: w, maxHeight: h, width: "fit-content" }
    : {
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        display: "flex",
        flexDirection: "column",
        justifyContent: JUSTIFY[valign],
      };
  const textStyle: CSSProperties = {
    position: "relative",
    width: flow ? "fit-content" : "100%",
    maxWidth: flow ? w : undefined,
    alignSelf: flow ? undefined : "stretch",
    whiteSpace: nowrap ? "pre" : "pre-wrap",
    textAlign: align,
    lineHeight: lh,
    letterSpacing: ls !== undefined ? `${ls}em` : undefined,
    textTransform: upper ? "uppercase" : undefined,
    fontStyle: italic ? "italic" : undefined,
    textShadow: shadow,
    color: fill,
    opacity: isPlaceholder ? (strokeColor ? 0.6 : 0.42) : 1,
    fontKerning: "normal",
  };

  return (
    <div
      ref={outerRef}
      data-field={isField ? id : undefined}
      onClick={editable && ctx.onFieldTap ? () => ctx.onFieldTap?.(id) : undefined}
      style={{
        ...outerStyle,
        fontFamily: FONT[font],
        fontWeight: weight,
        fontSize: guess,
        transform: rotate ? `rotate(${rotate}deg)` : undefined,
        zIndex: z,
        contain: flow ? undefined : "layout size style",
        cursor: editable && ctx.onFieldTap ? "pointer" : undefined,
        pointerEvents: editable && ctx.onFieldTap ? "auto" : "none",
        outline: active ? `7px dashed ${ACTIVE_COLOR}` : undefined,
        outlineOffset: active ? 7 : undefined,
        borderRadius: active ? 6 : undefined,
        ...style,
      }}
    >
      <div ref={innerRef} style={textStyle}>
        {strokeColor ? (
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              display: "block",
              color: strokeColor,
              WebkitTextStroke: `${outlineWidth * 2}em ${strokeColor}`,
              strokeLinejoin: "round",
              textShadow: `0 ${outlineWidth * 0.8}em 0 ${strokeColor}`,
            }}
          >
            {shown}
          </span>
        ) : null}
        <span
          style={
            mark
              ? {
                  position: "relative",
                  background: mark,
                  padding: "0.06em 0.3em 0.1em",
                  borderRadius: "0.22em",
                  boxDecorationBreak: "clone",
                  WebkitBoxDecorationBreak: "clone",
                }
              : { position: "relative" }
          }
        >
          {shown}
        </span>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ <Emo>

export function emojiSrc(id: string): string {
  return `/emoji/${/^[a-z0-9-]+$/.test(id) ? id : "red-question-mark"}.webp`;
}

export interface EmoProps {
  /** id d'emoji : nom de fichier de /public/emoji sans extension */
  id: string;
  /** coin haut-gauche (ignoré avec `inline`) */
  x?: number;
  y?: number;
  /** côté du carré, en px du canevas */
  size?: number;
  rotate?: number;
  /** miroir horizontal */
  flip?: boolean;
  /** ombre : "drop" (portée, défaut), "ground" (ellipse au sol), "glow" (halo clair) ou false */
  shadow?: "drop" | "ground" | "glow" | false;
  opacity?: number;
  /** dans le flux (inline-block) au lieu d'être posé en absolu */
  inline?: boolean;
  /** filtre CSS supplémentaire (ex. "grayscale(1)") */
  filter?: string;
  z?: number;
  style?: CSSProperties;
}

/** Emoji 3D (Fluent Emoji, /public/emoji/<id>.webp) positionné dans le canevas. */
export function Emo({
  id,
  x = 0,
  y = 0,
  size = 200,
  rotate = 0,
  flip = false,
  shadow = "drop",
  opacity,
  inline = false,
  filter,
  z,
  style,
}: EmoProps) {
  const filters: string[] = [];
  if (filter) filters.push(filter);
  if (shadow === "drop")
    filters.push(`drop-shadow(0 ${(size * 0.035).toFixed(1)}px ${(size * 0.05).toFixed(1)}px rgba(10,8,30,0.38))`);
  if (shadow === "glow") filters.push(`drop-shadow(0 0 ${(size * 0.09).toFixed(1)}px rgba(255,255,255,0.75))`);
  const transform = [rotate ? `rotate(${rotate}deg)` : "", flip ? "scaleX(-1)" : ""].join(" ").trim();
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={emojiSrc(id)}
      alt=""
      draggable={false}
      decoding="async"
      width={size}
      height={size}
      style={{
        display: "block",
        width: size,
        height: size,
        objectFit: "contain",
        transform: transform || undefined,
        filter: filters.length ? filters.join(" ") : undefined,
        userSelect: "none",
        pointerEvents: "none",
      }}
    />
  );
  return (
    <div
      style={{
        position: inline ? "relative" : "absolute",
        display: inline ? "inline-block" : undefined,
        verticalAlign: inline ? "middle" : undefined,
        flex: inline ? "none" : undefined,
        left: inline ? undefined : x,
        top: inline ? undefined : y,
        width: size,
        height: size,
        opacity,
        zIndex: z,
        pointerEvents: "none",
        ...style,
      }}
    >
      {shadow === "ground" ? (
        <div
          style={{
            position: "absolute",
            left: "12%",
            right: "12%",
            bottom: -size * 0.05,
            height: size * 0.16,
            borderRadius: "50%",
            background: "radial-gradient(closest-side, rgba(10,8,30,0.42), rgba(10,8,30,0))",
          }}
        />
      ) : null}
      {img}
    </div>
  );
}

// ------------------------------------------------------------------ <Box> / <Txt>

export interface BoxProps {
  x?: number;
  y?: number;
  w?: number | string;
  h?: number | string;
  /** fond CSS (couleur ou dégradé) */
  bg?: string;
  radius?: number | string;
  /** bordure CSS, ex. "6px solid #14132b" */
  border?: string;
  /** box-shadow CSS */
  shadow?: string;
  rotate?: number;
  opacity?: number;
  /** masque ce qui dépasse */
  clip?: boolean;
  z?: number;
  style?: CSSProperties;
  children?: ReactNode;
}

/** Rectangle posé en absolu ; ouvre un repère local pour ses enfants. */
export function Box({ x = 0, y = 0, w, h, bg, radius, border, shadow, rotate, opacity, clip, z, style, children }: BoxProps) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        background: bg,
        borderRadius: radius,
        border,
        boxSizing: "border-box",
        boxShadow: shadow,
        transform: rotate ? `rotate(${rotate}deg)` : undefined,
        opacity,
        overflow: clip ? "hidden" : undefined,
        zIndex: z,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export interface TxtProps {
  x?: number;
  y?: number;
  /** largeur : si donnée, le texte peut aller à la ligne et s'aligner dedans */
  w?: number;
  /** taille de police en px du canevas */
  size: number;
  font?: FontKey;
  color?: string;
  weight?: number;
  align?: "left" | "center" | "right";
  upper?: boolean;
  italic?: boolean;
  lh?: number;
  ls?: number;
  rotate?: number;
  opacity?: number;
  /** dans le flux au lieu d'être posé en absolu */
  inline?: boolean;
  shadow?: string;
  z?: number;
  style?: CSSProperties;
  children: ReactNode;
}

/** Texte FIXE du décor (pas d'ajustement automatique). */
export function Txt({
  x = 0,
  y = 0,
  w,
  size,
  font = "sans",
  color = "#14132b",
  weight,
  align = "left",
  upper,
  italic,
  lh = 1.15,
  ls,
  rotate,
  opacity,
  inline,
  shadow,
  z,
  style,
  children,
}: TxtProps) {
  return (
    <div
      style={{
        position: inline ? "relative" : "absolute",
        left: inline ? undefined : x,
        top: inline ? undefined : y,
        width: w,
        fontFamily: FONT[font],
        fontWeight: weight ?? FONT_WEIGHT[font],
        fontSize: size,
        lineHeight: lh,
        letterSpacing: ls !== undefined ? `${ls}em` : undefined,
        color,
        textAlign: align,
        textTransform: upper ? "uppercase" : undefined,
        fontStyle: italic ? "italic" : undefined,
        whiteSpace: w === undefined ? "nowrap" : "pre-wrap",
        transform: rotate ? `rotate(${rotate}deg)` : undefined,
        transformOrigin: "left center",
        opacity,
        textShadow: shadow,
        zIndex: z,
        pointerEvents: "none",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
