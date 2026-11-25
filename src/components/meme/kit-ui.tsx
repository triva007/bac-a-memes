"use client";

/**
 * KIT — INTERFACES : de quoi dessiner vite de faux écrans GÉNÉRIQUES
 * (aucune marque, aucun logo d'appli) : barre d'état, messagerie, notification,
 * vidéo verticale, commentaires, jauges, badges, bandeau d'info, tier list…
 */

import type { CSSProperties, ReactNode } from "react";
import { C, FONT } from "./palette";
import { Emo, T, Txt, useField } from "./kit-core";

interface Pos {
  x?: number;
  y?: number;
  w: number;
  h: number;
}

// ------------------------------------------------------------------ icônes

export type IconName =
  | "heart"
  | "comment"
  | "share"
  | "bookmark"
  | "send"
  | "search"
  | "mic"
  | "camera"
  | "back"
  | "more"
  | "phone"
  | "video"
  | "check"
  | "checks"
  | "pin"
  | "play"
  | "lock"
  | "bell"
  | "eye"
  | "plus"
  | "close"
  | "music"
  | "flag"
  | "star"
  | "clock"
  | "user"
  | "arrow-up"
  | "arrow-down"
  | "bolt"
  | "smile";

const sw = { fill: "none", stroke: "currentColor", strokeWidth: 2.3, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const ICONS: Record<IconName, ReactNode> = {
  heart: <path fill="currentColor" d="M12 21s-7.6-4.9-9.7-9.5C.8 8.2 2.7 4.4 6.4 4.4c2.2 0 3.9 1.2 5.6 3.3 1.7-2.1 3.4-3.3 5.6-3.3 3.7 0 5.6 3.8 4.1 7.1C19.6 16.1 12 21 12 21z" />,
  comment: <path fill="currentColor" d="M12 3.4c5.3 0 9.6 3.6 9.6 8.1s-4.3 8.1-9.6 8.1c-1.1 0-2.2-.2-3.2-.5L3.9 21l1.3-4.2c-1.7-1.4-2.8-3.3-2.8-5.3 0-4.5 4.3-8.1 9.6-8.1z" />,
  share: <path fill="currentColor" d="M13.4 4.2 22.2 12l-8.8 7.8v-4.7c-5.1 0-8.4 1.4-11.2 5.1.6-6.4 4.3-10.7 11.2-11.3V4.2z" />,
  bookmark: <path fill="currentColor" d="M6.2 3.2h11.6c.7 0 1.2.5 1.2 1.2V21l-7-4.7L5 21V4.4c0-.7.5-1.2 1.2-1.2z" />,
  send: <path fill="currentColor" d="M2.8 11.3 21.4 3.2l-6.5 17.9-3.6-7.4-8.5-2.4z" />,
  search: (
    <>
      <circle cx={10.5} cy={10.5} r={6.6} {...sw} />
      <path d="M15.6 15.6 21 21" {...sw} />
    </>
  ),
  mic: (
    <>
      <rect x={9} y={2.8} width={6} height={11.4} rx={3} fill="currentColor" />
      <path d="M5.4 11a6.6 6.6 0 0 0 13.2 0M12 17.6V21" {...sw} />
    </>
  ),
  camera: (
    <>
      <path fill="currentColor" d="M4 7.4h3.1L8.9 4.9h6.2l1.8 2.5H20c.9 0 1.6.7 1.6 1.6v9c0 .9-.7 1.6-1.6 1.6H4c-.9 0-1.6-.7-1.6-1.6V9c0-.9.7-1.6 1.6-1.6z" />
      <circle cx={12} cy={13.2} r={3.4} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth={1.8} />
    </>
  ),
  back: <path d="M15 4.5 7.5 12l7.5 7.5" {...sw} />,
  more: (
    <>
      <circle cx={12} cy={5} r={2} fill="currentColor" />
      <circle cx={12} cy={12} r={2} fill="currentColor" />
      <circle cx={12} cy={19} r={2} fill="currentColor" />
    </>
  ),
  phone: <path fill="currentColor" d="M6.4 3.2h3.1l1.6 4.7-2.3 1.6c1 2.3 2.7 4 5 5l1.6-2.3 4.7 1.6v3.1c0 1.2-1 2.1-2.1 2.1C10.300 18.800 5 13.400 4.300 5.300c0-1.200.900-2.100 2.100-2.100z" />,
  video: (
    <>
      <rect x={2.4} y={6} width={13.2} height={12} rx={2.6} fill="currentColor" />
      <path fill="currentColor" d="M16.4 10.6 21.8 7v10l-5.400-3.600z" />
    </>
  ),
  check: <path d="M4.5 12.5 9.5 17.500l10-11" {...sw} />,
  checks: <path d="M2.400 12.600 6.900 17l8.800-10M9.800 14.800 12 17l9.500-10" {...sw} />,
  pin: (
    <>
      <path fill="currentColor" d="M8.800 3.200h6.400l-1 5.600 3.600 3.700v1.700H6.200v-1.700l3.600-3.700-1-5.600z" />
      <path d="M12 14.200V21" {...sw} />
    </>
  ),
  play: <path fill="currentColor" d="M7 4.200v15.600L20 12 7 4.200z" />,
  lock: (
    <>
      <rect x={4.800} y={10.400} width={14.400} height={10.400} rx={2.600} fill="currentColor" />
      <path d="M8 10.400V8a4 4 0 0 1 8 0v2.400" {...sw} />
    </>
  ),
  bell: (
    <>
      <path fill="currentColor" d="M12 3.200a6.200 6.200 0 0 0-6.200 6.200c0 4.600-2 6.100-2 7.800h16.400c0-1.700-2-3.200-2-7.800A6.200 6.200 0 0 0 12 3.200z" />
      <path d="M10 19.800a2 2 0 0 0 4 0" {...sw} />
    </>
  ),
  eye: (
    <>
      <path fill="currentColor" d="M1.800 12S5.500 5.300 12 5.300 22.200 12 22.200 12 18.500 18.700 12 18.700 1.800 12 1.800 12z" />
      <circle cx={12} cy={12} r={3.200} fill="rgba(0,0,0,0.55)" />
    </>
  ),
  plus: <path d="M12 4.500v15M4.500 12h15" {...sw} strokeWidth={3} />,
  close: <path d="M5.500 5.500l13 13M18.500 5.500l-13 13" {...sw} strokeWidth={3} />,
  music: (
    <>
      <path d="M9.500 17.500V5.600l10-2.100v12" {...sw} />
      <circle cx={7} cy={17.600} r={2.800} fill="currentColor" />
      <circle cx={17} cy={15.600} r={2.800} fill="currentColor" />
    </>
  ),
  flag: (
    <>
      <path fill="currentColor" d="M5.500 4.500c5-2.500 7.600 2.500 13.100 0v9c-5.500 2.500-8.100-2.500-13.100 0v-9z" />
      <path d="M5.500 21V3.500" {...sw} strokeWidth={2.600} />
    </>
  ),
  star: <path fill="currentColor" d="m12 2.800 2.800 5.900 6.400.8-4.700 4.500 1.200 6.400L12 17.300l-5.700 3.100 1.200-6.400L2.800 9.500l6.400-.8L12 2.800z" />,
  clock: (
    <>
      <circle cx={12} cy={12} r={8.800} {...sw} />
      <path d="M12 7v5.400l3.600 2" {...sw} />
    </>
  ),
  user: (
    <>
      <circle cx={12} cy={8.400} r={4.200} fill="currentColor" />
      <path fill="currentColor" d="M3.800 21c.8-4.400 4.100-6.600 8.200-6.600s7.400 2.200 8.200 6.600H3.800z" />
    </>
  ),
  "arrow-up": <path d="M12 20V5M5.500 11.500 12 5l6.500 6.500" {...sw} strokeWidth={3} />,
  "arrow-down": <path d="M12 4v15M5.500 12.500 12 19l6.500-6.500" {...sw} strokeWidth={3} />,
  bolt: <path fill="currentColor" d="M13.500 2.500 4.500 13.500h6l-1.500 8 9.500-11.500h-6.200l1.200-7.500z" />,
  smile: (
    <>
      <circle cx={12} cy={12} r={9} {...sw} />
      <path d="M8 14c1 1.600 2.400 2.400 4 2.400s3-.8 4-2.400" {...sw} />
      <circle cx={9} cy={9.800} r={1.200} fill="currentColor" />
      <circle cx={15} cy={9.800} r={1.200} fill="currentColor" />
    </>
  ),
};

export interface IconProps {
  name: IconName;
  x?: number;
  y?: number;
  size?: number;
  color?: string;
  /** dans le flux au lieu d'être posé en absolu */
  inline?: boolean;
  /** ombre portée (lisibilité sur une vidéo) */
  shadow?: boolean;
  style?: CSSProperties;
}

/** Pictogramme d'interface original (tracés maison, viewBox 24). */
export function Icon({ name, x = 0, y = 0, size = 48, color = "#fff", inline, shadow, style }: IconProps) {
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
        filter: shadow ? "drop-shadow(0 3px 5px rgba(0,0,0,0.45))" : undefined,
        pointerEvents: "none",
        ...style,
      }}
    >
      {ICONS[name]}
    </svg>
  );
}

