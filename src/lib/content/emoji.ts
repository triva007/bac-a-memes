/**
 * Manifeste d'emojis (Fluent Emoji 3D, 1 598 images dans /public/emoji).
 *
 * POIDS — ce module embarque l'index complet (libellés + mots-clés, ~125 Ko
 * brut / ~43 Ko gzip, généré depuis `emoji-data.json` par `gen-emoji-index.mjs`).
 *  - Écrans qui n'ont besoin que des images, des avatars ou des onglets de
 *    stickers : importer `./emoji-lite` (quelques Ko, aucune dépendance).
 *  - Recherche côté client : charger ce module à la demande, par ex.
 *    `const { searchEmoji } = await import("@/lib/content/emoji")`.
 *  - Côté serveur (validation des ids) : importer ce module directement.
 */
import { EMOJI_INDEX } from "./emoji-index.gen";
import { STICKER_GROUPS } from "./emoji-lite";

export { emojiUrl, AVATARS, STICKER_GROUPS, STICKER_IDS } from "./emoji-lite";
export type { StickerGroup, StickerGroupId } from "./emoji-lite";

export const EMOJI_GROUPS = [
  "visages",
  "gens",
  "animaux",
  "bouffe",
  "lieux",
  "activites",
  "objets",
  "symboles",
] as const;
export type EmojiGroup = (typeof EMOJI_GROUPS)[number];

export interface EmojiEntry {
  /** nom de fichier sans extension dans /public/emoji */
  id: string;
  /** libellé français (texte alternatif) */
  fr: string;
  g: EmojiGroup;
  tags: string[];
  /** caractère Unicode correspondant */
  ch: string;
}

/** Tous les emojis, dans l'ordre Unicode. */
export const EMOJI_LIST: readonly EmojiEntry[] = EMOJI_INDEX.split("\n").map((line) => {
  const [id, fr, g, tags, ch] = line.split("|");
  return { id, fr, g: EMOJI_GROUPS[Number(g)], tags: tags ? tags.split(";") : [], ch };
});

export const EMOJI_BY_ID: ReadonlyMap<string, EmojiEntry> = new Map(EMOJI_LIST.map((e) => [e.id, e]));

/** Vrai si `id` désigne une image existante de /public/emoji. */
export function isEmojiId(id: unknown): id is string {
  return typeof id === "string" && EMOJI_BY_ID.has(id);
}

/**
 * Emojis volontairement absents de la recherche (et des groupes) : geste
 * insultant. Ils restent des ids valides pour `isEmojiId`.
 */
export const EMOJI_HIDDEN: ReadonlySet<string> = new Set(["middle-finger"]);

/**
 * Mots que les lycéens tapent vraiment et qui ne figurent pas dans les
 * mots-clés Unicode. Ils comptent comme des tags (prioritaires).
 */
