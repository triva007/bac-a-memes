/**
 * Aléatoire DÉTERMINISTE du moteur.
 * Tout tirage passe par un PRNG dont la graine est dérivée de la graine de la
 * salle + du contexte (partie, manche, joueur, usage). Deux instances serveur
 * qui calculent la même transition obtiennent donc exactement le même résultat.
 */

/** Hachage 32 bits d'une chaîne (xmur3). */
export function hashString(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

/** PRNG mulberry32 : renvoie des nombres dans [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** PRNG dont la graine est le hachage des morceaux fournis. */
export function makeRng(...parts: (string | number)[]): () => number {
  return mulberry32(hashString(parts.join("|")));
}

/** Mélange de Fisher-Yates (renvoie une copie). */
export function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

export function pickOne<T>(items: readonly T[], rand: () => number): T {
  return items[Math.min(items.length - 1, Math.floor(rand() * items.length))];
}

/** Chaîne hexadécimale déterministe (PAS un secret fort : réservé aux tests / replis). */
export function deterministicHex(length: number, ...parts: (string | number)[]): string {
  const rand = makeRng(...parts);
  let out = "";
  while (out.length < length) out += Math.floor(rand() * 16).toString(16);
  return out;
}