// ------------------------------------------------------------------ téléphone

export interface StatusBarProps {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  time?: string;
  color?: string;
  /** niveau de batterie 0..1 (rouge sous 20 %) */
  battery?: number;
}

/** Barre d'état de téléphone : heure, réseau, wifi, batterie. */
export function StatusBar({ x = 0, y = 0, w = 1000, h = 70, time = "23:58", color = "#fff", battery = 0.17 }: StatusBarProps) {
  const s = h / 70;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, color, pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 46 * s, top: 0, height: h, display: "flex", alignItems: "center", fontFamily: FONT.sans, fontWeight: 700, fontSize: 34 * s, letterSpacing: "0.01em" }}>{time}</div>
      <svg aria-hidden width={190 * s} height={h} viewBox="0 0 190 70" style={{ position: "absolute", right: 40 * s, top: 0 }}>
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={i * 11} y={43 - i * 6} width={7} height={10 + i * 6} rx={2} fill="currentColor" opacity={i === 3 ? 0.35 : 1} />
        ))}
        <path d="M60 32a22 22 0 0 1 32 0" fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" />
        <path d="M66 40a14 14 0 0 1 20 0" fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" />
        <circle cx={76} cy={49} r={4} fill="currentColor" />
        <rect x={112} y={24} width={62} height={30} rx={9} fill="none" stroke="currentColor" strokeWidth={3.5} opacity={0.75} />
        <rect x={177} y={33} width={6} height={12} rx={3} fill="currentColor" opacity={0.75} />
        <rect x={117} y={29} width={Math.max(6, 52 * Math.min(1, Math.max(0, battery)))} height={20} rx={5} fill={battery < 0.2 ? "#ff4d5e" : "currentColor"} />
      </svg>
    </div>
  );
}

