import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import data from "./emoji-data.json";
import {
  AVATARS,
  EMOJI_BY_ID,
  EMOJI_HIDDEN,
  EMOJI_LIST,
  EMOJI_SLANG_TAGS,
  STICKER_GROUPS,
  STICKER_IDS,
  emojiUrl,
  isEmojiId,
  searchEmoji,
} from "./emoji";
import { VOTE_OPTIONS } from "../game/types";
import { render } from "./gen-emoji-index.mjs";

const root = path.resolve(__dirname, "../../..");
const files = new Set(readdirSync(path.join(root, "public/emoji")).map((f) => f.replace(/\.webp$/, "")));
const jsonIds = new Set(data.map((e) => e.id));

function expectAllExist(ids: readonly string[], where: string) {
  for (const id of ids) {
    expect(jsonIds.has(id), `${where} : « ${id} » absent de emoji-data.json`).toBe(true);
    expect(files.has(id), `${where} : /public/emoji/${id}.webp introuvable`).toBe(true);
    expect(isEmojiId(id), `${where} : isEmojiId(${id})`).toBe(true);
  }
}

describe("index généré", () => {
  it("est à jour par rapport à emoji-data.json", () => {
    const current = readFileSync(path.join(__dirname, "emoji-index.gen.ts"), "utf8");
    expect(current, "relancer : node src/lib/content/gen-emoji-index.mjs").toBe(render(data));
  });

  it("restitue chaque entrée du JSON à l'identique", () => {
    expect(EMOJI_LIST).toHaveLength(data.length);
    expect(EMOJI_BY_ID.size).toBe(data.length);
    for (const e of data) {
      expect(EMOJI_BY_ID.get(e.id)).toEqual({ id: e.id, fr: e.fr, g: e.g, tags: e.tags, ch: e.ch });
    }
  });

  it("chaque emoji a son image", () => {
    for (const e of EMOJI_LIST) expect(files.has(e.id), e.id).toBe(true);
    expect(existsSync(path.join(root, "public", emojiUrl("skull")))).toBe(true);
  });
});

describe("isEmojiId", () => {
  it("refuse ce qui n'est pas un id", () => {
    for (const bad of ["", "nope", "../skull", "skull.webp", "Skull", 12, null, undefined, {}]) {
      expect(isEmojiId(bad)).toBe(false);
    }
    expect(isEmojiId("skull")).toBe(true);
  });
});

describe("AVATARS", () => {
  it("≈ 72 avatars, tous existants, sans doublon", () => {
    expect(AVATARS.length).toBeGreaterThanOrEqual(68);
    expect(AVATARS.length).toBeLessThanOrEqual(80);
    expect(new Set(AVATARS).size).toBe(AVATARS.length);
    expectAllExist(AVATARS, "AVATARS");
  });
});

describe("STICKER_GROUPS", () => {
  it("groupes attendus, dans l'ordre", () => {
    expect(STICKER_GROUPS.map((g) => g.id)).toEqual([
      "classiques",
      "visages",
      "gestes",
      "ecole",
      "animaux",
      "bouffe",
      "objets",
      "symboles",
    ]);
    expect(STICKER_GROUPS[0].label).toBe("Les classiques");
  });

  it("tous les ids existent, pas de doublon dans un groupe, icône d'onglet valide", () => {
    for (const g of STICKER_GROUPS) {
      expect(g.label.length).toBeGreaterThan(0);
      expectAllExist([g.emoji], `onglet ${g.id}`);
      expectAllExist(g.ids, `groupe ${g.id}`);
      expect(new Set(g.ids).size, `doublon dans ${g.id}`).toBe(g.ids.length);
      expect(g.ids.length).toBeGreaterThanOrEqual(35);
      for (const id of g.ids) expect(EMOJI_HIDDEN.has(id)).toBe(false);
    }
  });

  it("taille raisonnable (≈ 450 au total)", () => {
    expect(STICKER_GROUPS[0].ids.length).toBeGreaterThanOrEqual(38);
    expect(STICKER_GROUPS[0].ids.length).toBeLessThanOrEqual(52);
    expect(STICKER_IDS.length).toBeGreaterThanOrEqual(380);
    expect(STICKER_IDS.length).toBeLessThanOrEqual(480);
    const total = STICKER_GROUPS.reduce((n, g) => n + g.ids.length, 0);
    expect(total).toBeGreaterThanOrEqual(420);
    expect(total).toBeLessThanOrEqual(500);
    expect(new Set(STICKER_IDS).size).toBe(STICKER_IDS.length);
  });

  it("les classiques demandés sont là", () => {
    const classics = STICKER_GROUPS[0].ids;
    for (const id of [
      "skull",
      "moai",
      "clown-face",
      "nerd-face",
      "face-with-tears-of-joy",
      "loudly-crying-face",
      "melting-face",
      "grinning-face-with-sweat",
      "eyes",
      "fire",
      "hundred-points",
      "thumbs-up",
      "brain",
      "crown",
      "wastebasket",
    ]) {
      expect(classics, id).toContain(id);
    }
  });

  it("les emojis de vote du contrat partagé existent", () => {
    expectAllExist(VOTE_OPTIONS.map((o) => o.emoji), "VOTE_OPTIONS");
  });
});

