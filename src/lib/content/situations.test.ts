import { describe, expect, it } from "vitest";
import {
  FALLBACK_ELEVES,
  FALLBACK_PROFS,
  SITUATIONS,
  SITUATION_TAGS,
  drawSituations,
  resolveSituation,
  situationsWithTag,
  type SituationContext,
} from "./situations";
import {
  CREATING_PHRASES,
  LAST_PLACE_PHRASES,
  LOBBY_PHRASES,
  NICKNAMES,
  PODIUM_PHRASES,
  REVEAL_PHRASES,
  TIPS,
  seededRandom,
} from "./phrases";

const EMPTY: SituationContext = { profs: [], eleves: [] };
const REAL: SituationContext = {
  profs: ["Mme Dupont", "M. Bernard", "Mme Aubert", "M. Haddad"],
  eleves: ["Inès", "Yanis", "Hugo", "Océane", "Élodie", "Amine", "Hamza", "Yves", "Ouassim", "Léa", "Mohamed"],
};
/** Noms de 10 lettres : la référence pour la longueur maximale. */
const TEN: SituationContext = {
  profs: ["Mme Dupont", "M. Bernard", "Mme Aubert"],
  eleves: ["Maximilien", "Clémentine", "Alexandrin"],
};
/** Noms en minuscules ou avec article, comme un hôte peut en saisir. */
const ODD: SituationContext = {
  profs: ["le CPE", "la proviseure", "les surveillants", "l'intendant"],
  eleves: ["inès", "  Tom  ", "le nouveau", "xX_Dark_Xx"],
};

const SEEDS = Array.from({ length: 12 }, (_, i) => `graine-${i}`);

function allResolved(ctx: SituationContext): { id: string; raw: string; text: string }[] {
  const out: { id: string; raw: string; text: string }[] = [];
  for (const seed of SEEDS) {
    const rand = seededRandom(seed);
    for (const s of SITUATIONS) out.push({ id: s.id, raw: s.text, text: resolveSituation(s.text, ctx, rand) });
  }
  return out;
}

