import { beforeEach, describe, expect, it } from "vitest";
import { computeAwards } from "./awards";
import { buildPool, dealHands, pickForcedTemplate } from "./deal";
import { addImage, engineDebug, removeImage } from "./engine";
import { makeRng } from "./rng";
import { Sim, categoryOf, fakeCatalog, memeFor } from "./testkit";
import { LIMITS, PERSO_FIELDS } from "./types";

beforeEach(() => {
  engineDebug.strict = true;
});

let counter = 0;
function imageId(): string {
  counter += 1;
  return counter.toString(16).padStart(24, "0");
}

/** ajoute une image au pack perso de la salle (comme le fait la route après validation) */
function add(sim: Sim, playerId: string, id = imageId()) {
  const out = addImage(sim.room, playerId, { id, w: 800, h: 600 }, sim.now, sim.catalog);
  if (out.ok) sim.room = out.room;
  return { out, id };
}

function remove(sim: Sim, playerId: string, id: string) {
  const out = removeImage(sim.room, playerId, id, sim.now, sim.catalog);
  if (out.ok) sim.room = out.room;
  return out;
}

const isPerso = (id: string) => id.startsWith("perso:");

describe("pack perso : ajout et suppression", () => {
  it("ajoute une image, visible dans la vue, et incrémente la version", () => {
    const sim = new Sim({ players: 3 });
    const v0 = sim.view(null).version;
    const { out, id } = add(sim, "p2");
    expect(out).toMatchObject({ ok: true, result: { image: { id, w: 800, h: 600, by: "p2", byName: "Joueur 2" } } });
    expect(sim.view(null).images).toEqual([{ id, w: 800, h: 600, by: "p2", byName: "Joueur 2" }]);
    expect(sim.view(null).version).toBeGreaterThan(v0);
    // idempotent : même id renvoyé deux fois
    const before = sim.room;
    const again = addImage(sim.room, "p2", { id, w: 800, h: 600 }, sim.now, sim.catalog);
    expect(again.ok && again.room === before).toBe(true);
  });

  it("respecte settings.uploads : all / host / off", () => {
    const sim = new Sim({ players: 3, settings: { uploads: "host" } });
    expect(add(sim, "p2").out).toMatchObject({ ok: false, error: "not_host" });
    expect(add(sim, "p1").out.ok).toBe(true);
    sim.must("p1", { type: "settings", patch: { uploads: "off" } });
    expect(add(sim, "p1").out).toMatchObject({ ok: false, error: "uploads_off" });
    expect(add(sim, "p2").out).toMatchObject({ ok: false, error: "uploads_off" });
    sim.must("p1", { type: "settings", patch: { uploads: "all" } });
    expect(add(sim, "p3").out.ok).toBe(true);
    expect(addImage(sim.room, null, { id: imageId(), w: 100, h: 100 }, sim.now, sim.catalog)).toMatchObject({ ok: false, error: "bad_token" });
    expect(sim.view(null).images).toHaveLength(2);
  });

  it("limite le nombre d'images par joueur et par salle", () => {
    const sim = new Sim({ players: 8 });
    for (let i = 0; i < LIMITS.maxImagesPerPlayer; i++) expect(add(sim, "p1").out.ok).toBe(true);
    expect(add(sim, "p1").out).toMatchObject({ ok: false, error: "too_many_images" });
    // les joueurs suivants remplissent la salle, chacun jusqu'à sa limite (quelles que soient les valeurs des limites)
    for (const id of ["p2", "p3", "p4", "p5", "p6"]) {
      const left = LIMITS.maxImages - sim.view(null).images.length;
      for (let i = 0; i < Math.min(LIMITS.maxImagesPerPlayer, left); i++) expect(add(sim, id).out.ok).toBe(true);
    }
    expect(sim.view(null).images).toHaveLength(LIMITS.maxImages);
    expect(add(sim, "p7").out).toMatchObject({ ok: false, error: "too_many_images" });
  });

  it("suppression : hôte ou auteur seulement ; image inconnue -> image_not_found", () => {
    const sim = new Sim({ players: 3 });
    const a = add(sim, "p2").id;
    const b = add(sim, "p2").id;
    expect(remove(sim, "p3", a)).toMatchObject({ ok: false, error: "not_host" });
    const v0 = sim.view(null).version;
    expect(remove(sim, "p2", a).ok).toBe(true);
    expect(sim.view(null).version).toBeGreaterThan(v0);
    expect(remove(sim, "p1", b).ok).toBe(true);
    expect(sim.view(null).images).toEqual([]);
    expect(remove(sim, "p1", b)).toMatchObject({ ok: false, error: "image_not_found" });
    expect(removeImage(sim.room, null, b, sim.now, sim.catalog)).toMatchObject({ ok: false, error: "bad_token" });
  });

  it("un joueur expulsé laisse ses images ; l'hôte peut les supprimer", () => {
    const sim = new Sim({ players: 3 });
    const id = add(sim, "p3").id;
    sim.must("p1", { type: "kick", playerId: "p3" });
    expect(sim.view(null).images).toEqual([{ id, w: 800, h: 600, by: "p3", byName: "Joueur 3" }]);
    expect(remove(sim, "p1", id).ok).toBe(true);
    expect(sim.view(null).images).toEqual([]);
  });
});

