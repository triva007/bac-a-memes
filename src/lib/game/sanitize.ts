/**
 * Nettoyage et validation de tout ce qui vient du client (noms, mèmes,
 * réglages, actions). Fonctions pures, sans état.
 */
import {
  LIMITS,
  MAX_STICKERS,
  PERSO_CATEGORY,
  type Action,
  type GameMode,
  type Meme,
  type Settings,
  type Sticker,
  type TemplateMeta,
  type VoteScore,
} from "./types";

/** ids d'emoji (avatars, stickers) et de catégories */
export const ID_RE = /^[a-z0-9-]{1,60}$/;
export const DEFAULT_AVATAR = "grinning-face";

const MODES: GameMode[] = ["classique", "meme-image", "theme"];
const UPLOADS: Settings["uploads"][] = ["all", "host", "off"];

/** caractères de contrôle (sauf \n), séparateurs de ligne exotiques exclus, marques bidi */
const CONTROL_RE = /[\u0000-\u0009\u000B-\u001F\u007F-\u009F\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Coupe à `max` unités UTF-16 sans casser une paire de substitution (emoji). */
function cut(s: string, max: number): string {
  if (s.length <= max) return s;
  let out = s.slice(0, max);
  const last = out.charCodeAt(out.length - 1);
  if (last >= 0xd800 && last <= 0xdbff) out = out.slice(0, -1);
  return out;
}

/** Texte d'un champ de mème : contrôle retiré, \n conservé, coupé à `max`. */
export function cleanText(raw: unknown, max: number): string {
  if (typeof raw !== "string") return "";
  const s = raw
    .slice(0, max * 4 + 64)
    .replace(/\r\n?/g, "\n")
    .replace(/[\u2028\u2029]/g, "\n")
    .replace(/\t/g, " ")
    .replace(CONTROL_RE, "")
    .replace(/\n{3,}/g, "\n\n");
  return cut(s, max);
}

/** Nom sur une seule ligne : trim, espaces multiples réduits, coupé à `max`. */
export function cleanName(raw: unknown, max: number): string {
  if (typeof raw !== "string") return "";
  const s = raw
    .slice(0, max * 4 + 64)
    .replace(/\s+/g, " ")
    .replace(CONTROL_RE, "")
    .replace(/ {2,}/g, " ")
    .trim();
  return cut(s, max).trim();
}

export function cleanAvatar(raw: unknown): string {
  return typeof raw === "string" && ID_RE.test(raw) ? raw : DEFAULT_AVATAR;
}

/** Rend `base` unique parmi `taken` (insensible à la casse) : « Léa », « Léa 2 », « Léa 3 »... */
export function uniqueName(base: string, taken: string[], max: number): string {
  const used = new Set(taken.map((n) => n.toLocaleLowerCase("fr")));
  if (!used.has(base.toLocaleLowerCase("fr"))) return base;
  for (let i = 2; i < 1000; i++) {
    const suffix = ` ${i}`;
    const candidate = cut(base, max - suffix.length).trim() + suffix;
    if (!used.has(candidate.toLocaleLowerCase("fr"))) return candidate;
  }
  return base;
}

/** Liste de noms (profs, autres) : nettoyée, sans vides, dédoublonnée, bornée. */
export function cleanNameList(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw.slice(0, 400)) {
    const name = cleanName(item, LIMITS.nameListItemMaxLength);
    if (!name) continue;
    const key = name.toLocaleLowerCase("fr");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length >= LIMITS.maxNames) break;
  }
  return out;
}

function clampInt(v: unknown, min: number, max: number): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.min(max, Math.max(min, Math.round(v)));
}

export type SettingsPatchResult = { ok: true; settings: Settings } | { ok: false; message: string };

/**
 * Applique un patch de réglages : chaque champ est validé et borné selon le
 * contrat. Un champ du mauvais type fait échouer tout le patch ; une valeur
 * hors bornes est ramenée dans les bornes ; les clés inconnues sont ignorées.
 * `knownCategories` : catégories du catalogue (null = pas de filtrage).
 */