export interface PhoneProps extends Pos {
  /** épaisseur du bord */
  bezel?: number;
  radius?: number;
  /** fond de l'écran */
  bg?: string;
  /** enfants dans le repère de l'écran : (w − 2·bezel) × (h − 2·bezel) */
  children?: ReactNode;
}

/** Cadre de téléphone (à utiliser quand le téléphone est un objet de la scène). */
export function Phone({ x = 0, y = 0, w, h, bezel = 20, radius = 78, bg = "#000", children }: PhoneProps) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: radius,
        background: "linear-gradient(145deg, #3a3a4d, #14141d 40%, #0a0a12)",
        boxShadow: "0 0 0 3px #05050a, 0 26px 50px rgba(8,6,30,0.5), inset 0 0 0 2px rgba(255,255,255,0.12)",
      }}
    >
      <div style={{ position: "absolute", inset: bezel, borderRadius: radius - bezel, background: bg, overflow: "hidden" }}>
        {children}
        <div style={{ position: "absolute", left: "50%", top: 16, width: 150, height: 40, marginLeft: -75, borderRadius: 20, background: "#000" }} />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ messagerie

export type ChatTheme = "dark" | "light";

const CHAT = {
  dark: { bg: "#14132b", bar: "#1e1d40", inBg: "#2c2a5a", inText: "#fbf7ec", outBg: "#7b5cff", outText: "#ffffff", sub: "rgba(251,247,236,0.6)", note: "rgba(255,255,255,0.1)", text: "#fbf7ec" },
  light: { bg: "#efe9dc", bar: "#fbf7ec", inBg: "#ffffff", inText: "#14132b", outBg: "#7b5cff", outText: "#ffffff", sub: "rgba(20,19,43,0.55)", note: "rgba(20,19,43,0.1)", text: "#14132b" },
} as const;

/** Rond d'avatar avec un emoji dedans. */
export function Avatar({ x = 0, y = 0, size = 84, emoji = "smiling-face-with-sunglasses", bg = C.yellow, ring, inline }: { x?: number; y?: number; size?: number; emoji?: string; bg?: string; ring?: string; inline?: boolean }) {
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
        boxShadow: ring ? `0 0 0 ${Math.max(3, size * 0.06)}px ${ring}` : undefined,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Emo id={emoji} size={Math.round(size * 0.74)} inline shadow={false} />
    </div>
  );
}

export interface ChatHeaderProps {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  title: string;
  subtitle?: string;
  /** emoji d'avatar du groupe / du contact */
  avatar?: string;
  avatarBg?: string;
  theme?: ChatTheme;
  /** remplace le titre fixe (ex. un <T> pour un nom saisi) — repère local : à droite de l'avatar */
  children?: ReactNode;
}

/** En-tête de conversation : retour, avatar, titre, sous-titre, appels. */
export function ChatHeader({ x = 0, y = 0, w = 1000, h = 150, title, subtitle, avatar = "graduation-cap", avatarBg = C.yellow, theme = "dark", children }: ChatHeaderProps) {
  const t = CHAT[theme];
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, background: t.bar, boxShadow: "0 4px 0 rgba(0,0,0,0.18)" }}>
      <Icon name="back" x={18} y={(h - 60) / 2} size={60} color={t.text} />
      <Avatar x={88} y={(h - 100) / 2} size={100} emoji={avatar} bg={avatarBg} />
      {children ?? (
        <>
          <Txt x={210} y={subtitle ? h / 2 - 54 : h / 2 - 28} size={46} font="display" color={t.text} w={w - 430} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {title}
          </Txt>
          {subtitle ? (
            <Txt x={210} y={h / 2 + 6} size={30} font="sans" weight={500} color={t.sub}>
              {subtitle}
            </Txt>
          ) : null}
        </>
      )}
      <Icon name="video" x={w - 196} y={(h - 58) / 2} size={58} color={t.text} />
      <Icon name="phone" x={w - 104} y={(h - 52) / 2} size={52} color={t.text} />
    </div>
  );
}

