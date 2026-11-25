/**
 * Brouillon local de la manche : gabarit choisi, textes mémorisés par gabarit,
 * stickers, main affichée. Persisté en `sessionStorage` (clé salle + manche)
 * pour survivre à un rechargement de page.
 */
import { isPersoTemplateId } from "@/components/meme/perso";
import { MAX_STICKERS, PERSO_PREFIX, type CustomImage, type Meme, type RoomView, type Sticker } from "@/lib/game/types";
import { getMemeFields, getTemplate } from "@/lib/templates";

export interface DraftState {
  step: "pick" | "edit";
  templateId: string | null;
  /** textes saisis, mémorisés par gabarit : templateId -> fieldId -> texte */
  valuesByTpl: Record<string, Record<string, string>>;
  stickers: Sticker[];
  /** main affichée et main la plus lointaine déjà découverte */
  handIndex: number;
  revealed: number;
}

const EMPTY_DRAFT: DraftState = { step: "pick", templateId: null, valuesByTpl: {}, stickers: [], handIndex: 0, revealed: 0 };

/** Le gabarit existe-t-il encore (registre, ou image toujours dans le pack de la salle) ? */
export function templateExists(templateId: string, images: readonly CustomImage[]): boolean {
  if (isPersoTemplateId(templateId)) {
    const id = templateId.slice(PERSO_PREFIX.length);
    return images.some((i) => i.id === id);
  }
  return getTemplate(templateId) !== undefined;
}

export function templateLabel(templateId: string): string {
  if (isPersoTemplateId(templateId)) return "Image du pack perso";
  return getTemplate(templateId)?.name ?? "Gabarit";
}

/** Sélectionne un gabarit en reprenant ses textes mémorisés, sinon les champs de même id du gabarit quitté. */
export function selectTemplate(d: DraftState, templateId: string): DraftState {
  const previous = d.templateId ? (d.valuesByTpl[d.templateId] ?? {}) : {};
  const own = d.valuesByTpl[templateId] ?? {};
  const values: Record<string, string> = {};
  for (const f of getMemeFields(templateId)) {
    const v = own[f.id] || previous[f.id] || "";
    if (v) values[f.id] = v.slice(0, f.maxLength);
  }
  return { ...d, step: "edit", templateId, valuesByTpl: { ...d.valuesByTpl, [templateId]: values } };
}

export function setValue(d: DraftState, templateId: string, fieldId: string, value: string): DraftState {
  const current = d.valuesByTpl[templateId] ?? {};
  if ((current[fieldId] ?? "") === value) return d;
  return { ...d, valuesByTpl: { ...d.valuesByTpl, [templateId]: { ...current, [fieldId]: value } } };
}

/** Mème envoyé au serveur : uniquement les champs du gabarit, sans les vides. */
export function buildMeme(templateId: string, values: Record<string, string>, stickers: Sticker[]): Meme {
  const out: Record<string, string> = {};
  for (const f of getMemeFields(templateId)) {
    const v = values[f.id];
    if (v && v.trim()) out[f.id] = v;
  }
  return { templateId, values: out, stickers };
}

// ------------------------------------------------------------------ sessionStorage

const PREFIX = "bam:draft:";

export function draftKey(code: string, round: number, phaseEndsAt: number | null): string {
  return `${PREFIX}${code}:${round}:${phaseEndsAt ?? 0}`;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function cleanStickers(raw: unknown): Sticker[] {
  if (!Array.isArray(raw)) return [];
  const out: Sticker[] = [];
  for (const s of raw) {
    if (!isRecord(s) || typeof s.e !== "string") continue;
    const n = [s.x, s.y, s.s, s.r];
    if (!n.every((v) => typeof v === "number" && Number.isFinite(v))) continue;
    out.push({ e: s.e, x: s.x as number, y: s.y as number, s: s.s as number, r: s.r as number });
    if (out.length >= MAX_STICKERS) break;
  }
  return out;
}

function cleanValues(raw: unknown): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  if (!isRecord(raw)) return out;
  for (const [tpl, vals] of Object.entries(raw)) {
    if (!isRecord(vals)) continue;
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(vals)) if (typeof v === "string") clean[k] = v.slice(0, 2000);
    out[tpl] = clean;
  }
  return out;
}

function loadDraft(key: string): DraftState | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const d: unknown = JSON.parse(raw);
    if (!isRecord(d)) return null;
    const int = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0);
    return {
      step: d.step === "edit" ? "edit" : "pick",
      templateId: typeof d.templateId === "string" ? d.templateId : null,
      valuesByTpl: cleanValues(d.valuesByTpl),
      stickers: cleanStickers(d.stickers),
      handIndex: int(d.handIndex),
      revealed: int(d.revealed),
    };
  } catch {
    return null;
  }
}

export function saveDraft(key: string, draft: DraftState): void {
  try {
    const store = window.sessionStorage;
    // un seul brouillon conservé : on jette ceux des manches précédentes
    for (let i = store.length - 1; i >= 0; i--) {
      const k = store.key(i);
      if (k && k.startsWith(PREFIX) && k !== key) store.removeItem(k);
    }
    store.setItem(key, JSON.stringify(draft));
  } catch {
    /* stockage indisponible (navigation privée…) : tant pis */
  }
}

/**
 * État de départ, dans l'ordre : brouillon local, sinon dernier mème connu du
 * serveur, sinon page blanche. Toujours cohérent avec la manche en cours.
 */
export function initDraft(view: RoomView, key: string): DraftState {
  const create = view.create;
  if (!create) return EMPTY_DRAFT;
  const hands = create.hands;
  const forced = create.forcedTemplateId;
  let d: DraftState = loadDraft(key) ?? EMPTY_DRAFT;
  if (d === EMPTY_DRAFT && create.myMeme) {
    const m = create.myMeme;
    d = { ...EMPTY_DRAFT, step: "edit", templateId: m.templateId, valuesByTpl: { [m.templateId]: { ...m.values } }, stickers: cleanStickers(m.stickers) };
  }

  const lastHand = Math.max(0, hands.length - 1);
  const handIndex = Math.min(d.handIndex, lastHand);
  const revealed = Math.min(Math.max(d.revealed, handIndex), lastHand);
  d = { ...d, handIndex, revealed };

  if (forced) return { ...d, step: "edit", templateId: forced };
  const tpl = d.templateId;
  if (tpl) {
    const inHand = hands.some((h) => h.includes(tpl));
    const jokerOk = (view.me?.jokersLeft ?? 0) > 0 || create.myMeme?.templateId === tpl;
    if (!inHand && !jokerOk) return { ...d, step: "pick", templateId: null };
    // si le brouillon pointe vers une autre main, on rouvrira le sélecteur sur celle-là
    if (inHand && !hands[handIndex]?.includes(tpl)) {
      const at = hands.findIndex((h) => h.includes(tpl));
      if (at >= 0) d = { ...d, handIndex: at, revealed: Math.max(revealed, at) };
    }
  } else if (d.step === "edit") {
    d = { ...d, step: "pick" };
  }
  return d;
}
