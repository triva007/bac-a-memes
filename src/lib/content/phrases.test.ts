import { describe, expect, it } from "vitest";
import { LIMITS } from "../game/types";
import {
  ALL_SUBMITTED_PHRASES,
  CREATING_GENERIC_PHRASES,
  CREATING_PHRASES,
  FIRST_ROUND_TITLES,
  LAST_PLACE_PHRASES,
  LAST_ROUND_TITLES,
  LOBBY_PHRASES,
  NICKNAMES,
  NICKNAME_MAX_LENGTH,
  PODIUM_PHRASES,
  REVEAL_PHRASES,
  ROUND_TITLES,
  TIPS,
  creatingPhrase,
  hashSeed,
  lastPlacePhrase,
  lobbyPhrase,
  pickSeeded,
  podiumPhrase,
  randomNickname,
  revealPhrase,
  revealRatio,
  revealTier,
  rotatingSeed,
  roundTitle,
  seededRandom,
  tip,
  type RevealTier,
} from "./phrases";

const ALL_LISTS: Record<string, readonly string[]> = {
  LOBBY_PHRASES,
  CREATING_PHRASES,
  CREATING_GENERIC_PHRASES,
  ALL_SUBMITTED_PHRASES,
  ROUND_TITLES,
  FIRST_ROUND_TITLES,
  LAST_ROUND_TITLES,
  LAST_PLACE_PHRASES,
  TIPS,
  "REVEAL_PHRASES[0]": REVEAL_PHRASES[0],
  "REVEAL_PHRASES[1]": REVEAL_PHRASES[1],
  "REVEAL_PHRASES[2]": REVEAL_PHRASES[2],
  "REVEAL_PHRASES[3]": REVEAL_PHRASES[3],
  "REVEAL_PHRASES[4]": REVEAL_PHRASES[4],
  "PODIUM_PHRASES[1]": PODIUM_PHRASES[1],
  "PODIUM_PHRASES[2]": PODIUM_PHRASES[2],
  "PODIUM_PHRASES[3]": PODIUM_PHRASES[3],
};