/**
 * Colonne de messages collée en bas (comme une vraie discussion) : ce qui
 * dépasse est coupé EN HAUT, donc les vieux messages du décor s'effacent
 * tout seuls quand le joueur écrit long.
 */
export function ChatColumn({ x = 0, y = 0, w, h, gap = 20, pad = 28, theme = "dark", children }: Pos & { gap?: number; pad?: number; theme?: ChatTheme; children?: ReactNode }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, overflow: "hidden", background: CHAT[theme].bg }}>
      <div style={{ position: "absolute", inset: 0, opacity: 0.5, backgroundImage: "radial-gradient(rgba(255,255,255,0.05) 2px, transparent 3px)", backgroundSize: "44px 44px" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", gap, padding: pad, boxSizing: "border-box" }}>{children}</div>
    </div>
  );
}

export interface ChatBubbleProps {
  /** "in" = message reçu (à gauche), "out" = mon message (à droite) */
  side?: "in" | "out";
  /** champ du gabarit affiché dans la bulle… */
  id?: string;
  /** …ou texte fixe du décor */
  text?: string;
  /** nom de l'expéditeur (texte fixe) */
  name?: string;
  /** champ du gabarit qui donne le nom de l'expéditeur */
  nameId?: string;
  nameColor?: string;
  /** emoji d'avatar (discussions de groupe) */
  avatar?: string;
  avatarBg?: string;
  time?: string;
  /** coches de lecture (messages "out") */
  checks?: boolean;
  theme?: ChatTheme;
  /** largeur / hauteur max du texte, taille de police max / min */
  maxW?: number;
  maxH?: number;
  max?: number;
  min?: number;
  /** couleur de bulle personnalisée */
  bg?: string;
  color?: string;
}