/** Fautes que la résolution doit rendre impossibles. */
const BROKEN: [RegExp, string][] = [
  [/\{|\}/, "jeton restant"],
  [/(^|[\s«(])(de|à) (le|les) /i, "contraction manquante (du / au / des / aux)"],
  [/(^|[\s«(])(de|que) (?!Ou[aeiou])[aeiouéèêàâîôûAEIOUÉÈÊÀÂÎÔÛ]/, "élision manquante (d' / qu')"],
  [/ {2,}/, "double espace"],
  [/^\s|\s$/, "espace en bord de phrase"],
  [/[dD]' /, "apostrophe suivie d'une espace"],
  [/\b(\S{4,}) \1\b/i, "mot répété"],
];

function expectClean(text: string, id: string) {
  for (const [re, why] of BROKEN) expect(re.test(text), `${id} — ${why} : « ${text} »`).toBe(false);
  expect(/^[A-ZÀ-ÖØ-ÞŒ0-9«+*]/.test(text), `${id} — doit commencer par une majuscule : « ${text} »`).toBe(true);
}

describe("SITUATIONS", () => {
  it("au moins 260 cartes", () => {
    expect(SITUATIONS.length).toBeGreaterThanOrEqual(260);
  });

  it("ids uniques et textes sans doublon", () => {
    expect(new Set(SITUATIONS.map((s) => s.id)).size).toBe(SITUATIONS.length);
    const norm = (t: string) => t.toLowerCase().replace(/[^a-zà-ÿ0-9{}]+/g, " ").trim();
    expect(new Set(SITUATIONS.map((s) => norm(s.text))).size).toBe(SITUATIONS.length);
  });

  it("seuls les jetons {prof} et {eleve} existent", () => {
    for (const s of SITUATIONS) {
      const tokens = s.text.match(/\{[^}]*\}/g) ?? [];
      for (const t of tokens) expect(["{prof}", "{eleve}"], `${s.id} : ${t}`).toContain(t);
      expect(s.text.trim(), s.id).toBe(s.text);
      expect(/ {2,}|\n|\t/.test(s.text), s.id).toBe(false);
      // typographie française : espace avant ? ! : et à l'intérieur des guillemets
      expect(/[^\s«(?!]([?!]|:(?!\d))/.test(s.text.replace("#REF!", "").replace(/\b[a-z]+[?!]\s*»/g, "")), `${s.id} : « ${s.text} »`).toBe(false);
      expect(/«\S|\S»/.test(s.text), `${s.id} : guillemets collés`).toBe(false);
      expect(/"/.test(s.text), `${s.id} : guillemets droits`).toBe(false);
    }
  });

  it("répartition : ≈ 35 % {prof}, ≈ 25 % {eleve}", () => {
    const n = SITUATIONS.length;
    const profs = SITUATIONS.filter((s) => s.text.includes("{prof}")).length / n;
    const eleves = SITUATIONS.filter((s) => s.text.includes("{eleve}")).length / n;
    expect(profs).toBeGreaterThanOrEqual(0.3);
    expect(profs).toBeLessThanOrEqual(0.4);
    expect(eleves).toBeGreaterThanOrEqual(0.21);
    expect(eleves).toBeLessThanOrEqual(0.3);
  });

  it("au moins 80 cartes de culture internet, étiquettes connues", () => {
    expect(situationsWithTag("net").length).toBeGreaterThanOrEqual(80);
    const known = new Set<string>(SITUATION_TAGS);
    for (const s of SITUATIONS) {
      expect(s.tags?.length, s.id).toBeGreaterThan(0);
      for (const t of s.tags ?? []) expect(known.has(t), `${s.id} : ${t}`).toBe(true);
      expect(s.tags?.includes("profs"), s.id).toBe(s.text.includes("{prof}"));
      expect(s.tags?.includes("eleves"), s.id).toBe(s.text.includes("{eleve}"));
    }
    for (const tag of SITUATION_TAGS) expect(situationsWithTag(tag).length, tag).toBeGreaterThan(0);
  });

  it("variété des amorces", () => {
    const starts = (re: RegExp) => SITUATIONS.filter((s) => re.test(s.text)).length;
    expect(starts(/^Quand /)).toBeGreaterThanOrEqual(40);
    expect(starts(/^POV : /)).toBeGreaterThanOrEqual(10);
    expect(starts(/^La tête de /)).toBeGreaterThanOrEqual(6);
    expect(starts(/^Ce moment où /)).toBeGreaterThanOrEqual(6);
    expect(starts(/^\{eleve\} qui /)).toBeGreaterThanOrEqual(25);
    expect(starts(/ \/ /)).toBeGreaterThanOrEqual(25);
    // aucune amorce ne dépasse un tiers du paquet
    expect(starts(/^Quand /)).toBeLessThan(SITUATIONS.length / 3);
  });

  it("aucun accord en genre évident avec un jeton", () => {
    // « {prof} est absent », « {eleve} tout seul », « il/elle » juste après le jeton…
    const gendered = /\{(prof|eleve)\} (est|était|reste|semble|a l'air) (?!en |à |là|au |aux |dans |toujours |encore |sur )/;
    for (const s of SITUATIONS) expect(gendered.test(s.text), `${s.id} : « ${s.text} »`).toBe(false);
  });
});

describe("ton et références", () => {
  // Les joueurs écrivent eux-mêmes les noms qu'ils veulent : aucune marque,
  // aucun nom de personne ou de personnage dans les cartes ni dans les phrases.
  const BRANDS =
    /tiktok|snapchat|instagram|insta\b|youtube|twitch|netflix|whatsapp|discord|pronote|kahoot|chatgpt|airpods|iphone|samsung|stabilo|velleda|tipp-?ex|mcdo|skibidi/i;

  it("aucune marque dans les cartes ni dans les phrases d'ambiance", () => {
    for (const s of SITUATIONS) expect(BRANDS.test(s.text), `${s.id} : « ${s.text} »`).toBe(false);
    const lists: (readonly string[])[] = [
      LOBBY_PHRASES,
      CREATING_PHRASES,
      TIPS,
      LAST_PLACE_PHRASES,
      NICKNAMES,
      ...Object.values(REVEAL_PHRASES),
      ...Object.values(PODIUM_PHRASES),
    ];
    for (const p of lists.flat()) expect(BRANDS.test(p), p).toBe(false);
  });

  it("les cartes à jeton ne parlent ni du physique ni de la vie privée", () => {
    const off =
      /\b(gros|grosse|maigre|moche|laid|beau|belle|poids|taille|coiffure|cheveux|boutons?|accent|pauvre|riche|religion|crush|amoureu|couple|ex\b|rizz|célib|débile|idiot|nul|nulle|bête)\b/i;
    for (const s of SITUATIONS) {
      if (/\{(prof|eleve)\}/.test(s.text)) expect(off.test(s.text), `${s.id} : « ${s.text} »`).toBe(false);
    }
  });
});

describe("resolveSituation", () => {
  it("ne laisse aucun jeton et produit des phrases correctes — listes vides", () => {
    for (const r of allResolved(EMPTY)) expectClean(r.text, r.id);
  });

  it("ne laisse aucun jeton et produit des phrases correctes — vrais noms", () => {
    for (const r of allResolved(REAL)) expectClean(r.text, r.id);
  });

  it("phrases correctes avec des noms saisis bizarrement", () => {
    for (const r of allResolved(ODD)) {
      expect(/\{|\}/.test(r.text), r.id).toBe(false);
      expect(/(^|[\s«(])(de|à) (le|les) /i.test(r.text), `${r.id} : « ${r.text} »`).toBe(false);
      expect(/ {2,}/.test(r.text), `${r.id} : « ${r.text} »`).toBe(false);
    }
  });

  it("90 caractères max avec des noms de 10 lettres", () => {
    let longest = 0;
    for (const r of allResolved(TEN)) {
      longest = Math.max(longest, r.text.length);
      expect(r.text.length, `${r.id} (${r.text.length}) : « ${r.text} »`).toBeLessThanOrEqual(90);
    }
    expect(longest).toBeGreaterThan(60);
  });

  it("reste lisible avec les replis (105 caractères max)", () => {
    for (const r of allResolved(EMPTY)) {
      expect(r.text.length, `${r.id} (${r.text.length}) : « ${r.text} »`).toBeLessThanOrEqual(105);
    }
  });

  it("insère tels quels les noms sans cas particulier", () => {
    const ctx = { profs: ["Mme Dupont"], eleves: ["Yanis"] };
    const rand = () => 0;
    expect(resolveSituation("Quand {prof} dit « sortez une feuille »", ctx, rand)).toBe(
      "Quand Mme Dupont dit « sortez une feuille »",
    );
    expect(resolveSituation("{eleve} qui arrive avec 20 minutes de retard", ctx, rand)).toBe(
      "Yanis qui arrive avec 20 minutes de retard",
    );
    expect(resolveSituation("La classe quand le prof est absent", ctx, rand)).toBe(
      "La classe quand le prof est absent",
    );
    expect(resolveSituation("La tête de {eleve} quand {prof} dit « au tableau »", ctx, rand)).toBe(
      "La tête de Yanis quand Mme Dupont dit « au tableau »",
    );
  });

  it("élision : d'Inès, qu'Inès, d'Hugo, d'Yves — mais de Yanis, de Hamza, de Ouassim", () => {
    const one = (text: string, name: string) => resolveSituation(text, { profs: [name], eleves: [name] }, () => 0);
    expect(one("La tête de {eleve} le lundi", "Inès")).toBe("La tête d'Inès le lundi");
    expect(one("La tête de {eleve} le lundi", "Élodie")).toBe("La tête d'Élodie le lundi");
    expect(one("La tête de {eleve} le lundi", "océane")).toBe("La tête d'océane le lundi");
    expect(one("La tête de {eleve} le lundi", "Hugo")).toBe("La tête d'Hugo le lundi");
    expect(one("La tête de {eleve} le lundi", "Yves")).toBe("La tête d'Yves le lundi");
    expect(one("La tête de {eleve} le lundi", "Yanis")).toBe("La tête de Yanis le lundi");
    expect(one("La tête de {eleve} le lundi", "Hamza")).toBe("La tête de Hamza le lundi");
    expect(one("La tête de {eleve} le lundi", "Ouassim")).toBe("La tête de Ouassim le lundi");
    expect(one("La tête de {eleve} le lundi", "Mohamed")).toBe("La tête de Mohamed le lundi");
    expect(one("Plus fort que {eleve}", "Inès")).toBe("Plus fort qu'Inès");
    expect(one("Parce que {prof} arrive", "Amélie")).toBe("Parce qu'Amélie arrive");
    expect(one("Plus fort que {eleve}", "Yanis")).toBe("Plus fort que Yanis");
    expect(one("Dire bonjour à {eleve}", "Inès")).toBe("Dire bonjour à Inès");
    expect(one("De {eleve} à {prof}", "Inès")).toBe("D'Inès à Inès");
    // pas d'élision après un mot qui finit seulement par « de » ou « que »
    expect(one("En mode {eleve}", "Inès")).toBe("En mode Inès");
    expect(one("Chaque {eleve}", "Inès")).toBe("Chaque Inès");
  });

  it("contractions : du / au / des / aux, et rien à faire pour la / l'", () => {
    const one = (text: string, name: string) => resolveSituation(text, { profs: [name], eleves: [name] }, () => 0);
    expect(one("Le regard de {prof} ce matin", "le prof de maths")).toBe("Le regard du prof de maths ce matin");
    expect(one("Le regard de {prof} ce matin", "la prof d'anglais")).toBe("Le regard de la prof d'anglais ce matin");
    expect(one("Le regard de {prof} ce matin", "les surveillants")).toBe("Le regard des surveillants ce matin");
    expect(one("Le regard de {prof} ce matin", "l'intendant")).toBe("Le regard de l'intendant ce matin");
    expect(one("Répondre à {prof} en retard", "le prof de maths")).toBe("Répondre au prof de maths en retard");
    expect(one("Répondre à {prof} en retard", "les surveillants")).toBe("Répondre aux surveillants en retard");
    expect(one("Répondre à {prof} en retard", "la CPE")).toBe("Répondre à la CPE en retard");
    expect(one("De {prof} à toi", "le CPE")).toBe("Du CPE à toi");
    expect(one("À {prof} de jouer", "le CPE")).toBe("Au CPE de jouer");
    expect(one("Plus fort que {prof}", "le CPE")).toBe("Plus fort que le CPE");
    expect(one("Le sac de {eleve}", "Léa")).toBe("Le sac de Léa");
  });

  it("majuscule en début de phrase seulement", () => {
    const one = (text: string, name: string) => resolveSituation(text, { profs: [name], eleves: [name] }, () => 0);
    expect(one("{prof} qui arrive", "le prof de maths")).toBe("Le prof de maths qui arrive");
    expect(one("{eleve} qui arrive", "inès")).toBe("Inès qui arrive");
    expect(one("Personne : rien. / {prof} : « Bon. »", "la prof d'anglais")).toBe(
      "Personne : rien. / La prof d'anglais : « Bon. »",
    );
    expect(one("C'est fini. {eleve} dort", "ton voisin")).toBe("C'est fini. Ton voisin dort");
    expect(one("POV : {eleve} dort", "ton voisin")).toBe("POV : ton voisin dort");
    expect(one("Quand {prof} arrive", "le prof de maths")).toBe("Quand le prof de maths arrive");
    expect(one("« {eleve}, au tableau »", "ton voisin")).toBe("« Ton voisin, au tableau »");
  });

  it("deux jetons identiques : deux noms différents si possible", () => {
    const card = "{eleve} et {eleve} qui bavardent";
    for (const seed of SEEDS) {
      const rand = seededRandom(seed);
      const a = resolveSituation(card, { profs: [], eleves: ["Inès", "Yanis"] }, rand);
      expect(["Inès et Yanis qui bavardent", "Yanis et Inès qui bavardent"]).toContain(a);
      const b = resolveSituation(card, EMPTY, rand);
      const m = /^(.+) et (.+) qui bavardent$/.exec(b);
      expect(m, b).not.toBeNull();
      expect(m![1].toLowerCase()).not.toBe(m![2].toLowerCase());
    }
    // un seul nom disponible : on le réutilise plutôt que de planter
    expect(resolveSituation(card, { profs: [], eleves: ["Inès"] }, () => 0.5)).toBe("Inès et Inès qui bavardent");
  });

  it("replis variés et naturels", () => {
    expect(new Set(FALLBACK_PROFS).size).toBeGreaterThanOrEqual(8);
    expect(new Set(FALLBACK_ELEVES).size).toBeGreaterThanOrEqual(6);
    const seen = new Set<string>();
    const rand = seededRandom("replis");
    for (let i = 0; i < 200; i++) seen.add(resolveSituation("Quand {prof} arrive", EMPTY, rand));
    expect(seen.size).toBeGreaterThanOrEqual(8);
    // des noms vides ou blancs ne comptent pas
    expect(resolveSituation("Quand {prof} arrive", { profs: ["", "  "], eleves: [] }, () => 0)).toBe(
      "Quand le prof de maths arrive",
    );
  });

  it("déterministe pour un même générateur, robuste aux valeurs limites de rand", () => {
    for (const s of SITUATIONS.slice(0, 60)) {
      expect(resolveSituation(s.text, REAL, seededRandom("x"))).toBe(resolveSituation(s.text, REAL, seededRandom("x")));
    }
    for (const r of [0, 0.999999999, 1, -1, NaN, Infinity]) {
      const text = resolveSituation("{eleve} parle à {prof}", REAL, () => r);
      expect(/\{|undefined/.test(text), `${r} : ${text}`).toBe(false);
    }
  });
});

describe("drawSituations", () => {
  it("tire sans doublon des cartes résolues", () => {
    const hand = drawSituations(3, REAL, seededRandom("main"));
    expect(hand).toHaveLength(3);
    expect(new Set(hand.map((h) => h.id)).size).toBe(3);
    for (const h of hand) {
      expect(/\{|\}/.test(h.text)).toBe(false);
      expect(SITUATIONS.some((s) => s.id === h.id)).toBe(true);
    }
  });

  it("respecte les exclusions tant qu'il reste des cartes", () => {
    const keep = SITUATIONS.slice(0, 5).map((s) => s.id);
    const exclude = SITUATIONS.slice(5).map((s) => s.id);
    const hand = drawSituations(5, EMPTY, seededRandom("excl"), exclude);
    expect(hand.map((h) => h.id).sort()).toEqual([...keep].sort());
    // paquet épuisé : on complète avec des cartes déjà vues, toujours sans doublon
    const more = drawSituations(8, EMPTY, seededRandom("excl"), exclude);
    expect(more).toHaveLength(8);
    expect(new Set(more.map((h) => h.id)).size).toBe(8);
    for (const id of keep) expect(more.map((h) => h.id)).toContain(id);
  });

  it("bornes : 0, négatif, plus que le paquet", () => {
    expect(drawSituations(0, EMPTY, Math.random)).toEqual([]);
    expect(drawSituations(-3, EMPTY, Math.random)).toEqual([]);
    const all = drawSituations(10_000, EMPTY, seededRandom("tout"));
    expect(all).toHaveLength(SITUATIONS.length);
    expect(new Set(all.map((h) => h.id)).size).toBe(SITUATIONS.length);
  });

  it("déterministe pour une même graine", () => {
    expect(drawSituations(6, REAL, seededRandom("g"))).toEqual(drawSituations(6, REAL, seededRandom("g")));
    expect(drawSituations(6, REAL, seededRandom("g"))).not.toEqual(drawSituations(6, REAL, seededRandom("h")));
  });
});