describe("listes", () => {
  it("non vides, sans doublon, propres", () => {
    for (const [name, list] of Object.entries(ALL_LISTS)) {
      expect(list.length, name).toBeGreaterThanOrEqual(4);
      expect(new Set(list).size, `doublon dans ${name}`).toBe(list.length);
      for (const p of list) {
        expect(p.trim(), name).toBe(p);
        expect(p.length, `${name} : « ${p} »`).toBeGreaterThan(3);
        expect(p.length, `${name} : « ${p} »`).toBeLessThanOrEqual(90);
        expect(/ {2,}|"/.test(p), `${name} : « ${p} »`).toBe(false);
      }
    }
  });

  it("au moins 12 réactions par palier, aucune commune à deux paliers", () => {
    const seen = new Set<string>();
    for (const tier of [0, 1, 2, 3, 4] as RevealTier[]) {
      expect(REVEAL_PHRASES[tier].length, `palier ${tier}`).toBeGreaterThanOrEqual(12);
      for (const p of REVEAL_PHRASES[tier]) {
        expect(seen.has(p), p).toBe(false);
        seen.add(p);
      }
    }
  });

  it("seules les phrases de création contiennent {nom}", () => {
    for (const [name, list] of Object.entries(ALL_LISTS)) {
      for (const p of list) {
        if (name === "CREATING_PHRASES") expect(p, p).toContain("{nom}");
        else expect(/\{|\}/.test(p), `${name} : « ${p} »`).toBe(false);
      }
    }
    // pas de tournure qui casserait selon le pseudo (« de {nom} », « que {nom} »)
    for (const p of CREATING_PHRASES) expect(/\b(de|que|à) \{nom\}/i.test(p), p).toBe(false);
  });

  it("volumes minimaux", () => {
    expect(LOBBY_PHRASES.length).toBeGreaterThanOrEqual(12);
    expect(CREATING_PHRASES.length).toBeGreaterThanOrEqual(12);
    expect(TIPS.length).toBeGreaterThanOrEqual(12);
    expect(LAST_PLACE_PHRASES.length).toBeGreaterThanOrEqual(10);
    expect(TIPS).toContain("Le plus court est souvent le plus drôle.");
  });
});

describe("tirage déterministe", () => {
  it("même graine, même résultat ; graines différentes, résultats variés", () => {
    expect(hashSeed("abc")).toBe(hashSeed("abc"));
    expect(hashSeed("abc")).not.toBe(hashSeed("abd"));
    expect(hashSeed(42)).toBe(hashSeed("42"));
    expect(lobbyPhrase("ABCD:1")).toBe(lobbyPhrase("ABCD:1"));
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) seen.add(lobbyPhrase(`salle:${i}`));
    expect(seen.size).toBe(LOBBY_PHRASES.length);
    const tips = new Set<string>();
    for (let i = 0; i < 300; i++) tips.add(tip(i));
    expect(tips.size).toBe(TIPS.length);
  });

  it("hashSeed renvoie un entier 32 bits non signé, y compris pour les cas limites", () => {
    for (const s of ["", "a", "é", "🔥", 0, -1, 1.5, NaN, "x".repeat(5000)]) {
      const h = hashSeed(s);
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(0xffffffff);
    }
  });

  it("seededRandom : reproductible, dans [0, 1), bien réparti", () => {
    const a = seededRandom("graine");
    const b = seededRandom("graine");
    let sum = 0;
    for (let i = 0; i < 2000; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      sum += x;
    }
    expect(sum / 2000).toBeGreaterThan(0.45);
    expect(sum / 2000).toBeLessThan(0.55);
  });

  it("pickSeeded et rotatingSeed", () => {
    expect(pickSeeded(["seul"], "peu importe")).toBe("seul");
    expect(rotatingSeed("ABCD", 12_000, 6000)).toBe("ABCD:2");
    expect(rotatingSeed("ABCD", 17_999, 6000)).toBe("ABCD:2");
    expect(rotatingSeed("ABCD", 18_000, 6000)).toBe("ABCD:3");
    expect(rotatingSeed("ABCD", 18_000, 0)).toBe("ABCD:18000");
  });
});

describe("creatingPhrase", () => {
  it("nomme un joueur qu'on attend", () => {
    for (let i = 0; i < 100; i++) {
      const p = creatingPhrase(`s${i}`, ["Inès", "Yanis"]);
      expect(/\{|\}/.test(p), p).toBe(false);
      expect(p.includes("Inès") || p.includes("Yanis"), p).toBe(true);
      expect(p).toBe(creatingPhrase(`s${i}`, ["Inès", "Yanis"]));
    }
    expect(creatingPhrase("x", ["Zoé"])).toContain("Zoé");
  });

  it("le fameux « cherche encore l'inspiration » existe", () => {
    expect(CREATING_PHRASES).toContain("{nom} cherche encore l'inspiration…");
  });

  it("liste vide = tout le monde a rendu ; pas de liste = générique", () => {
    expect(ALL_SUBMITTED_PHRASES).toContain(creatingPhrase("x", []));
    expect(CREATING_GENERIC_PHRASES).toContain(creatingPhrase("x"));
  });

  it("un pseudo contenant « $& » ou « {nom} » n'est pas réinterprété", () => {
    const p = creatingPhrase("x", ["$&{nom}"]);
    expect(p).toContain("$&{nom}");
  });
});