/** Bulle de messagerie (dans une <ChatColumn>) : épouse son texte, réduit la police si c'est long. */
export function ChatBubble({ side = "in", id, text, name, nameId, nameColor = C.orange, avatar, avatarBg = C.blue, time, checks, theme = "dark", maxW = 640, maxH = 260, max = 46, min = 30, bg, color }: ChatBubbleProps) {
  const field = useField(id ?? "");
  const t = CHAT[theme];
  if (id && text === undefined && field.hidden) return null;
  const out = side === "out";
  const fg = color ?? (out ? t.outText : t.inText);
  return (
    <div style={{ position: "relative", display: "flex", justifyContent: out ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 16 }}>
      {avatar && !out ? <Avatar inline size={76} emoji={avatar} bg={avatarBg} /> : null}
      <div
        style={{
          position: "relative",
          background: bg ?? (out ? t.outBg : t.inBg),
          color: fg,
          borderRadius: out ? "36px 36px 10px 36px" : "36px 36px 36px 10px",
          padding: "16px 28px 14px",
          boxShadow: "0 4px 0 rgba(0,0,0,0.16)",
          minWidth: 120,
        }}
      >
        {nameId ? (
          <T id={nameId} flow w={maxW} h={44} max={32} min={22} font="sans" weight={800} align="left" color={nameColor} nowrap />
        ) : name ? (
          <Txt inline size={30} font="sans" weight={800} color={nameColor}>
            {name}
          </Txt>
        ) : null}
        <T id={text === undefined ? id : undefined} text={text} flow w={maxW} h={maxH} max={max} min={min} font="sans" weight={500} align="left" color={fg} lh={1.22} />
        {time ? (
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 6, marginTop: 2, fontFamily: FONT.sans, fontWeight: 500, fontSize: 24, color: fg, opacity: 0.62 }}>
            {time}
            {checks ? <Icon name="checks" inline size={30} color={out ? "#bfe9ff" : fg} /> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Message système centré (« Aujourd'hui », « Le prof a rejoint le groupe »…). */
export function ChatNote({ children, theme = "dark" }: { children: ReactNode; theme?: ChatTheme }) {
  const t = CHAT[theme];
  return (
    <div style={{ alignSelf: "center", background: t.note, color: t.sub, borderRadius: 30, padding: "8px 26px", fontFamily: FONT.sans, fontWeight: 600, fontSize: 27, whiteSpace: "nowrap" }}>{children}</div>
  );
}

/** Barre de saisie en bas d'une conversation. */
export function ChatInput({ x = 0, y = 0, w = 1000, h = 120, placeholder = "Message", theme = "dark" }: Partial<Pos> & { placeholder?: string; theme?: ChatTheme }) {
  const t = CHAT[theme];
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, background: t.bar, boxShadow: "0 -4px 0 rgba(0,0,0,0.14)" }}>
      <Icon name="plus" x={30} y={(h - 56) / 2} size={56} color={t.sub} />
      <div style={{ position: "absolute", left: 110, right: 130, top: 22, bottom: 22, borderRadius: 40, background: t.note, display: "flex", alignItems: "center", padding: "0 34px", fontFamily: FONT.sans, fontWeight: 500, fontSize: 34, color: t.sub }}>{placeholder}</div>
      <div style={{ position: "absolute", right: 28, top: (h - 80) / 2, width: 80, height: 80, borderRadius: "50%", background: C.violet }}>
        <Icon name="mic" x={16} y={16} size={48} />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ notification

export interface NotifProps extends Pos {
  /** emoji de l'icône d'appli */
  icon?: string;
  iconBg?: string;
  /** nom générique de l'appli (pas de marque !) */
  app?: string;
  time?: string;
  theme?: "light" | "dark";
  /** enfants : repère local de la carte ; l'en-tête occupe les 86 px du haut */
  children?: ReactNode;
}

/** Carte de notification (écran verrouillé, bannière). */
export function Notif({ x = 0, y = 0, w, h, icon = "bell", iconBg = C.violet, app = "MESSAGES", time = "maintenant", theme = "light", children }: NotifProps) {
  const dark = theme === "dark";
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: 44,
        background: dark ? "rgba(30,29,64,0.9)" : "rgba(251,247,236,0.93)",
        boxShadow: "0 16px 40px rgba(8,6,30,0.35), inset 0 0 0 2px rgba(255,255,255,0.25)",
      }}
    >
      <div style={{ position: "absolute", left: 30, top: 24, width: 58, height: 58, borderRadius: 16, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Emo id={icon} size={42} inline shadow={false} />
      </div>
      <Txt x={106} y={36} size={29} font="sans" weight={700} color={dark ? "rgba(251,247,236,0.7)" : "rgba(20,19,43,0.6)"} ls={0.06} upper>
        {app}
      </Txt>
      <Txt x={0} y={36} w={w - 36} align="right" size={28} font="sans" weight={500} color={dark ? "rgba(251,247,236,0.55)" : "rgba(20,19,43,0.5)"}>
        {time}
      </Txt>
      {children}
    </div>
  );
}

// ------------------------------------------------------------------ badges et jauges

export interface BadgeProps {
  x?: number;
  y?: number;
  inline?: boolean;
  bg?: string;
  color?: string;
  /** taille du texte */
  size?: number;
  icon?: IconName;
  rotate?: number;
  border?: string;
  upper?: boolean;
  children: ReactNode;
}

/** Pastille / étiquette arrondie (EN DIRECT, +1000, NOUVEAU, niveau, rareté…). */
export function Badge({ x = 0, y = 0, inline, bg = C.pink, color = "#fff", size = 32, icon, rotate, border, upper = true, children }: BadgeProps) {
  return (
    <div
      style={{
        position: inline ? "relative" : "absolute",
        left: inline ? undefined : x,
        top: inline ? undefined : y,
        display: "inline-flex",
        alignItems: "center",
        gap: size * 0.3,
        flex: "none",
        background: bg,
        color,
        border,
        borderRadius: size,
        padding: `${size * 0.22}px ${size * 0.62}px`,
        fontFamily: FONT.display,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.1,
        letterSpacing: "0.03em",
        textTransform: upper ? "uppercase" : undefined,
        whiteSpace: "nowrap",
        transform: rotate ? `rotate(${rotate}deg)` : undefined,
        pointerEvents: "none",
      }}
    >
      {icon ? <Icon name={icon} inline size={size * 1.05} color={color} /> : null}
      {children}
    </div>
  );
}

export interface GaugeProps extends Pos {
  /** remplissage 0..1 */
  value: number;
  /** couleur ou dégradé du remplissage */
  color?: string;
  track?: string;
  radius?: number;
  /** contour CSS */
  border?: string;
  /** hachures en biais sur le remplissage */
  stripes?: boolean;
  /** découpe en n segments */
  segments?: number;
  inline?: boolean;
}

/** Jauge horizontale (barre de vie, d'aura, de flemme, de chargement…). */
export function Gauge({ x = 0, y = 0, w, h, value, color = C.green, track = "rgba(255,255,255,0.16)", radius, border, stripes, segments, inline }: GaugeProps) {
  const v = Math.min(1, Math.max(0, value));
  const rad = radius ?? h / 2;
  return (
    <div
      style={{
        position: inline ? "relative" : "absolute",
        left: inline ? undefined : x,
        top: inline ? undefined : y,
        width: w,
        height: h,
        flex: "none",
        borderRadius: rad,
        background: track,
        border,
        boxSizing: "border-box",
        overflow: "hidden",
        boxShadow: "inset 0 3px 6px rgba(0,0,0,0.25)",
      }}
    >
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${v * 100}%`, background: color, borderRadius: rad }}>
        {stripes ? <div style={{ position: "absolute", inset: 0, borderRadius: rad, background: "repeating-linear-gradient(115deg, rgba(255,255,255,0.22) 0 14px, transparent 14px 28px)" }} /> : null}
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: "45%", borderRadius: rad, background: "linear-gradient(180deg, rgba(255,255,255,0.4), rgba(255,255,255,0))" }} />
      </div>
      {segments
        ? Array.from({ length: segments - 1 }, (_, i) => <div key={i} style={{ position: "absolute", top: 0, bottom: 0, left: `${((i + 1) / segments) * 100}%`, width: 5, marginLeft: -2.5, background: "rgba(0,0,0,0.45)" }} />)
        : null}
    </div>
  );
}

export interface StatBarProps {
  x?: number;
  y?: number;
  w: number;
  label: string;
  /** valeur affichée à droite (0..max) */
  value: number;
  max?: number;
  color?: string;
  /** taille du texte */
  size?: number;
  /** largeur de la colonne des libellés */
  labelW?: number;
  textColor?: string;
}

/** Ligne de stat façon carte de joueur : LIBELLÉ ▓▓▓▓░░ 87. */
export function StatBar({ x = 0, y = 0, w, label, value, max = 99, color = C.green, size = 38, labelW = 280, textColor = "#fff" }: StatBarProps) {
  const numW = size * 1.9;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: size * 1.3, display: "flex", alignItems: "center", gap: size * 0.4 }}>
      <div style={{ width: labelW, flex: "none", fontFamily: FONT.display, fontWeight: 800, fontSize: size, color: textColor, textTransform: "uppercase", letterSpacing: "0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
      <Gauge inline w={w - labelW - numW - size * 0.8} h={size * 0.72} value={value / max} color={color} />
      <div style={{ width: numW, flex: "none", textAlign: "right", fontFamily: FONT.meme, fontSize: size * 1.25, lineHeight: 1, color: textColor }}>{value}</div>
    </div>
  );
}

// ------------------------------------------------------------------ vidéo verticale

export interface VideoUIProps extends Pos {
  /** pseudo affiché en bas à gauche (texte fixe) ; omettre pour poser son propre <T> */
  user?: string;
  /** description sous le pseudo */
  desc?: string;
  likes?: string;
  comments?: string;
  saves?: string;
  shares?: string;
  /** emoji de l'avatar du compte */
  avatar?: string;
  /** ligne du son */
  sound?: string;
  /** avancement de la vidéo 0..1 */
  progress?: number;
  /** onglets du haut ; false pour les masquer */
  tabs?: boolean;
}

/**
 * Habillage de vidéo verticale générique, à poser PAR-DESSUS une scène :
 * colonne d'actions à droite (130 px), pseudo/description/son en bas à gauche,
 * barre d'avancement. Zone libre pour le contenu : tout sauf la colonne droite.
 */
export function VideoUI({ x = 0, y = 0, w, h, user, desc, likes = "48,2 k", comments = "1 203", saves = "9 417", shares = "5 871", avatar = "smiling-face-with-sunglasses", sound = "son original", progress = 0.42, tabs = true }: VideoUIProps) {
  const cx = w - 78;
  const col: { icon: IconName; n: string; color?: string }[] = [
    { icon: "heart", n: likes, color: "#ff3b5c" },
    { icon: "comment", n: comments },
    { icon: "bookmark", n: saves },
    { icon: "share", n: shares },
  ];
  const base = h - 250 - col.length * 138;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, pointerEvents: "none", fontFamily: FONT.sans }}>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "36%", background: "linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,0.62))" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 170, background: "linear-gradient(180deg, rgba(0,0,0,0.4), rgba(0,0,0,0))" }} />
      {tabs ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 46, display: "flex", justifyContent: "center", gap: 44, fontWeight: 700, fontSize: 36, color: "#fff", textShadow: "0 2px 6px rgba(0,0,0,0.5)" }}>
          <span style={{ opacity: 0.6 }}>Suivis</span>
          <span style={{ borderBottom: "6px solid #fff", paddingBottom: 6 }}>Pour toi</span>
        </div>
      ) : null}
      {tabs ? <Icon name="search" x={w - 104} y={42} size={56} shadow /> : null}
      <div style={{ position: "absolute", left: cx - 50, top: base - 150 }}>
        <Avatar size={100} emoji={avatar} bg={C.yellow} ring="#fff" />
        <div style={{ position: "absolute", left: 30, top: 80, width: 40, height: 40, borderRadius: "50%", background: "#ff3b5c", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="plus" inline size={28} />
        </div>
      </div>
      {col.map((c, i) => (
        <div key={c.icon} style={{ position: "absolute", left: cx - 65, top: base + i * 138, width: 130, textAlign: "center" }}>
          <Icon name={c.icon} inline size={80} color={c.color ?? "#fff"} shadow style={{ margin: "0 auto" }} />
          <div style={{ fontWeight: 700, fontSize: 28, color: "#fff", textShadow: "0 2px 5px rgba(0,0,0,0.6)", marginTop: 2 }}>{c.n}</div>
        </div>
      ))}
      <div style={{ position: "absolute", left: cx - 46, top: h - 190, width: 92, height: 92, borderRadius: "50%", background: "conic-gradient(#14132b, #3a3866, #14132b, #3a3866, #14132b)", border: "5px solid rgba(255,255,255,0.3)", boxSizing: "border-box" }}>
        <Icon name="music" x={20} y={18} size={44} />
      </div>
      {user ? (
        <div style={{ position: "absolute", left: 36, bottom: desc ? 150 : 100, fontWeight: 800, fontSize: 40, color: "#fff", textShadow: "0 2px 6px rgba(0,0,0,0.6)" }}>{user}</div>
      ) : null}
      {desc ? (
        <div style={{ position: "absolute", left: 36, bottom: 98, width: w - 220, fontWeight: 500, fontSize: 34, color: "#fff", textShadow: "0 2px 6px rgba(0,0,0,0.6)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{desc}</div>
      ) : null}
      <div style={{ position: "absolute", left: 36, bottom: 42, display: "flex", alignItems: "center", gap: 12, fontWeight: 600, fontSize: 30, color: "#fff", textShadow: "0 2px 6px rgba(0,0,0,0.6)" }}>
        <Icon name="music" inline size={36} />
        {sound}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 10, background: "rgba(255,255,255,0.3)" }}>
        <div style={{ width: `${Math.min(1, Math.max(0, progress)) * 100}%`, height: "100%", background: "#fff", borderRadius: "0 5px 5px 0" }} />
      </div>
    </div>
  );
}

export interface CommentProps {
  x?: number;
  y?: number;
  w: number;
  /** dans le flux (liste de commentaires en flex) */
  inline?: boolean;
  /** champ du gabarit pour le texte… ou `text` fixe */
  id?: string;
  text?: string;
  /** pseudo fixe… ou champ du gabarit */
  name?: string;
  nameId?: string;
  avatar?: string;
  avatarBg?: string;
  /** ex. "il y a 2 h" */
  meta?: string;
  likes?: string;
  /** affiche la mention « Épinglé » */
  pinned?: boolean;
  theme?: "dark" | "light";
  /** fond arrondi translucide (commentaires de live posés sur une vidéo) */
  bubble?: boolean;
  maxH?: number;
  max?: number;
  min?: number;
}

/** Commentaire sous une vidéo / dans un live : avatar, pseudo, texte, cœur + compteur. */
export function Comment({ x = 0, y = 0, w, inline, id, text, name, nameId, avatar = "grinning-face-with-sweat", avatarBg = C.blue, meta, likes, pinned, theme = "dark", bubble, maxH = 150, max = 40, min = 28 }: CommentProps) {
  const field = useField(id ?? "");
  if (id && text === undefined && field.hidden) return null;
  const dark = theme === "dark";
  const fg = dark ? "#fff" : C.ink;
  const sub = dark ? "rgba(255,255,255,0.62)" : "rgba(20,19,43,0.55)";
  const padX = bubble ? 22 : 0;
  const textW = w - 96 - (likes ? 96 : 0) - padX * 2;
  return (
    <div
      style={{
        position: inline ? "relative" : "absolute",
        left: inline ? undefined : x,
        top: inline ? undefined : y,
        width: w,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "flex-start",
        gap: 20,
        padding: bubble ? `16px ${padX}px` : 0,
        borderRadius: bubble ? 34 : 0,
        background: bubble ? (dark ? "rgba(10,8,30,0.62)" : "rgba(255,255,255,0.9)") : undefined,
      }}
    >
      <Avatar inline size={76} emoji={avatar} bg={avatarBg} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: FONT.sans, fontWeight: 700, fontSize: 28, color: sub, whiteSpace: "nowrap" }}>
          {nameId ? <T id={nameId} flow w={textW - 190} h={40} max={28} min={20} font="sans" weight={700} align="left" color={sub} nowrap /> : name}
          {meta ? <span style={{ fontWeight: 500, opacity: 0.85 }}>· {meta}</span> : null}
        </div>
        {pinned ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: FONT.sans, fontWeight: 600, fontSize: 24, color: sub }}>
            <Icon name="pin" inline size={26} color={sub} /> Épinglé par le créateur
          </div>
        ) : null}
        <T id={text === undefined ? id : undefined} text={text} flow w={textW} h={maxH} max={max} min={min} font="sans" weight={600} align="left" color={fg} lh={1.2} />
      </div>
      {likes ? (
        <div style={{ width: 76, flex: "none", textAlign: "center", fontFamily: FONT.sans, fontWeight: 600, fontSize: 24, color: sub }}>
          <Icon name="heart" inline size={44} color={dark ? "rgba(255,255,255,0.75)" : "#ff3b5c"} style={{ margin: "6px auto 0" }} />
          {likes}
        </div>
      ) : null}
    </div>
  );
}

/** Pastilles « EN DIRECT » + nombre de spectateurs. */
export function LiveBadge({ x = 0, y = 0, label = "EN DIRECT", viewers = "1,2 k" }: { x?: number; y?: number; label?: string; viewers?: string }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, display: "flex", gap: 12, alignItems: "center", pointerEvents: "none" }}>
      <Badge inline bg="#ff2d55" size={30}>
        <span style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", display: "inline-block" }} />
        {label}
      </Badge>
      <Badge inline bg="rgba(10,8,30,0.6)" size={30} icon="eye" upper={false}>
        {viewers}
      </Badge>
    </div>
  );
}

// ------------------------------------------------------------------ bandeau d'info

export interface NewsBannerProps extends Pos {
  /** étiquette rouge au-dessus du bandeau */
  label?: string;
  color?: string;
  time?: string;
  /** nom de chaîne inventé (deux mots max) */
  channel?: string;
  /** texte fixe du déroulant du bas */
  ticker?: string;
  /** enfants dans le bandeau blanc : repère local w × (h − 150) */
  children?: ReactNode;
}

/** Bandeau de chaîne d'info : étiquette « ALERTE INFO », bandeau titre, déroulant avec l'heure. */
export function NewsBanner({ x = 0, y = 0, w, h, label = "ALERTE INFO", color = C.redPen, time = "08:02", channel = "LYCÉE INFO", ticker = "", children }: NewsBannerProps) {
  const tabH = 80;
  const tickH = 70;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, filter: "drop-shadow(0 -6px 18px rgba(0,0,0,0.3))" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          height: tabH,
          padding: "0 70px 0 36px",
          display: "flex",
          alignItems: "center",
          background: color,
          color: "#fff",
          fontFamily: FONT.display,
          fontWeight: 800,
          fontStyle: "italic",
          fontSize: 50,
          letterSpacing: "0.02em",
          whiteSpace: "nowrap",
          clipPath: "polygon(0 0, 100% 0, calc(100% - 44px) 100%, 0 100%)",
        }}
      >
        {label}
      </div>
      <div style={{ position: "absolute", right: 0, top: 8, height: tabH - 8, padding: "0 26px", display: "flex", alignItems: "center", gap: 10, background: C.ink, color: "#fff", fontFamily: FONT.display, fontWeight: 800, fontSize: 34, whiteSpace: "nowrap", borderRadius: "14px 0 0 0" }}>
        <span style={{ width: 18, height: 18, borderRadius: "50%", background: color, display: "inline-block" }} />
        {channel}
      </div>
      <div style={{ position: "absolute", left: 0, top: tabH, width: w, height: h - tabH - tickH, background: "linear-gradient(180deg, #ffffff, #ece8dc)", borderLeft: `18px solid ${color}`, boxSizing: "border-box" }}>
        <div style={{ position: "absolute", left: -18, top: 0, width: w, height: h - tabH - tickH }}>{children}</div>
      </div>
      <div style={{ position: "absolute", left: 0, bottom: 0, width: w, height: tickH, background: C.ink, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 170, background: C.yellow, color: C.ink, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.display, fontWeight: 800, fontSize: 40 }}>{time}</div>
        <div style={{ position: "absolute", left: 196, top: 0, bottom: 0, right: 0, display: "flex", alignItems: "center", fontFamily: FONT.sans, fontWeight: 600, fontSize: 31, color: "#fff", whiteSpace: "nowrap" }}>{ticker}</div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ tier list

export interface TierRowProps extends Pos {
  /** lettre du rang : S, A, B… */
  label: string;
  color: string;
  /** largeur de la case de la lettre (défaut = h) */
  labelW?: number;
  /** enfants dans la zone de contenu : repère local (w − labelW) × h */
  children?: ReactNode;
}

/** Une rangée de tier list : case colorée avec la lettre + bande sombre pour le contenu. */
export function TierRow({ x = 0, y = 0, w, h, label, color, labelW, children }: TierRowProps) {
  const lw = labelW ?? h;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, background: "#1b1a36", boxShadow: "inset 0 -5px 0 #0b0a1c, inset 0 3px 0 rgba(255,255,255,0.05)" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: lw,
          height: h,
          background: `linear-gradient(180deg, rgba(255,255,255,0.25), rgba(255,255,255,0) 50%, rgba(0,0,0,0.12)), ${color}`,
          boxShadow: "inset 0 -5px 0 rgba(0,0,0,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT.display,
          fontWeight: 800,
          fontSize: Math.min(h * 0.6, lw * 0.62),
          color: C.ink,
        }}
      >
        {label}
      </div>
      <div style={{ position: "absolute", left: lw, top: 0, width: w - lw, height: h }}>{children}</div>
    </div>
  );
}