describe("pack perso : gabarits perso:<id>", () => {
  it("un gabarit perso est valide si l'image existe ; champs haut/bas bornés", () => {
    const sim = new Sim({ players: 2, settings: { categories: ["perso"], handSize: 3, rerolls: 0 } });
    const ids = [add(sim, "p1").id, add(sim, "p1").id, add(sim, "p2").id];
    sim.start();
    const hand = sim.view("p1").create!.hands[0];
    expect([...hand].sort()).toEqual(ids.map((id) => `perso:${id}`).sort());
    sim.must("p1", {
      type: "submit",
      meme: { templateId: hand[0], values: { haut: "h".repeat(200), bas: "en bas", autre: "x" } as never, stickers: [] },
    });
    const meme = sim.view("p1").create!.myMeme!;
    expect(meme.templateId).toBe(hand[0]);
    expect(Object.keys(meme.values).sort()).toEqual(PERSO_FIELDS.map((f) => f.id).sort());
    expect(meme.values.haut).toHaveLength(PERSO_FIELDS[0].maxLength);
    expect(meme.values.bas).toBe("en bas");
    expect(sim.act("p2", { type: "submit", meme: memeFor("perso:ffffffffffffffffffffffff") })).toMatchObject({ ok: false, error: "invalid" });
  });

  it("le joker permet de choisir n'importe quelle image perso hors main", () => {
    const sim = new Sim({ players: 2, settings: { handSize: 3, rerolls: 0, jokers: 1 } });
    const ids = Array.from({ length: 6 }, () => add(sim, "p1").id);
    sim.start();
    const hand = sim.view("p2").create!.hands.flat();
    const outside = ids.map((id) => `perso:${id}`).find((t) => !hand.includes(t))!;
    expect(sim.act("p2", { type: "submit", meme: memeFor(outside) })).toMatchObject({ ok: false, error: "invalid" });
    sim.must("p2", { type: "submit", meme: memeFor(outside), usedJoker: true });
    expect(sim.view("p2").me?.jokersLeft).toBe(0);
  });
});