describe("révélation", () => {
  it("paliers", () => {
    expect(revealTier(0)).toBe(0);
    expect(revealTier(0.149)).toBe(0);
    expect(revealTier(0.15)).toBe(1);
    expect(revealTier(0.39)).toBe(1);
    expect(revealTier(0.4)).toBe(2);
    expect(revealTier(0.64)).toBe(2);
    expect(revealTier(0.65)).toBe(3);
    expect(revealTier(0.84)).toBe(3);
    expect(revealTier(0.85)).toBe(4);
    expect(revealTier(1)).toBe(4);
    expect(revealTier(7)).toBe(4);
    expect(revealTier(-1)).toBe(0);
    expect(revealTier(NaN)).toBe(0);
  });

  it("revealRatio à partir de la répartition des votes", () => {
    expect(revealRatio([0, 0, 0, 0])).toBe(0);
    expect(revealRatio([5, 0, 0, 0])).toBe(0);
    expect(revealRatio([0, 0, 0, 5])).toBe(1);
    expect(revealRatio([1, 1, 1, 1])).toBeCloseTo(0.5);
    expect(revealRatio([0, 3, 0, 0])).toBeCloseTo(1 / 3);
  });

  it("revealPhrase pioche dans le bon palier, de façon stable", () => {
    const cases: [number, RevealTier][] = [
      [0, 0],
      [0.3, 1],
      [0.5, 2],
      [0.7, 3],
      [0.95, 4],
    ];
    for (const [ratio, tier] of cases) {
      for (let i = 0; i < 50; i++) {
        const p = revealPhrase(ratio, `meme-${i}`);
        expect(REVEAL_PHRASES[tier]).toContain(p);
        expect(p).toBe(revealPhrase(ratio, `meme-${i}`));
      }
    }
  });
});

describe("manches, podium, dernier", () => {
  it("roundTitle : première, intermédiaire, dernière", () => {
    expect(FIRST_ROUND_TITLES).toContain(roundTitle(1, 3, "a"));
    expect(ROUND_TITLES).toContain(roundTitle(2, 3, "a"));
    expect(LAST_ROUND_TITLES).toContain(roundTitle(3, 3, "a"));
    // partie d'une seule manche : c'est un début, pas une « dernière manche »
    expect(FIRST_ROUND_TITLES).toContain(roundTitle(1, 1, "a"));
    expect(roundTitle(2, 5, "z")).toBe(roundTitle(2, 5, "z"));
  });

  it("podiumPhrase et lastPlacePhrase", () => {
    for (const rank of [1, 2, 3] as const) {
      expect(PODIUM_PHRASES[rank].length).toBeGreaterThanOrEqual(6);
      expect(PODIUM_PHRASES[rank]).toContain(podiumPhrase(rank, "joueur"));
    }
    expect(LAST_PLACE_PHRASES).toContain(lastPlacePhrase("joueur"));
  });
});

describe("randomNickname", () => {
  it("au moins 80 pseudos, tous ≤ 16 caractères, sans doublon", () => {
    expect(NICKNAME_MAX_LENGTH).toBe(LIMITS.nameMaxLength);
    expect(NICKNAMES.length).toBeGreaterThanOrEqual(80);
    expect(new Set(NICKNAMES).size).toBe(NICKNAMES.length);
    for (const n of NICKNAMES) {
      expect(n.length, n).toBeLessThanOrEqual(16);
      expect(n.length, n).toBeGreaterThanOrEqual(3);
      expect(n.trim(), n).toBe(n);
    }
  });

  it("tire des pseudos variés, reproductibles avec une graine", () => {
    const rand = seededRandom("pseudos");
    const seen = new Set<string>();
    for (let i = 0; i < 3000; i++) {
      const n = randomNickname(rand);
      expect(NICKNAMES).toContain(n);
      seen.add(n);
    }
    expect(seen.size).toBeGreaterThanOrEqual(80);
    expect(randomNickname(seededRandom("a"))).toBe(randomNickname(seededRandom("a")));
  });

  it("robuste aux valeurs limites de rand", () => {
    for (const r of [0, 0.5, 0.999999999, 1, -1, NaN]) {
      expect(NICKNAMES).toContain(randomNickname(() => r));
    }
  });
});