export const EMOJI_SLANG_TAGS: Readonly<Record<string, readonly string[]>> = {
  skull: ["mort de rire", "mdr", "ptdr", "dead", "je suis mort", "tête de mort"],
  "face-with-tears-of-joy": ["ptdr", "trop drôle", "pleure de rire"],
  "loudly-crying-face": ["pleure", "chiale", "larmes", "snif"],
  "rolling-on-the-floor-laughing": ["ptdr", "explosé"],
  moai: ["pierre", "impassible", "nonchalant", "sigma", "bro"],
  "clown-face": ["blague", "ridicule", "gênance", "cirque"],
  "nerd-face": ["intello", "euh en fait", "lunettes", "premier de la classe"],
  "melting-face": ["fond", "gênance", "malaise", "chaleur"],
  "grinning-face-with-sweat": ["oups", "gêné", "transpire", "malaise"],
  "downcast-face-with-sweat": ["transpire", "stress"],
  "anxious-face-with-sweat": ["transpire", "stress", "panique"],
  eyes: ["regarde", "je vois", "mate", "suspect"],
  fire: ["feu", "banger", "chaud", "flammes"],
  "hundred-points": ["100", "cent", "20/20", "parfait", "validé"],
  "thumbs-up": ["ok", "validé", "top", "like", "pouce"],
  "thumbs-down": ["nul", "flop", "dislike", "pouce"],
  brain: ["cerveau", "intelligent", "brainrot", "génie"],
  crown: ["roi", "reine", "boss", "goat"],
  goat: ["goat", "meilleur", "légende", "bouc"],
  wastebasket: ["poubelle", "nul", "claqué", "flop"],
  "police-car-light": ["red flag", "alerte", "sirène", "gyrophare", "attention"],
  "red-triangle-pointed-up": ["red flag", "drapeau rouge", "alerte"],
  "green-circle": ["green flag", "validé"],
  "check-mark-button": ["green flag", "validé", "ok", "oui"],
  "cross-mark": ["non", "faux", "refusé", "croix"],
  cooking: ["il a cuisiné", "cuisiner", "cuit", "poêle", "œuf au plat"],
  sparkles: ["aura", "paillettes", "brille", "glow up"],
  "smiling-face-with-sunglasses": ["bg", "stylé", "aura", "cool", "nonchalant"],
  "face-with-raised-eyebrow": ["sérieux", "suspect", "hein", "doute"],
  "saluting-face": ["oui chef", "respect", "salut"],
  "pleading-face": ["stp", "s'il te plaît", "pitié", "mignon"],
  "smirking-face": ["rizz", "malin", "sourire en coin"],
  "exploding-head": ["dinguerie", "choqué", "incroyable"],
  "face-screaming-in-fear": ["jumpscare", "peur", "choqué", "panique"],
  "flushed-face": ["gênance", "gêné", "choqué"],
  "sleeping-face": ["dodo", "sieste", "dort"],
  zzz: ["dodo", "sieste", "dort", "ennui"],
  "pile-of-poo": ["caca", "nul", "claqué"],
  robot: ["pnj", "ia", "bot"],
  "bust-in-silhouette": ["pnj", "anonyme", "inconnu"],
  ghost: ["ghosté", "fantôme", "vu"],
  trophy: ["gg", "victoire", "gagné", "w", "coupe"],
  "chart-decreasing": ["flop", "moyenne", "chute", "perte d'aura"],
  "chart-increasing": ["glow up", "moyenne", "progrès", "stonks"],
  "money-with-wings": ["argent", "thune", "ruiné"],
  "flexed-biceps": ["force", "courage", "muscle", "locked in"],
  "folded-hands": ["stp", "merci", "pitié", "prière"],
  "person-shrugging": ["jsp", "je sais pas", "bof", "tant pis"],
  "person-facepalming": ["gênance", "pfff", "désespoir"],
  "clapping-hands": ["bravo", "gg", "applaudissements", "masterclass"],
  rocket: ["décollage", "fusée", "speedrun"],
  "low-battery": ["1 %", "batterie", "fatigue", "plus de batterie"],
  "mobile-phone": ["téléphone", "tel", "portable", "smartphone"],
  backpack: ["sac", "cartable", "sac à dos"],
  "graduation-cap": ["bac", "diplôme", "parcoursup"],
  abacus: ["calculatrice", "maths", "calcul"],
  "straight-ruler": ["règle"],
  "triangular-ruler": ["équerre", "règle"],
  pencil: ["crayon", "stylo"],
  pen: ["stylo", "stylo bille"],
  memo: ["copie", "contrôle", "interro", "devoir", "dm"],
  "page-facing-up": ["copie", "feuille", "sujet"],
  books: ["livres", "manuels", "révisions", "cdi"],
  bell: ["sonnerie", "cloche"],
  "alarm-clock": ["réveil", "retard", "8 h"],
  bus: ["bus", "car", "transport"],
  "french-fries": ["frites", "self", "cantine"],
  "stuffed-flatbread": ["kebab", "grec", "tacos"],
  "fork-and-knife-with-plate": ["self", "cantine", "repas"],
  toilet: ["toilettes", "wc"],
  teacher: ["prof", "professeur", "enseignant"],
  "man-teacher": ["prof", "professeur"],
  "woman-teacher": ["prof", "professeure"],
  student: ["élève", "lycéen", "étudiant"],
  snail: ["lent", "retard", "escargot"],
  sloth: ["flemme", "paresseux", "lent"],
  snake: ["traître", "serpent"],
  "red-heart": ["cœur", "coeur", "amour", "love"],
  "broken-heart": ["cœur brisé", "coeur brisé", "triste"],
  headstone: ["rip", "tombe", "dead"],
  warning: ["attention", "alerte", "red flag"],
  "hourglass-not-done": ["temps", "sablier", "chrono"],
};