describe("pack perso : distribution", () => {
  it("environ un tiers de chaque main est perso (au moins 1), sans doublon entre mains", () => {
    for (const [handSize, expected] of [
      [3, 1],
      [4, 1],
      [5, 2],
      [6, 2],
      [8, 3],
      [10, 3],
    ] as const) {
      const sim = new Sim({ players: 6, settings: { handSize, rerolls: 2 } });
      for (let i = 0; i < 12; i++) add(sim, sim.ids[i % 6]);
      sim.start();
      for (const id of sim.ids) {
        const hands = sim.view(id).create!.hands;
        expect(hands).toHaveLength(3);
        for (const hand of hands) {
          expect(hand).toHaveLength(handSize);
          expect(hand.filter(isPerso)).toHaveLength(expected);
          expect(new Set(hand.map((t) => categoryOf(sim.catalog, t))).size).toBeGreaterThanOrEqual(3);
        }
        expect(new Set(hands.flat()).size).toBe(handSize * 3);
      }
    }
  });

  it("une seule image perso : elle est dans chaque main (doublon inévitable)", () => {
    const sim = new Sim({ players: 2, settings: { handSize: 4, rerolls: 2 } });
    const { id } = add(sim, "p1");
    sim.start();
    for (const hand of sim.view("p2").create!.hands) {
      expect(hand.filter(isPerso)).toEqual([`perso:${id}`]);
      expect(new Set(hand).size).toBe(4);
    }
  });

  it("categories = [\"perso\"] : mains 100 % perso, complétées par le catalogue s'il en manque", () => {
    const sim = new Sim({ players: 2, settings: { categories: ["perso"], handSize: 4, rerolls: 1 } });
    for (let i = 0; i < 8; i++) add(sim, "p1");
    sim.start();
    const hands = sim.view("p2").create!.hands;
    expect(hands.flat().every(isPerso)).toBe(true);
    expect(new Set(hands.flat()).size).toBe(8);

    const few = new Sim({ players: 2, settings: { categories: ["perso"], handSize: 4, rerolls: 0 } });
    add(few, "p1");
    add(few, "p2");
    few.start();
    const hand = few.view("p1").create!.hands[0];
    expect(hand).toHaveLength(4);
    expect(hand.filter(isPerso)).toHaveLength(2);
    expect(hand.filter((t) => !isPerso(t)).every((t) => few.catalog.some((c) => c.id === t))).toBe(true);

    const none = new Sim({ players: 2, settings: { categories: ["perso"], handSize: 4, rerolls: 0 } });
    none.start();
    expect(none.view("p1").create!.hands[0]).toHaveLength(4);
  });

  it("\"perso\" est une catégorie filtrable : absente du filtre = pas de perso dans les mains", () => {
    const without = new Sim({ players: 2, settings: { categories: ["ecole", "cases"], handSize: 4 } });
    for (let i = 0; i < 5; i++) add(without, "p1");
    without.start();
    expect(without.view("p1").create!.hands.flat().some(isPerso)).toBe(false);

    const withPerso = new Sim({ players: 2, settings: { categories: ["ecole", "perso"], handSize: 4 } });
    for (let i = 0; i < 5; i++) add(withPerso, "p1");
    withPerso.start();
    for (const hand of withPerso.view("p1").create!.hands) {
      expect(hand.filter(isPerso)).toHaveLength(1);
      expect(hand.filter((t) => !isPerso(t)).every((t) => categoryOf(withPerso.catalog, t) === "ecole")).toBe(true);
    }
  });

  it("évite de reproposer les mêmes images perso tant qu'il en reste de nouvelles", () => {
    const pool = buildPool(
      fakeCatalog(),
      Array.from({ length: 6 }, (_, i) => `perso:${i}`),
      [],
      6,
    );
    const seen: Record<string, number> = {};
    const persoSeen: string[] = [];
    for (let round = 1; round <= 2; round++) {
      const hands = dealHands({ pool, handSize: 3, hands: 3, seen, rand: makeRng("s", round) });
      for (const id of hands.flat()) {
        seen[id] = round;
        if (isPerso(id)) persoSeen.push(id);
      }
    }
    expect(persoSeen).toHaveLength(6);
    expect(new Set(persoSeen).size).toBe(6);
  });

  it("mode meme-image : le gabarit imposé est une image perso environ une fois sur deux", () => {
    const pool = buildPool(fakeCatalog(), ["perso:a", "perso:b", "perso:c"], [], 1);
    let perso = 0;
    for (let i = 0; i < 400; i++) {
      const forced = pickForcedTemplate(pool, [], makeRng("graine", i));
      if (forced && isPerso(forced)) perso += 1;
    }
    expect(perso).toBeGreaterThan(150);
    expect(perso).toBeLessThan(250);
    // sans image perso : toujours le catalogue ; pack perso seul : toujours perso
    expect(isPerso(pickForcedTemplate(buildPool(fakeCatalog(), [], [], 1), [], makeRng("x"))!)).toBe(false);
    expect(isPerso(pickForcedTemplate(buildPool(fakeCatalog(), ["perso:a"], ["perso"], 1), [], makeRng("x"))!)).toBe(true);
    // évite ceux déjà imposés
    expect(pickForcedTemplate(buildPool([], ["perso:a", "perso:b"], [], 1), ["perso:a"], makeRng("y"))).toBe("perso:b");
  });

  it("mode meme-image avec une image perso imposée : tout le monde la légende", () => {
    let found = false;
    for (let s = 0; s < 20 && !found; s++) {
      const sim = new Sim({ players: 3, settings: { mode: "meme-image", rounds: 1 }, seed: `graine-${s}` });
      add(sim, "p2");
      sim.start();
      const forced = sim.view(null).create!.forcedTemplateId!;
      if (!isPerso(forced)) continue;
      found = true;
      sim.submitAll();
      expect(sim.phase).toBe("vote");
      expect(sim.view(null).vote!.meme.templateId).toBe(forced);
      expect(Object.keys(sim.view(null).vote!.meme.values).sort()).toEqual(["bas", "haut"]);
    }
    expect(found).toBe(true);
  });
});