export function applySettingsPatch(
  current: Settings,
  patch: unknown,
  knownCategories: ReadonlySet<string> | null,
): SettingsPatchResult {
  if (!isRecord(patch)) return { ok: false, message: "Réglages illisibles." };
  const next: Settings = { ...current };
  const bad = (field: string): SettingsPatchResult => ({ ok: false, message: `Réglage invalide : ${field}.` });

  if ("mode" in patch) {
    if (!MODES.includes(patch.mode as GameMode)) return bad("mode");
    next.mode = patch.mode as GameMode;
  }
  const ranges: [keyof Settings & ("rounds" | "createSeconds" | "voteSeconds" | "handSize" | "rerolls" | "jokers"), number, number][] = [
    ["rounds", 1, 8],
    ["createSeconds", 30, 240],
    ["voteSeconds", 6, 40],
    ["handSize", 3, 6],
    ["rerolls", 0, 4],
    ["jokers", 0, 5],
  ];
  for (const [key, min, max] of ranges) {
    if (key in patch) {
      const v = clampInt(patch[key], min, max);
      if (v === null) return bad(key);
      next[key] = v;
    }
  }
  if ("categories" in patch) {
    if (!Array.isArray(patch.categories)) return bad("categories");
    const cats: string[] = [];
    for (const c of patch.categories.slice(0, 100)) {
      if (typeof c !== "string" || !ID_RE.test(c) || cats.includes(c)) continue;
      if (knownCategories && c !== PERSO_CATEGORY && !knownCategories.has(c)) continue;
      cats.push(c);
      if (cats.length >= 24) break;
    }
    next.categories = cats;
  }
  if ("profs" in patch) {
    const list = cleanNameList(patch.profs);
    if (!list) return bad("profs");
    next.profs = list;
  }
  if ("extraNames" in patch) {
    const list = cleanNameList(patch.extraNames);
    if (!list) return bad("extraNames");
    next.extraNames = list;
  }
  if ("stickers" in patch) {
    if (typeof patch.stickers !== "boolean") return bad("stickers");
    next.stickers = patch.stickers;
  }
  if ("uploads" in patch) {
    if (!UPLOADS.includes(patch.uploads as Settings["uploads"])) return bad("uploads");
    next.uploads = patch.uploads as Settings["uploads"];
  }
  return { ok: true, settings: next };
}

function clampNum(v: unknown, min: number, max: number, decimals: number): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const f = 10 ** decimals;
  return Math.round(Math.min(max, Math.max(min, v)) * f) / f;
}

function cleanStickers(raw: unknown): Sticker[] {
  if (!Array.isArray(raw)) return [];
  const out: Sticker[] = [];
  for (const item of raw.slice(0, 64)) {
    if (!isRecord(item) || typeof item.e !== "string" || !ID_RE.test(item.e)) continue;
    const x = clampNum(item.x, 0, 1, 4);
    const y = clampNum(item.y, 0, 1, 4);
    const s = clampNum(item.s, 0.06, 0.6, 4);
    const r = clampNum(item.r, -180, 180, 1);
    if (x === null || y === null || s === null || r === null) continue;
    out.push({ e: item.e, x, y, s, r });
    if (out.length >= MAX_STICKERS) break;
  }
  return out;
}

/**
 * Reconstruit un mème propre pour le gabarit donné : uniquement les champs du
 * gabarit (tous présents, "" par défaut), textes nettoyés et coupés, stickers
 * valides et bornés (ignorés si les stickers sont désactivés).
 * Renvoie null si l'entrée n'a pas la forme d'un mème.
 */
export function sanitizeMeme(raw: unknown, template: TemplateMeta, allowStickers: boolean): Meme | null {
  if (!isRecord(raw)) return null;
  const rawValues = isRecord(raw.values) ? raw.values : {};
  const values: Record<string, string> = {};
  for (const field of template.fields) {
    const v = Object.prototype.hasOwnProperty.call(rawValues, field.id) ? rawValues[field.id] : "";
    values[field.id] = cleanText(v, field.maxLength);
  }
  return {
    templateId: template.id,
    values,
    stickers: allowStickers ? cleanStickers(raw.stickers) : [],
  };
}

/** Un mème « non vide » a au moins un champ rempli (ou un sticker si le gabarit n'a aucun champ). */
export function memeHasContent(meme: Meme): boolean {
  const values = Object.values(meme.values);
  if (values.length === 0) return meme.stickers.length > 0;
  return values.some((v) => v.trim().length > 0);
}

export function sameMeme(a: Meme | null, b: Meme | null): boolean {
  if (a === null || b === null) return a === b;
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Vérifie la FORME d'une action reçue en JSON (les contenus — mème, réglages,
 * noms — sont nettoyés ensuite par le moteur). Renvoie null si invalide.
 */
export function parseAction(raw: unknown): Action | null {
  if (!isRecord(raw) || typeof raw.type !== "string") return null;
  switch (raw.type) {
    case "join":
      if (typeof raw.name !== "string") return null;
      return { type: "join", name: raw.name, avatar: typeof raw.avatar === "string" ? raw.avatar : "" };
    case "leave":
    case "start":
    case "unsubmit":
    case "skip":
    case "again":
      return { type: raw.type };
    case "settings":
      if (!isRecord(raw.patch)) return null;
      return { type: "settings", patch: raw.patch as Partial<Settings> };
    case "kick":
      if (typeof raw.playerId !== "string" || raw.playerId.length > 80) return null;
      return { type: "kick", playerId: raw.playerId };
    case "draft":
    case "submit":
      if (!isRecord(raw.meme) || typeof raw.meme.templateId !== "string" || raw.meme.templateId.length > 120) return null;
      return { type: raw.type, meme: raw.meme as unknown as Meme, usedJoker: raw.usedJoker === true };
    case "vote":
      if (typeof raw.memeId !== "string" || raw.memeId.length > 80) return null;
      if (raw.score !== 0 && raw.score !== 1 && raw.score !== 2 && raw.score !== 3) return null;
      return { type: "vote", memeId: raw.memeId, score: raw.score as VoteScore };
    case "removeMeme":
      if (typeof raw.memeId !== "string" || raw.memeId.length > 80) return null;
      return { type: "removeMeme", memeId: raw.memeId };
    default:
      return null;
  }
}
