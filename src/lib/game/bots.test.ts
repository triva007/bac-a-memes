import { beforeEach, describe, expect, it } from "vitest";
import { BOT_LINES, BOT_NAMES, botCreateDelay, botScore, botVoteDelay, buildBotMeme } from "./bots";
import { applyAction, authenticate, engineDebug, tick } from "./engine";
import { makeRng } from "./rng";
import { memeHasContent, sanitizeMeme } from "./sanitize";
import { Sim, expectedScores, fakeCatalog, memeFor } from "./testkit";
import { LIMITS, PERSO_FIELDS, type GameMode, type TemplateMeta } from "./types";

beforeEach(() => {
  engineDebug.strict = true;
});

const MODES: GameMode[] = ["classique", "meme-image", "theme"];
const packCatalog = (): TemplateMeta[] => [
  ...fakeCatalog(15),
  ...Array.from({ length: 12 }, (_, i) => ({ id: `pack-${i}`, category: "memes", fields: PERSO_FIELDS })),
];
const bots = (sim: Sim) => sim.view(null).players.filter((p) => p.isBot);

describe("robots : ajout et retrait", () => {
  it("l'hôte ajoute des robots dans le lobby : pseudos uniques ≤ 16, avatars, toujours connectés, jamais hôtes", () => {
    const sim = new Sim({ players: 1 });
    sim.must("p1", { type: "addBots", count: 3 });
    sim.must("p1", { type: "addBots", count: 12 });
    const view = sim.view("p1");
    expect(view.players).toHaveLength(16);
    expect(view.players[0]).toMatchObject({ isBot: false, isHost: true });
    const list = bots(sim);
    expect(list).toHaveLength(15);
    expect(new Set(list.map((b) => b.name)).size).toBe(15);
    for (const b of list) {
      expect(b.name.length).toBeLessThanOrEqual(LIMITS.nameMaxLength);
      expect(BOT_NAMES).toContain(b.name);
      expect(b).toMatchObject({ connected: true, isHost: false, score: 0 });
      expect(b.avatar).toMatch(/^[a-z0-9-]+$/);
    }
    // un robot n'a pas de jeton utilisable et ne peut rien faire lui-même
    for (const p of sim.room.players.filter((x) => x.bot)) {
      expect(authenticate(sim.room, p.token)).toEqual({ kind: "unknown" });
      expect(applyAction(sim.room, p.id, { type: "start" }, sim.now, sim.catalog)).toMatchObject({ ok: false, error: "bad_token" });
    }
    expect(JSON.stringify(view)).not.toContain("bot:");
  });

  it("droits, phase et limites", () => {
    const sim = new Sim({ players: 2 });
    expect(sim.act("p2", { type: "addBots", count: 3 })).toMatchObject({ ok: false, error: "not_host" });
    expect(sim.act("p2", { type: "removeBots" })).toMatchObject({ ok: false, error: "not_host" });
    for (const count of [0, -2, Number.NaN, "3" as never]) {
      expect(sim.act("p1", { type: "addBots", count })).toMatchObject({ ok: false, error: "invalid" });
    }
    // au plus 12 par appel
    sim.must("p1", { type: "addBots", count: 50 });
    expect(bots(sim)).toHaveLength(12);
    // dans la limite de la salle
    sim.must("p1", { type: "addBots", count: 12 });
    sim.must("p1", { type: "addBots", count: 12 });
    sim.must("p1", { type: "addBots", count: 12 });
    expect(sim.view(null).players).toHaveLength(LIMITS.maxPlayers);
    expect(sim.act("p1", { type: "addBots", count: 1 })).toMatchObject({ ok: false, error: "room_full" });
    // retrait : tous d'un coup, idempotent
    sim.must("p1", { type: "removeBots" });
    expect(sim.view(null).players.map((p) => p.id)).toEqual(["p1", "p2"]);
    const before = sim.room;
    expect(sim.must("p1", { type: "removeBots" })).toBe(before);
    // en cours de partie : refusé
    sim.must("p1", { type: "addBots", count: 2 });
    sim.start();
    expect(sim.act("p1", { type: "addBots", count: 1 })).toMatchObject({ ok: false, error: "bad_phase" });
    expect(sim.act("p1", { type: "removeBots" })).toMatchObject({ ok: false, error: "bad_phase" });
  });

  it("1 humain + des robots suffit pour lancer ; seul, non", () => {
    const sim = new Sim({ players: 1 });
    expect(sim.act("p1", { type: "start" })).toMatchObject({ ok: false, error: "invalid" });
    sim.must("p1", { type: "addBots", count: 1 });
    sim.start();
    expect(sim.phase).toBe("create");
    expect(sim.view("p1").create?.totalPlayers).toBe(2);
  });

  it("kick d'un robot, dans le lobby comme en cours de partie", () => {
    const sim = new Sim({ players: 1 });
    sim.must("p1", { type: "addBots", count: 3 });
    const [a, b] = bots(sim);
    sim.must("p1", { type: "kick", playerId: a.id });
    expect(bots(sim).map((x) => x.id)).not.toContain(a.id);
    expect(sim.room.kicked).toEqual([]);
    sim.start();
    sim.waitUntil((r) => r.phase === "vote");
    const count = sim.view(null).vote!.count;
    sim.must("p1", { type: "kick", playerId: b.id });
    expect(bots(sim)).toHaveLength(1);
    sim.playToFinal(() => 2);
    expect(sim.view(null).final!.gallery.some((m) => m.authorId === b.id)).toBe(false);
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it("si l'hôte s'en va, un robot ne devient jamais hôte ; le prochain humain le devient", () => {
    const sim = new Sim({ players: 2 });
    sim.must("p1", { type: "addBots", count: 3 });
    sim.online.delete("p1");
    sim.wait(60_000);
    expect(sim.room.hostId).toBe("p2");
    sim.must("p2", { type: "leave" });
    sim.online.delete("p2");
    sim.sleep(120_000);
    sim.room = tick(sim.room, sim.now, sim.catalog);
    expect(bots(sim).every((b) => !b.isHost)).toBe(true);
    expect(sim.room.players.find((p) => p.id === sim.room.hostId)?.bot).not.toBe(true);
  });
});

describe("robots : déroulement d'une partie", () => {
  for (const mode of MODES) {
    it(`partie complète 1 humain + 5 robots, mode ${mode}`, () => {
      const sim = new Sim({ players: 1, settings: { mode, rounds: 3, createSeconds: 60, voteSeconds: 12 } });
      sim.must("p1", { type: "addBots", count: 5 });
      sim.start();
      const t0 = sim.now;
      sim.playToFinal(() => 2);
      const view = sim.view("p1");
      expect(view.phase).toBe("final");
      expect(view.final!.gallery).toHaveLength(18);
      // tout le monde a voté pour chaque mème (5 notes : l'auteur ne vote pas)
      for (const m of view.final!.gallery) expect(m.breakdown.reduce((a, b) => a + b, 0)).toBe(5);
      const expected = expectedScores(sim.room);
      for (const p of view.players) expect(p.score).toBe(expected[p.id]);
      expect(view.final!.ranking).toHaveLength(6);
      expect(view.final!.awards.length).toBeGreaterThanOrEqual(4);
      expect(view.final!.awards.some((a) => view.players.find((p) => p.id === a.playerId)?.isBot)).toBe(true);
      // la partie avance au rythme de l'humain et des robots, pas des minuteurs complets
      const full = 3 * (60 + 6 * (12 + LIMITS.revealSeconds) + LIMITS.resultsSeconds);
      expect((sim.now - t0) / 1000).toBeLessThan(full * 0.75);
      // mèmes des robots : gabarit de leur main, textes dans les bornes
      for (const m of sim.room.memes.filter((x) => x.authorId !== "p1")) {
        const tpl = sim.catalog.find((t) => t.id === m.meme.templateId)!;
        expect(tpl).toBeDefined();
        expect(memeHasContent(m.meme)).toBe(true);
        for (const f of tpl.fields) expect(m.meme.values[f.id].length).toBeLessThanOrEqual(f.maxLength);
        expect(sanitizeMeme(m.meme, tpl, true)).toEqual(m.meme);
      }
      // « again » conserve les robots
      sim.must("p1", { type: "again" });
      expect(bots(sim)).toHaveLength(5);
      expect(sim.view(null).players.every((p) => p.score === 0)).toBe(true);
    });
  }

  it("délais : chaque robot valide entre ~6 s et ~45 % de la création, puis note entre ~1,5 s et ~5 s", () => {
    const sim = new Sim({ players: 1, settings: { createSeconds: 60, voteSeconds: 15, rounds: 1 } });
    sim.must("p1", { type: "addBots", count: 8 });
    sim.start();
    const start = sim.now;
    const doneAt = new Map<string, number>();
    while (sim.phase === "create" && sim.now - start < 30_000) {
      sim.wait(500);
      for (const p of sim.view(null).players) if (p.isBot && p.done && !doneAt.has(p.id)) doneAt.set(p.id, sim.now - start);
    }
    expect(doneAt.size).toBe(8);
    for (const t of doneAt.values()) {
      expect(t).toBeGreaterThanOrEqual(6_000);
      expect(t).toBeLessThanOrEqual(27_500);
    }
    expect(new Set(doneAt.values()).size).toBeGreaterThan(3); // délais propres à chaque robot
    // l'humain n'a pas validé : on attend toujours (pas de passage anticipé)
    expect(sim.phase).toBe("create");
    sim.must("p1", { type: "submit", meme: memeFor(sim.firstTemplate("p1")) });
    expect(sim.phase).toBe("vote");
    const voteStart = sim.now;
    sim.wait(1_000);
    expect(sim.view(null).vote!.votedCount).toBe(0);
    sim.wait(4_500);
    const v = sim.view("p1").vote!;
    // tous les robots (hors auteur) ont noté ; il ne manque que l'humain, ou c'est déjà révélé si c'est son mème
    if (v.isMine) expect(sim.phase).toBe("reveal");
    else {
      expect(sim.phase).toBe("vote");
      expect(v.votedCount).toBe(7);
      sim.must("p1", { type: "vote", memeId: v.memeId, score: 3 });
      expect(sim.phase).toBe("reveal");
    }
    expect(sim.now - voteStart).toBeLessThanOrEqual(5_500);
  });

  it("rattrapage : un seul tick tardif donne le même état qu'une suite de petits ticks", () => {
    const run = (stepMs: number) => {
      const sim = new Sim({ players: 1, settings: { createSeconds: 60, rounds: 1 }, seed: "rattrapage" });
      sim.must("p1", { type: "addBots", count: 6 });
      sim.start();
      const target = sim.now + 40_000;
      while (sim.now < target) {
        sim.now += stepMs;
        sim.poll();
      }
      return sim.room.current!.participants;
    };
    const fine = run(1_000);
    expect(run(8_000)).toEqual(fine);
    expect(Object.values(fine).filter((rp) => rp.submitted)).toHaveLength(6);
  });

  it("déterminisme : deux exécutions identiques donnent exactement le même état", () => {
    const play = () => {
      const sim = new Sim({ players: 2, settings: { rounds: 2, mode: "theme" }, seed: "robots" });
      sim.must("p1", { type: "addBots", count: 5 });
      sim.playToFinal();
      return sim.room;
    };
    const a = play();
    expect(play()).toEqual(a);
    expect(a.memes.filter((m) => a.players.find((p) => p.id === m.authorId)?.bot)).toHaveLength(10);
  });

  it("sans humain connecté, les robots ne font rien (pas de partie fantôme)", () => {
    const sim = new Sim({ players: 1, settings: { createSeconds: 60, rounds: 1 } });
    sim.must("p1", { type: "addBots", count: 4 });
    sim.start();
    sim.online.clear();
    // seul un spectateur (écran de classe) continue d'interroger le serveur
    const spectate = (seconds: number) => {
      for (let i = 0; i < seconds; i++) {
        sim.now += 1_000;
        sim.room = tick(sim.room, sim.now, sim.catalog);
      }
    };
    spectate(5);
    expect(sim.view(null).create!.submittedCount).toBe(0); // aucun robot ne joue avant ~6 s
    spectate(8); // l'humain est maintenant marqué déconnecté (> 12 s)
    expect(sim.view(null).players[0].connected).toBe(false);
    const frozen = sim.view(null).create!.submittedCount;
    expect(frozen).toBeLessThan(4);
    spectate(42);
    expect(sim.phase).toBe("create");
    expect(bots(sim).every((b) => b.connected)).toBe(true);
    expect(sim.view(null).create!.submittedCount).toBe(frozen);
    // l'humain revient avant la fin : les robots en retard jouent aussitôt
    sim.online.add("p1");
    sim.wait(1_000);
    expect(sim.view(null).create!.submittedCount).toBe(4);
    // il repart pendant le vote : plus aucune note de robot
    sim.must("p1", { type: "submit", meme: memeFor(sim.firstTemplate("p1")) });
    expect(sim.phase).toBe("vote");
    sim.online.clear();
    sim.sleep(LIMITS.disconnectAfterMs + 1_000);
    sim.room = tick(sim.room, sim.now, sim.catalog);
    expect(sim.view(null).vote!.votedCount).toBe(0);
  });

  it("les gabarits à légende (pack-*, perso:*) sont remplis valablement : un champ suffit, parfois les deux", () => {
    const tpl: TemplateMeta = { id: "pack-12", category: "memes", fields: PERSO_FIELDS };
    let both = 0;
    let stickers = 0;
    for (let i = 0; i < 400; i++) {
      const meme = buildBotMeme(tpl, ["Quand le prof dit « sortez une feuille »"], true, makeRng("pack", i));
      expect(memeHasContent(meme)).toBe(true);
      expect(sanitizeMeme(meme, tpl, true)).toEqual(meme);
      const filled = Object.values(meme.values).filter((v) => v.length > 0).length;
      expect(filled).toBeGreaterThanOrEqual(1);
      if (filled === 2) both += 1;
      if (meme.stickers.length) stickers += 1;
    }
    expect(both).toBeGreaterThan(80);
    expect(both).toBeLessThan(220);
    expect(stickers).toBeGreaterThan(80); // ~30 %
    expect(stickers).toBeLessThan(160);
    expect(buildBotMeme({ ...tpl, id: "perso:abc" }, [], false, makeRng("x")).stickers).toEqual([]);

    // en partie, avec un catalogue contenant le pack
    const sim = new Sim({ players: 1, catalog: packCatalog(), settings: { rounds: 2, categories: ["memes"] } });
    sim.must("p1", { type: "addBots", count: 6 });
    sim.playToFinal(() => 1);
    const botMemes = sim.room.memes.filter((m) => m.authorId !== "p1");
    expect(botMemes).toHaveLength(12);
    expect(botMemes.every((m) => m.meme.templateId.startsWith("pack-") && memeHasContent(m.meme))).toBe(true);
  });

  it("champs étroits et gabarit sans champ : textes coupés à maxLength, jamais de mème vide", () => {
    const narrow: TemplateMeta = { id: "bulletin", category: "ecole", fields: [{ id: "note", maxLength: 5 }, { id: "avis", maxLength: 22 }, { id: "x", maxLength: 2 }] };
    for (let i = 0; i < 200; i++) {
      const meme = buildBotMeme(narrow, [], true, makeRng("n", i));
      for (const f of narrow.fields) {
        expect(meme.values[f.id].length).toBeGreaterThan(0);
        expect(meme.values[f.id].length).toBeLessThanOrEqual(f.maxLength);
      }
    }
    expect(memeHasContent(buildBotMeme({ id: "vide", category: "ecole", fields: [] }, [], true, makeRng("v")))).toBe(true);
  });

  it("répliques et tirages : une soixantaine de textes courts, délais et notes dans les bornes", () => {
    expect(BOT_LINES.length).toBeGreaterThanOrEqual(60);
    expect(new Set(BOT_LINES).size).toBe(BOT_LINES.length);
    for (const line of BOT_LINES) expect(line.length).toBeLessThanOrEqual(40);
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < 4000; i++) {
      const rand = makeRng("tirage", i);
      const c = botCreateDelay(90_000, rand);
      expect(c).toBeGreaterThanOrEqual(6_000);
      expect(c).toBeLessThanOrEqual(40_500);
      const v = botVoteDelay(15_000, rand);
      expect(v).toBeGreaterThanOrEqual(1_500);
      expect(v).toBeLessThanOrEqual(5_000);
      expect(botVoteDelay(6_000, rand)).toBeLessThanOrEqual(4_800);
      expect(botCreateDelay(30_000, rand)).toBeLessThanOrEqual(13_500);
      counts[botScore(rand)] += 1;
    }
    const share = counts.map((n) => Math.round((n / 4000) * 100));
    expect(Math.abs(share[0] - 10)).toBeLessThanOrEqual(3);
    expect(Math.abs(share[1] - 30)).toBeLessThanOrEqual(4);
    expect(Math.abs(share[2] - 40)).toBeLessThanOrEqual(4);
    expect(Math.abs(share[3] - 20)).toBeLessThanOrEqual(4);
  });
});