describe("pack perso : suppression en cours de partie", () => {
  function setup() {
    const sim = new Sim({ players: 3, settings: { categories: ["perso"], handSize: 3, rerolls: 0, rounds: 2 } });
    const ids = [add(sim, "p2").id, add(sim, "p2").id, add(sim, "p3").id];
    sim.start();
    return { sim, ids };
  }

  it("l'image supprimée disparaît des mains ; un mème déjà fait avec garde son templateId", () => {
    const { sim, ids } = setup();
    const target = `perso:${ids[0]}`;
    sim.must("p1", { type: "draft", meme: memeFor(target, "déjà écrit") });
    const v3 = sim.view("p3").version;
    expect(remove(sim, "p1", ids[0]).ok).toBe(true);
    for (const id of sim.ids) expect(sim.view(id).create!.hands.flat()).not.toContain(target);
    expect(sim.view("p3").create!.hands[0]).toHaveLength(2);
    expect(sim.view("p3").version).toBeGreaterThan(v3);
    expect(sim.view(null).images.map((i) => i.id)).toEqual([ids[1], ids[2]]);
    // le brouillon de p1 est conservé et peut encore être validé tel quel
    expect(sim.view("p1").create!.myMeme).toMatchObject({ templateId: target, values: { haut: "déjà écrit" } });
    sim.must("p1", { type: "submit", meme: memeFor(target, "déjà écrit, validé") });
    // ... mais plus personne ne peut la choisir
    expect(sim.act("p3", { type: "draft", meme: memeFor(target) })).toMatchObject({ ok: false, error: "invalid" });
    sim.must("p2", { type: "submit", meme: memeFor(sim.firstTemplate("p2")) });
    sim.must("p3", { type: "submit", meme: memeFor(sim.firstTemplate("p3")) });
    expect(sim.phase).toBe("vote");
    expect(sim.room.memes.some((m) => m.meme.templateId === target && m.round === 1)).toBe(true);
    sim.playToFinal(() => 2);
    expect(sim.view(null).final!.gallery.some((m) => m.meme.templateId === target)).toBe(true);
  });

  it("pendant la partie, seul l'hôte peut supprimer une image utilisée dans la manche courante", () => {
    const { sim, ids } = setup();
    // p2 est l'auteur des images 0 et 1 ; p3 utilise l'image 0
    sim.must("p3", { type: "draft", meme: memeFor(`perso:${ids[0]}`, "en cours") });
    expect(remove(sim, "p2", ids[0])).toMatchObject({ ok: false, error: "bad_phase" });
    // une image que personne n'utilise : l'auteur peut la supprimer
    expect(remove(sim, "p2", ids[1]).ok).toBe(true);
    // toujours protégée pendant le vote de la manche
    sim.submitAll();
    expect(sim.phase).toBe("vote");
    expect(remove(sim, "p2", ids[0])).toMatchObject({ ok: false, error: "bad_phase" });
    // l'hôte, lui, peut
    expect(remove(sim, "p1", ids[0]).ok).toBe(true);
    expect(sim.view(null).images.map((i) => i.id)).toEqual([ids[2]]);
  });

  it("à la manche suivante, l'auteur peut de nouveau supprimer son image", () => {
    const { sim, ids } = setup();
    sim.must("p3", { type: "draft", meme: memeFor(`perso:${ids[0]}`, "manche 1") });
    sim.submitAll();
    sim.waitUntil((r) => r.phase === "create" && r.round === 2, 900_000);
    expect(remove(sim, "p2", ids[0]).ok).toBe(true);
  });

  it("image imposée supprimée par l'hôte pendant la création : un autre gabarit est tiré, on repart de zéro", () => {
    let done = false;
    for (let s = 0; s < 30 && !done; s++) {
      const sim = new Sim({ players: 3, settings: { mode: "meme-image", rounds: 1 }, seed: `g-${s}` });
      const { id } = add(sim, "p2");
      sim.start();
      const forced = sim.view(null).create!.forcedTemplateId!;
      if (forced !== `perso:${id}`) continue;
      done = true;
      sim.must("p3", { type: "submit", meme: memeFor(forced, "sur l'image") });
      expect(remove(sim, "p2", id)).toMatchObject({ ok: false, error: "bad_phase" });
      expect(remove(sim, "p1", id).ok).toBe(true);
      const view = sim.view("p3");
      expect(view.create!.forcedTemplateId).not.toBe(forced);
      expect(view.create!.forcedTemplateId).toBeTruthy();
      expect(view.create).toMatchObject({ submitted: false, myMeme: null, submittedCount: 0 });
      expect(view.create!.hands).toEqual([[view.create!.forcedTemplateId]]);
      sim.submitAll();
      expect(sim.phase).toBe("vote");
    }
    expect(done).toBe(true);
  });
});

