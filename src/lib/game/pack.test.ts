import { describe, expect, it } from "vitest";
import { PACK_CATEGORY, buildPool, dealHands } from "./deal";
import { makeRng } from "./rng";
import type { TemplateMeta } from "./types";

const FIELDS = [
  { id: "haut", maxLength: 90 },
  { id: "bas", maxLength: 90 },
];
const base: TemplateMeta[] = Array.from({ length: 30 }, (_, i) => ({
  id: `tpl-${i}`,
  category: ["reactions", "ecole", "ecrans", "cases", "affiches"][i % 5],
  fields: [{ id: "a", maxLength: 50 }],
}));
const pack = (n: number): TemplateMeta[] => Array.from({ length: n }, (_, i) => ({ id: `pack-${i}`, category: PACK_CATEGORY, fields: FIELDS }));
const isPack = (id: string) => id.startsWith("pack-");

describe("pack intégré (catégorie memes)", () => {
  it("fournit environ la moitié de chaque main", () => {
    const pool = buildPool([...base, ...pack(12)], [], [], 6);
    for (let seed = 0; seed < 40; seed++) {
      for (const handSize of [3, 4, 5, 6]) {
        const hands = dealHands({ pool, handSize, hands: 2, seen: {}, rand: makeRng("pack", seed) });
        for (const hand of hands) {
          expect(hand).toHaveLength(handSize);
          expect(new Set(hand).size).toBe(handSize);
          expect(hand.filter(isPack)).toHaveLength(Math.round(handSize / 2));
        }
      }
    }
  });

  it("ne dépasse pas ce que le pack contient et complète avec le catalogue", () => {
    const pool = buildPool([...base, ...pack(1)], [], [], 6);
    const [hand] = dealHands({ pool, handSize: 6, hands: 1, seen: {}, rand: makeRng("pack", 1) });
    expect(hand).toHaveLength(6);
    expect(hand.filter(isPack)).toHaveLength(1);
  });

  it("cohabite avec le pack perso", () => {
    const pool = buildPool([...base, ...pack(12)], ["perso:a", "perso:b", "perso:c"], [], 6);
    const [hand] = dealHands({ pool, handSize: 6, hands: 1, seen: {}, rand: makeRng("pack", 2) });
    expect(hand.filter(isPack)).toHaveLength(3);
    expect(hand.filter((id) => id.startsWith("perso:"))).toHaveLength(2);
    expect(hand).toHaveLength(6);
  });

  it("sans pack, ou avec le pack seul, rien ne change", () => {
    const none = dealHands({ pool: buildPool(base, [], [], 6), handSize: 6, hands: 1, seen: {}, rand: makeRng("pack", 3) })[0];
    expect(none.filter(isPack)).toHaveLength(0);
    const only = dealHands({ pool: buildPool([...base, ...pack(12)], [], [PACK_CATEGORY], 6), handSize: 6, hands: 1, seen: {}, rand: makeRng("pack", 3) })[0];
    expect(only.every(isPack)).toBe(true);
    expect(only).toHaveLength(6);
  });
});
