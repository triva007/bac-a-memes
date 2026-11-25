import { describe, expect, it } from "vitest";
import { PACK_CATEGORY, buildPool, dealHands, pickForcedTemplate } from "./deal";
import { createRoom, defaultCategories } from "./engine";
import { Sim } from "./testkit";
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

describe("pack intégré : par défaut, uniquement les mèmes connus", () => {
  const catalog = [...base, ...pack(20)];
  const memeOf = (templateId: string) => ({ templateId, values: { haut: "texte" }, stickers: [] });
  const host = { id: "p1", token: "t".repeat(40), name: "Hôte", avatar: "fox" };

  it("réglages par défaut : pack (+ perso) si le catalogue le contient, sinon tout", () => {
    expect(defaultCategories(catalog)).toEqual([PACK_CATEGORY, "perso"]);
    expect(defaultCategories(base)).toEqual([]);
    expect(defaultCategories(undefined)).toEqual([]);
    const withPack = createRoom({ code: "ABCD", seed: "s", now: 1, host, catalog });
    const without = createRoom({ code: "ABCD", seed: "s", now: 1, host, catalog: base });
    expect(withPack.ok && withPack.room.settings.categories).toEqual([PACK_CATEGORY, "perso"]);
    expect(without.ok && without.room.settings.categories).toEqual([]);
  });

  it("mains 100 % pack (+ perso), sans complément par d'autres catégories", () => {
    const only = buildPool(catalog, [], [PACK_CATEGORY, "perso"], 6);
    expect(only.base.every((t) => t.category === PACK_CATEGORY)).toBe(true);
    for (let seed = 0; seed < 30; seed++) {
      const hands = dealHands({ pool: only, handSize: 6, hands: 3, seen: {}, rand: makeRng("only", seed) });
      expect(hands.flat().every(isPack)).toBe(true);
      expect(new Set(hands.flat()).size).toBe(18);
    }
    const withPerso = buildPool(catalog, ["perso:a", "perso:b"], [PACK_CATEGORY, "perso"], 6);
    const [hand] = dealHands({ pool: withPerso, handSize: 6, hands: 1, seen: {}, rand: makeRng("only", 1) });
    expect(hand.filter((id) => id.startsWith("perso:"))).toHaveLength(2);
    expect(hand.filter(isPack)).toHaveLength(4);
  });

  it("gabarit imposé (mode même image) tiré dans les catégories activées", () => {
    const pool = buildPool(catalog, [], [PACK_CATEGORY, "perso"], 6);
    for (let seed = 0; seed < 50; seed++) expect(isPack(pickForcedTemplate(pool, [], makeRng("f", seed)) ?? "")).toBe(true);
  });

  it("en partie : mains du pack seulement ; joker refusé vers une catégorie désactivée, accepté dans le pack", () => {
    const sim = new Sim({ players: 2, catalog, settings: { categories: [PACK_CATEGORY, "perso"], handSize: 4, rerolls: 1, jokers: 2 } });
    sim.must("p1", { type: "start" });
    const hands = sim.view("p1").create?.hands ?? [];
    expect(hands.flat().length).toBe(8);
    expect(hands.flat().every(isPack)).toBe(true);
    expect(sim.act("p1", { type: "submit", meme: memeOf("tpl-3"), usedJoker: true })).toMatchObject({ ok: false, error: "invalid" });
    const outside = catalog.find((t) => t.category === PACK_CATEGORY && !hands.flat().includes(t.id));
    expect(sim.act("p1", { type: "submit", meme: memeOf(outside?.id ?? ""), usedJoker: true })).toMatchObject({ ok: true });
  });

  it("l'hôte peut réactiver les formats originaux : le joker y redevient possible", () => {
    const sim = new Sim({ players: 2, catalog, settings: { categories: [], handSize: 4, jokers: 2 } });
    sim.must("p1", { type: "start" });
    const hands = sim.view("p1").create?.hands ?? [];
    const outside = base.find((t) => !hands.flat().includes(t.id));
    expect(sim.act("p1", { type: "submit", meme: { templateId: outside?.id ?? "", values: { a: "x" }, stickers: [] }, usedJoker: true })).toMatchObject({ ok: true });
  });
});