describe("searchEmoji", () => {
  const ids = (q: string, limit?: number) => searchEmoji(q, limit).map((e) => e.id);

  it("ignore accents et majuscules", () => {
    expect(ids("crane")).toContain("skull");
    expect(ids("CRÂNE")).toContain("skull");
    expect(ids("Écureuil")).toEqual(ids("ecureuil"));
    expect(ids("coeur")[0]).toBe("red-heart");
    expect(ids("cœur")[0]).toBe("red-heart");
  });

  it("cherche dans le libellé et dans les tags", () => {
    expect(ids("pizza")[0]).toBe("pizza");
    expect(ids("mdr")).toContain("face-with-tears-of-joy");
    expect(ids("chat").slice(0, 8)).toContain("cat-face");
    expect(ids("feu")[0]).toBe("fire");
  });

  it("comprend l'argot lycéen", () => {
    expect(ids("red flag").slice(0, 3)).toContain("police-car-light");
    expect(ids("aura").slice(0, 3)).toContain("sparkles");
    expect(ids("goat")[0]).toBe("goat");
    expect(ids("pnj").slice(0, 3)).toContain("robot");
    expect(ids("cuisiné")[0]).toBe("cooking");
    expect(ids("calculatrice")[0]).toBe("abacus");
    expect(ids("frites")[0]).toBe("french-fries");
  });

  it("plusieurs mots : tous doivent correspondre", () => {
    const res = ids("visage lunettes");
    expect(res).toContain("nerd-face");
    expect(res).not.toContain("pizza");
  });

  it("respecte la limite et les requêtes vides", () => {
    expect(searchEmoji("a", 5).length).toBeLessThanOrEqual(5);
    expect(searchEmoji("visage").length).toBeLessThanOrEqual(48);
    expect(searchEmoji("visage", 500).length).toBeGreaterThan(48);
    expect(searchEmoji("")).toEqual([]);
    expect(searchEmoji("   ")).toEqual([]);
    expect(searchEmoji("zzzzqqqq")).toEqual([]);
    expect(searchEmoji("chat", 0)).toEqual([]);
  });

  it("ne renvoie que des ids valides, sans doublon, jamais les emojis masqués", () => {
    for (const q of ["a", "e", "main", "doigt", "coeur", "visage", "prof", "sac", "bus", "red"]) {
      const res = ids(q, 200);
      expect(new Set(res).size).toBe(res.length);
      for (const id of res) {
        expect(isEmojiId(id)).toBe(true);
        expect(EMOJI_HIDDEN.has(id)).toBe(false);
      }
    }
  });

  it("les mots d'argot pointent vers des emojis existants", () => {
    expectAllExist(Object.keys(EMOJI_SLANG_TAGS), "EMOJI_SLANG_TAGS");
    expectAllExist([...EMOJI_HIDDEN], "EMOJI_HIDDEN");
  });
});
