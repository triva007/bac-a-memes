/**
 * Distribution : mains de gabarits, gabarit imposé, cartes situation.
 * Fonctions pures ; l'aléatoire est fourni (`rand`) par l'appelant.
 */
import { SITUATIONS, resolveSituation } from "@/lib/content/situations";
import { pickOne, shuffle } from "./rng";
import { PERSO_CATEGORY, PERSO_PREFIX, type TemplateMeta } from "./types";

export interface Pool {
  /** gabarits du catalogue utilisables */
  base: TemplateMeta[];
  /** gabarits perso utilisables (ids "perso:<imageId>") */
  perso: string[];
  /** settings.categories vaut exactement ["perso"] : mains 100 % perso si possible */
  persoOnly: boolean;
}

export function persoTemplateId(imageId: string): string {
  return PERSO_PREFIX + imageId;
}

/**
 * Applique le filtre de catégories. `[]` = tout. Si le filtre laisse moins de
 * `minSize` gabarits, il est ignoré. `["perso"]` seul = pack perso uniquement
 * (le catalogue entier ne sert alors qu'à compléter).
 */
export function buildPool(catalog: TemplateMeta[], persoIds: string[], categories: string[], minSize: number): Pool {
  if (categories.length === 0) return { base: catalog, perso: persoIds, persoOnly: false };
  if (categories.length === 1 && categories[0] === PERSO_CATEGORY) {
    return { base: catalog, perso: persoIds, persoOnly: true };
  }
  const base = catalog.filter((t) => categories.includes(t.category));
  const perso = categories.includes(PERSO_CATEGORY) ? persoIds : [];
  if (base.length + perso.length < Math.max(1, minSize)) return { base: catalog, perso: persoIds, persoOnly: false };
  return { base, perso, persoOnly: false };
}

function lexLess(a: number[], b: number[]): boolean {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] < b[i];
  }
  return false;
}

export interface DealInput {
  pool: Pool;
  handSize: number;
  /** nombre de mains (1 + relances) */
  hands: number;
  /** gabarits déjà proposés à ce joueur : id -> numéro de distribution (plus petit = plus ancien) */
  seen: Record<string, number>;
  rand: () => number;
}

/**
 * Construit les mains d'un joueur pour une manche.
 * Priorités, dans l'ordre :
 *  1. pas de doublon entre les mains tant que la réserve le permet ;
 *  2. au moins 3 catégories différentes par main si possible ("perso" compte pour une) ;
 *  3. éviter les gabarits déjà proposés à ce joueur (sinon, les plus anciens d'abord) ;
 *  4. étaler les catégories ; 5. hasard.
 * Avec un pack perso : environ un tiers de chaque main (au moins 1) est perso.
 */
export function dealHands(input: DealInput): string[][] {
  const { pool, seen, rand } = input;
  const baseOrder = shuffle(pool.base, rand);
  const persoOrder = shuffle(pool.perso, rand);
  const size = Math.min(input.handSize, baseOrder.length + persoOrder.length);
  const usedInRound = new Set<string>();
  const hands: string[][] = [];
  if (size <= 0) return Array.from({ length: input.hands }, () => []);

  const baseCategories = new Set(baseOrder.map((t) => t.category)).size;

  for (let h = 0; h < input.hands; h++) {
    const hand: string[] = [];
    const catCount = new Map<string, number>();

    // --- part perso
    let wantPerso = 0;
    if (persoOrder.length > 0) {
      wantPerso = pool.persoOnly ? size : Math.max(1, Math.round(size / 3));
      wantPerso = Math.max(wantPerso, size - baseOrder.length);
      wantPerso = Math.min(wantPerso, persoOrder.length, size);
    }
    for (let n = 0; n < wantPerso; n++) {
      let best: string | null = null;
      let bestKey: number[] = [];
      for (let idx = 0; idx < persoOrder.length; idx++) {
        const id = persoOrder[idx];
        if (hand.includes(id)) continue;
        const key = [usedInRound.has(id) ? 1 : 0, id in seen ? 1 : 0, seen[id] ?? 0, idx];
        if (best === null || lexLess(key, bestKey)) {
          best = id;
          bestKey = key;
        }
      }
      if (best === null) break;
      hand.push(best);
    }
    if (hand.length > 0) catCount.set(PERSO_CATEGORY, hand.length);

    // --- part catalogue
    const targetCategories = Math.min(3, size, baseCategories + (hand.length > 0 ? 1 : 0));
    while (hand.length < size) {
      const needDiversity = catCount.size < targetCategories;
      let best: TemplateMeta | null = null;
      let bestKey: number[] = [];
      for (let idx = 0; idx < baseOrder.length; idx++) {
        const t = baseOrder[idx];
        if (hand.includes(t.id)) continue;
        const count = catCount.get(t.category) ?? 0;
        const key = [
          usedInRound.has(t.id) ? 1 : 0,
          needDiversity && count > 0 ? 1 : 0,
          t.id in seen ? 1 : 0,
          count,
          seen[t.id] ?? 0,
          idx,
        ];
        if (best === null || lexLess(key, bestKey)) {
          best = t;
          bestKey = key;
        }
      }
      if (best === null) break;
      hand.push(best.id);
      catCount.set(best.category, (catCount.get(best.category) ?? 0) + 1);
    }

    for (const id of hand) usedInRound.add(id);
    hands.push(shuffle(hand, rand));
  }
  return hands;
}

/**
 * Mode "meme-image" : tire le gabarit imposé à tous. S'il y a des images perso,
 * une chance sur deux que ce soit l'une d'elles. Évite ceux déjà imposés.
 */
export function pickForcedTemplate(pool: Pool, alreadyForced: string[], rand: () => number): string | null {
  const baseIds = pool.base.filter((t) => t.fields.length > 0).map((t) => t.id);
  const base = baseIds.length > 0 ? baseIds : pool.base.map((t) => t.id);
  const coin = rand();
  const usePerso = pool.perso.length > 0 && (pool.persoOnly || base.length === 0 || coin < 0.5);
  const list = usePerso ? pool.perso : base;
  if (list.length === 0) return null;
  const fresh = list.filter((id) => !alreadyForced.includes(id));
  return pickOne(fresh.length > 0 ? fresh : list, rand);
}

/** Mode "theme" : tire la situation imposée (id + texte résolu). Évite celles déjà imposées. */
export function pickTheme(
  alreadyUsed: string[],
  ctx: { profs: string[]; eleves: string[] },
  rand: () => number,
): { id: string; text: string } | null {
  if (SITUATIONS.length === 0) return null;
  const fresh = SITUATIONS.filter((s) => !alreadyUsed.includes(s.id));
  const chosen = pickOne(fresh.length > 0 ? fresh : SITUATIONS, rand);
  return { id: chosen.id, text: resolveSituation(chosen.text, ctx, rand) };
}

/**
 * Cartes situation d'un joueur pour une manche : on parcourt une permutation
 * propre au joueur (stable sur toute la partie), 3 par manche, donc sans
 * répétition tant que la réserve le permet.
 */
export function dealSituations(
  round: number,
  count: number,
  excludeId: string | null,
  ctx: { profs: string[]; eleves: string[] },
  permRand: () => number,
  rand: () => number,
): string[] {
  const candidates = shuffle(SITUATIONS, permRand).filter((s) => s.id !== excludeId);
  if (candidates.length === 0) return [];
  const n = Math.min(count, candidates.length);
  const start = ((round - 1) * count) % candidates.length;
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const s = candidates[(start + i) % candidates.length];
    out.push(resolveSituation(s.text, ctx, rand));
  }
  return out;
}