/** Normalise pour la recherche : minuscules, sans accents, sans ponctuation. */
export function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9%]+/g, " ")
    .trim();
}

interface SearchRow {
  entry: EmojiEntry;
  index: number;
  label: string;
  labelWords: string[];
  tags: string[];
  tagWords: string[];
  extra: string[];
  extraWords: string[];
  idWords: string[];
  /** bonus pour les emojis mis en avant dans le sélecteur */
  boost: number;
}

let searchRows: SearchRow[] | null = null;

function getSearchRows(): SearchRow[] {
  if (searchRows) return searchRows;
  const rank = new Map<string, number>();
  for (const group of STICKER_GROUPS) {
    const bonus = group.id === "classiques" ? 8 : 4;
    for (const id of group.ids) rank.set(id, Math.max(rank.get(id) ?? 0, bonus));
  }
  const words = (list: string[]) => list.flatMap((t) => t.split(" ")).filter(Boolean);
  searchRows = EMOJI_LIST.filter((e) => !EMOJI_HIDDEN.has(e.id)).map((entry, index) => {
    const label = normalizeSearch(entry.fr);
    const tags = entry.tags.map(normalizeSearch);
    const extra = (EMOJI_SLANG_TAGS[entry.id] ?? []).map(normalizeSearch);
    return {
      entry,
      index,
      label,
      labelWords: label.split(" ").filter(Boolean),
      tags,
      tagWords: words(tags),
      extra,
      extraWords: words(extra),
      idWords: entry.id.split("-"),
      boost: rank.get(entry.id) ?? 0,
    };
  });
  return searchRows;
}

/** Score d'un mot de la requête pour un emoji ; 0 = aucun rapport. */
function scoreToken(row: SearchRow, t: string): number {
  if (row.extra.includes(t) || row.extraWords.includes(t)) return 70;
  if (row.labelWords.includes(t)) return 60;
  if (row.tags.includes(t)) return 50;
  if (row.tagWords.includes(t)) return 45;
  if (row.labelWords.some((w) => w.startsWith(t))) return 40;
  if (row.extraWords.some((w) => w.startsWith(t))) return 35;
  if (row.tagWords.some((w) => w.startsWith(t))) return 30;
  if (row.idWords.includes(t)) return 25;
  if (row.idWords.some((w) => w.startsWith(t))) return 15;
  // les fragments de moins de 3 lettres ne comptent qu'en début de mot
  if (t.length >= 3) {
    if (row.label.includes(t)) return 12;
    if (row.tags.some((w) => w.includes(t)) || row.extra.some((w) => w.includes(t))) return 8;
  }
  return 0;
}

/**
 * Recherche sur l'ensemble des emojis (libellé français + mots-clés + quelques
 * mots d'argot lycéen), insensible aux accents et à la casse. Tous les mots de
 * la requête doivent correspondre. Résultats triés par pertinence.
 */
export function searchEmoji(query: string, limit = 48): EmojiEntry[] {
  const q = normalizeSearch(query);
  if (!q || limit <= 0) return [];
  const tokens = q.split(" ");
  const hits: { row: SearchRow; score: number }[] = [];
  for (const row of getSearchRows()) {
    let score = row.label === q ? 100 : row.extra.includes(q) ? 90 : row.tags.includes(q) ? 80 : 0;
    let ok = true;
    for (const t of tokens) {
      const s = scoreToken(row, t);
      if (s === 0) {
        ok = false;
        break;
      }
      score += s;
    }
    if (ok || score >= 80) hits.push({ row, score: score + row.boost });
  }
  hits.sort((a, b) => b.score - a.score || a.row.index - b.row.index);
  return hits.slice(0, limit).map((h) => h.row.entry);
}