describe("récompenses", () => {
  it("aucune récompense sans mème", () => {
    const sim = new Sim({ players: 3 });
    expect(computeAwards(sim.room)).toEqual([]);
  });

  it("décerne les bonnes récompenses aux bonnes personnes", () => {
    const sim = new Sim({ players: 5, settings: { rounds: 2 } });
    // p1 : toujours 3 de tout le monde ; p5 : toujours 0 ; p2 note large, p3 note sec
    const received: Record<string, 0 | 1 | 2 | 3> = { p1: 3, p2: 2, p3: 1, p4: 1, p5: 0 };
    sim.start();
    while (sim.phase !== "final") {
      if (sim.phase === "create") sim.submitAll();
      else if (sim.phase === "vote") {
        const author = sim.room.memes.find((m) => m.id === sim.view(null).vote!.memeId)!.authorId;
        sim.voteAll((voter) => (voter === "p2" ? 3 : voter === "p3" ? 0 : received[author]));
      } else sim.wait(1000);
    }
    const awards = sim.view(null).final!.awards;
    const by = Object.fromEntries(awards.map((a) => [a.id, a]));
    expect(by.major).toMatchObject({ playerId: "p1", playerName: "Joueur 1", title: "Major de promo" });
    expect(by["bon-public"]).toMatchObject({ playerId: "p2" });
    expect(by["jury-severe"]).toMatchObject({ playerId: "p3" });
    expect(by.incompris).toMatchObject({ playerId: "p5", title: "Humour incompris" });
    expect(by.incompris.memeId).toBeTruthy();
    expect(awards.length).toBeGreaterThanOrEqual(4);
    expect(awards.length).toBeLessThanOrEqual(6);
    // jamais deux fois la même personne (5 joueurs, c'est évitable)
    expect(new Set(awards.map((a) => a.playerId)).size).toBe(awards.length);
    // ton bon enfant : rien d'humiliant
    for (const a of awards) expect(`${a.title} ${a.description}`).not.toMatch(/nul|pire|raté|honte|loser|perdant/i);
  });

  it("à deux joueurs, complète jusqu'à 4 si les données le permettent, sans inventer", () => {
    const sim = new Sim({ players: 2, settings: { rounds: 3 } });
    sim.start();
    let n = 0;
    while (sim.phase !== "final") {
      if (sim.phase === "create") sim.submitAll((id) => (id === "p1" ? "court" : "un texte nettement plus long que l'autre, vraiment"));
      else if (sim.phase === "vote") sim.voteAll(() => ((n++ % 3) + 1) as 1 | 2 | 3);
      else sim.wait(1000);
    }
    const awards = sim.view(null).final!.awards;
    expect(awards.length).toBeGreaterThanOrEqual(4);
    expect(awards.length).toBeLessThanOrEqual(6);
    expect(new Set(awards.map((a) => a.playerId))).toEqual(new Set(["p1", "p2"]));
    expect(new Set(awards.map((a) => a.id)).size).toBe(awards.length);
  });

  it("tout le monde à zéro : pas de « meilleur » artificiel", () => {
    const sim = new Sim({ players: 3, settings: { rounds: 1 } });
    sim.playToFinal(() => 0);
    const ids = sim.view(null).final!.awards.map((a) => a.id);
    expect(ids).not.toContain("major");
    expect(ids).not.toContain("meme-or");
    expect(ids).not.toContain("incompris");
  });
});
