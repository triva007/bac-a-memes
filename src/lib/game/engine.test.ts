import { existsSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  HOST_TIMEOUT_MS,
  PLAYER_COLORS,
  SKIP_GUARD_MS,
  applyAction,
  authenticate,
  buildView,
  createRoom,
  engineDebug,
  tick,
  touchPresence,
  viewVersion,
} from "./engine";
import { Sim, T0, categoryOf, expectedScores, fakeCatalog, memeFor } from "./testkit";
import { DEFAULT_SETTINGS, LIMITS, MAX_STICKERS, type GameMode, type RoomView } from "./types";

const MODES: GameMode[] = ["classique", "meme-image", "theme"];

beforeEach(() => {
  engineDebug.strict = true;
});

/** tout le JSON de la vue, pour chercher des fuites */
function dump(view: RoomView): string {
  return JSON.stringify(view);
}

describe("création de salle et lobby", () => {
  it("crée une salle en lobby avec l'hôte", () => {
    const out = createRoom({ code: "ABCD", seed: "s", now: T0, host: { id: "h", token: "secret-token-aaaaaaaa", name: "  Mme   Dupont \n", avatar: "fox" } });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const view = buildView(out.room, "h", T0);
    expect(view.phase).toBe("lobby");
    expect(view.round).toBe(0);
    expect(view.phaseEndsAt).toBeNull();
    expect(view.players).toHaveLength(1);
    expect(view.players[0]).toMatchObject({ id: "h", name: "Mme Dupont", avatar: "fox", isHost: true, connected: true, score: 0, done: false });
    expect(view.me).toEqual({ id: "h", isHost: true, jokersLeft: DEFAULT_SETTINGS.jokers });
    expect(view.settings).toEqual(DEFAULT_SETTINGS);
    expect(view.images).toEqual([]);
    expect(view.totalRounds).toBe(DEFAULT_SETTINGS.rounds);
  });

  it("refuse un nom vide", () => {
    const out = createRoom({ code: "ABCD", seed: "s", now: T0, host: { id: "h", token: "t", name: " \t ", avatar: "fox" } });
    expect(out).toMatchObject({ ok: false, error: "invalid" });
  });

  it("nettoie les noms, les rend uniques, attribue couleurs et avatars valides", () => {
    const sim = new Sim({ players: 1 });
    const a = sim.join("  Léa  ");
    const b = sim.join("léa");
    const c = sim.join("LÉA");
    const d = sim.join("Un prénom vraiment beaucoup trop long");
    const e = sim.join("Zoé", "../../etc/passwd");
    const names = Object.fromEntries(sim.view(null).players.map((p) => [p.id, p]));
    expect(names[a].name).toBe("Léa");
    expect(names[b].name).toBe("léa 2");
    expect(names[c].name).toBe("LÉA 3");
    expect(names[d].name.length).toBeLessThanOrEqual(LIMITS.nameMaxLength);
    expect(names[d].name).toBe("Un prénom vraime");
    expect(names[e].avatar).toBe("grinning-face");
    for (const p of sim.view(null).players) expect(PLAYER_COLORS).toContain(p.color);
    // les premières couleurs sont toutes différentes
    expect(new Set(sim.view(null).players.map((p) => p.color)).size).toBe(6);
  });

  it("garde le suffixe d'unicité dans la limite de longueur", () => {
    const sim = new Sim({ players: 1 });
    sim.join("Maximilien-Alexan");
    const second = sim.join("Maximilien-Alexan");
    const name = sim.view(null).players.find((p) => p.id === second)!.name;
    expect(name.length).toBeLessThanOrEqual(LIMITS.nameMaxLength);
    expect(name.endsWith(" 2")).toBe(true);
  });

  it("refuse l'entrée quand la salle est pleine", () => {
    const sim = new Sim({ players: LIMITS.maxPlayers });
    const out = applyAction(sim.room, null, { type: "join", name: "Trop tard", avatar: "cat" }, sim.now, sim.catalog);
    expect(out).toMatchObject({ ok: false, error: "room_full" });
  });

  it("valide et borne les réglages", () => {
    const sim = new Sim({ players: 2 });
    sim.must(sim.host, {
      type: "settings",
      patch: {
        mode: "theme",
        rounds: 99,
        createSeconds: 1,
        voteSeconds: 1000,
        handSize: 2.4,
        rerolls: -3,
        jokers: 5.6,
        categories: ["ecole", "ecole", "inconnue", "perso", "PAS VALIDE"],
        profs: ["  M.  Martin ", "m. martin", "", "Mme Une-Prof-Au-Nom-Interminable-Vraiment"],
        extraNames: Array.from({ length: 80 }, (_, i) => `Nom ${i}`),
        stickers: false,
        uploads: "host",
      },
    });
    const s = sim.view(null).settings;
    expect(s).toMatchObject({ mode: "theme", rounds: 8, createSeconds: 30, voteSeconds: 40, handSize: 3, rerolls: 0, jokers: 5, stickers: false, uploads: "host" });
    expect(s.categories).toEqual(["ecole", "perso"]);
    expect(s.profs[0]).toBe("M. Martin");
    expect(s.profs).toHaveLength(2);
    expect(s.profs[1].length).toBeLessThanOrEqual(LIMITS.nameListItemMaxLength);
    expect(s.extraNames).toHaveLength(LIMITS.maxNames);
    // les jokers des joueurs suivent le réglage
    expect(sim.view(sim.ids[1]).me?.jokersLeft).toBe(5);
  });

  it("rejette un patch de réglages mal typé, et réserve les réglages à l'hôte dans le lobby", () => {
    const sim = new Sim({ players: 2 });
    for (const patch of [{ mode: "nimp" }, { rounds: "3" }, { rounds: NaN }, { categories: "ecole" }, { stickers: 1 }, { uploads: "tous" }, { profs: "x" }]) {
      expect(sim.act(sim.host, { type: "settings", patch: patch as never })).toMatchObject({ ok: false, error: "invalid" });
    }
    expect(sim.act(sim.ids[1], { type: "settings", patch: { rounds: 2 } })).toMatchObject({ ok: false, error: "not_host" });
    sim.start();
    expect(sim.act(sim.host, { type: "settings", patch: { rounds: 2 } })).toMatchObject({ ok: false, error: "bad_phase" });
  });

  it("ne démarre pas seul, ni sans être l'hôte", () => {
    const solo = new Sim({ players: 1 });
    expect(solo.act(solo.host, { type: "start" })).toMatchObject({ ok: false, error: "invalid" });
    const sim = new Sim({ players: 3 });
    expect(sim.act(sim.ids[2], { type: "start" })).toMatchObject({ ok: false, error: "not_host" });
    expect(sim.phase).toBe("lobby");
  });
});

describe("parties complètes", () => {
  for (const n of [2, 8, 30]) {
    for (const mode of MODES) {
      it(`${n} joueurs, mode ${mode} : va jusqu'au podium, scores = somme des votes`, () => {
        const sim = new Sim({ players: n, settings: { mode, rounds: 3, profs: ["M. Martin"], extraNames: ["le CPE"] } });
        sim.start();
        const first = sim.view(sim.ids[0]);
        expect(first.phase).toBe("create");
        expect(first.round).toBe(1);
        expect(first.phaseEndsAt).toBe(sim.now + 90_000);
        expect(first.create?.totalPlayers).toBe(n);
        expect(first.create?.situations).toHaveLength(3);
        for (const text of first.create!.situations) expect(text).not.toMatch(/\{(prof|eleve)\}/);
        if (mode === "meme-image") {
          expect(first.create?.forcedTemplateId).toBeTruthy();
          expect(first.create?.hands).toEqual([[first.create?.forcedTemplateId]]);
        } else {
          expect(first.create?.forcedTemplateId).toBeNull();
          expect(first.create?.hands).toHaveLength(1 + DEFAULT_SETTINGS.rerolls);
        }
        if (mode === "theme") expect(first.create?.theme).toBeTruthy();
        else expect(first.create?.theme).toBeNull();

        const phases = new Set<string>();
        sim.playToFinal((voter, memeId) => {
          phases.add(sim.phase);
          return ((voter.length + memeId.length + Number(memeId.slice(-1))) % 4) as 0 | 1 | 2 | 3;
        });

        const view = sim.view(null);
        expect(view.phase).toBe("final");
        expect(view.round).toBe(3);
        expect(view.phaseEndsAt).toBeNull();
        expect(view.final!.gallery).toHaveLength(n * 3);
        // scores = somme des votes reçus
        const expected = expectedScores(sim.room);
        for (const p of view.players) expect(p.score).toBe(expected[p.id]);
        expect(view.final!.gallery.reduce((a, m) => a + m.points, 0)).toBe(view.players.reduce((a, p) => a + p.score, 0));
        for (const m of view.final!.gallery) {
          expect(m.breakdown.reduce((a, b) => a + b, 0)).toBe(n - 1);
          expect(m.points).toBe(m.breakdown[1] + 2 * m.breakdown[2] + 3 * m.breakdown[3]);
        }
        // classement décroissant, galerie décroissante
        const byId = new Map(view.players.map((p) => [p.id, p.score]));
        const ranked = view.final!.ranking.map((id) => byId.get(id)!);
        expect(view.final!.ranking).toHaveLength(n);
        expect(ranked).toEqual([...ranked].sort((a, b) => b - a));
        const pts = view.final!.gallery.map((m) => m.points);
        expect(pts).toEqual([...pts].sort((a, b) => b - a));
        // récompenses
        const awards = view.final!.awards;
        expect(awards.length).toBeGreaterThanOrEqual(n >= 8 ? 4 : 2);
        expect(awards.length).toBeLessThanOrEqual(6);
        expect(new Set(awards.map((a) => a.id)).size).toBe(awards.length);
        for (const a of awards) {
          expect(byId.has(a.playerId)).toBe(true);
          expect(a.playerName).toBe(view.players.find((p) => p.id === a.playerId)!.name);
          expect(a.title.length).toBeGreaterThan(2);
          expect(a.description.length).toBeGreaterThan(10);
          expect(existsSync(path.join(process.cwd(), "public/emoji", `${a.emoji}.webp`))).toBe(true);
          if (a.memeId) expect(view.final!.gallery.some((m) => m.memeId === a.memeId && m.authorId === a.playerId)).toBe(true);
        }
        if (n >= 8) expect(new Set(awards.map((a) => a.playerId)).size).toBe(awards.length);
      });
    }
  }

  it("deux exécutions identiques donnent exactement le même état (déterminisme)", () => {
    const play = () => {
      const sim = new Sim({ players: 6, settings: { rounds: 2, mode: "theme" }, seed: "même-graine" });
      sim.playToFinal();
      return sim.room;
    };
    expect(play()).toEqual(play());
  });

  it("des graines différentes donnent des distributions différentes", () => {
    const hands = (seed: string) => {
      const sim = new Sim({ players: 4, seed });
      sim.start();
      return JSON.stringify(sim.ids.map((id) => sim.view(id).create?.hands));
    };
    expect(hands("a")).not.toBe(hands("b"));
  });
});

describe("minuteurs et rattrapage", () => {
  it("create -> vote à l'échéance exacte, daté depuis l'échéance", () => {
    const sim = new Sim({ players: 3, settings: { createSeconds: 30, voteSeconds: 10 } });
    sim.start();
    const end = sim.room.phaseEndsAt!;
    sim.must(sim.ids[0], { type: "draft", meme: memeFor(sim.firstTemplate(sim.ids[0])) });
    sim.must(sim.ids[1], { type: "draft", meme: memeFor(sim.firstTemplate(sim.ids[1])) });
    sim.wait(29_000);
    expect(sim.phase).toBe("create");
    sim.sleep(1_700); // le sondage suivant arrive 700 ms après l'échéance
    sim.poll();
    expect(sim.phase).toBe("vote");
    expect(sim.room.phaseStartedAt).toBe(end);
    expect(sim.room.phaseEndsAt).toBe(end + 10_000);
  });

  it("vote -> reveal -> vote suivant -> results -> manche suivante, aux bonnes durées", () => {
    const sim = new Sim({ players: 3, settings: { createSeconds: 30, voteSeconds: 10, rounds: 2 } });
    sim.start();
    sim.submitAll();
    expect(sim.phase).toBe("vote");
    const voteEnd = sim.room.phaseEndsAt!;
    expect(voteEnd).toBe(sim.now + 10_000);
    sim.wait(9_000);
    expect(sim.phase).toBe("vote");
    sim.wait(1_000);
    expect(sim.phase).toBe("reveal");
    expect(sim.room.phaseEndsAt).toBe(voteEnd + LIMITS.revealSeconds * 1000);
    sim.wait(LIMITS.revealSeconds * 1000);
    expect(sim.phase).toBe("vote");
    expect(sim.view(null).vote?.index).toBe(1);
    sim.waitUntil((r) => r.phase === "results");
    const resultsEnd = sim.room.phaseEndsAt!;
    expect(resultsEnd - sim.room.phaseStartedAt).toBe(LIMITS.resultsSeconds * 1000);
    sim.waitUntil((r) => r.phase === "create");
    expect(sim.room.round).toBe(2);
    expect(sim.room.phaseStartedAt).toBe(resultsEnd);
    expect(sim.room.phaseEndsAt).toBe(resultsEnd + 30_000);
  });

  it("après la dernière manche : results -> final, qui reste jusqu'à \"again\"", () => {
    const sim = new Sim({ players: 2, settings: { rounds: 1 } });
    sim.playToFinal();
    expect(sim.view(null).final).toBeDefined();
    sim.wait(600_000);
    expect(sim.phase).toBe("final");
  });

  it("si tout le monde disparaît 5 minutes, on ne fait pas défiler la partie : on repart de maintenant", () => {
    const sim = new Sim({ players: 4, settings: { createSeconds: 30, voteSeconds: 10 } });
    sim.start();
    sim.submitAll();
    expect(sim.view(null).vote?.index).toBe(0);
    sim.sleep(5 * 60_000);
    // un spectateur (écran de classe) revient en premier : aucun joueur connecté
    sim.room = tick(sim.room, sim.now, sim.catalog);
    expect(sim.phase).toBe("vote");
    expect(sim.view(null).vote?.index).toBe(0);
    expect(sim.view(null).vote?.votedCount).toBe(0);
    // le vote sans aucun vote est rejoué depuis maintenant
    expect(sim.room.phaseStartedAt).toBe(sim.now);
    expect(sim.room.phaseEndsAt).toBe(sim.now + 10_000);
    expect(sim.view(null).players.every((p) => !p.connected)).toBe(true);
  });

  it("absence longue pendant la révélation : une seule transition, datée de maintenant", () => {
    const sim = new Sim({ players: 4, settings: { voteSeconds: 10 } });
    sim.start();
    sim.submitAll();
    sim.voteAll(() => 2);
    expect(sim.phase).toBe("reveal");
    sim.sleep(5 * 60_000);
    sim.poll();
    expect(sim.phase).toBe("vote");
    expect(sim.view(null).vote?.index).toBe(1);
    expect(sim.room.phaseStartedAt).toBe(sim.now);
  });

  it("absence longue pendant la création : les brouillons partent au vote, daté de maintenant", () => {
    const sim = new Sim({ players: 3, settings: { createSeconds: 30 } });
    sim.start();
    sim.must(sim.ids[1], { type: "draft", meme: memeFor(sim.firstTemplate(sim.ids[1]), "brouillon") });
    sim.sleep(10 * 60_000);
    sim.poll();
    expect(sim.phase).toBe("vote");
    expect(sim.view(null).vote?.count).toBe(1);
    expect(sim.room.phaseStartedAt).toBe(sim.now);
  });

  it("petit retard (≤ 3 s) : la phase suivante est datée depuis l'échéance, pas depuis le sondage", () => {
    const sim = new Sim({ players: 3, settings: { voteSeconds: 10 } });
    sim.start();
    sim.submitAll();
    sim.wait(2_000);
    const voteEnd = sim.room.phaseEndsAt!;
    sim.sleep(voteEnd - sim.now + 2_500);
    sim.poll();
    expect(sim.phase).toBe("reveal");
    expect(sim.room.phaseStartedAt).toBe(voteEnd);
    expect(sim.room.phaseEndsAt).toBe(voteEnd + LIMITS.revealSeconds * 1000);
  });

  it("gros retard (personne n'a sondé pendant 9 s) : aucun écran sauté, la phase repart de maintenant", () => {
    const sim = new Sim({ players: 3, settings: { voteSeconds: 10 } });
    sim.start();
    sim.submitAll();
    sim.wait(2_000);
    const voteEnd = sim.room.phaseEndsAt!;
    sim.sleep(voteEnd - sim.now + 9_000); // la révélation (5 s) serait déjà finie si on datait depuis l'échéance
    sim.poll();
    expect(sim.phase).toBe("reveal");
    expect(sim.room.phaseStartedAt).toBe(sim.now);
    expect(sim.room.phaseEndsAt).toBe(sim.now + LIMITS.revealSeconds * 1000);
  });

  it("joueurs tous déconnectés mais écran de classe actif : la partie suit ses échéances", () => {
    const sim = new Sim({ players: 3, settings: { voteSeconds: 10, rounds: 1 } });
    sim.start();
    sim.submitAll();
    sim.online.clear();
    const seen: string[] = [];
    for (let i = 0; i < 80 && sim.phase !== "final"; i++) {
      sim.now += 1_000;
      sim.room = tick(sim.room, sim.now, sim.catalog); // sondage du spectateur
      if (seen[seen.length - 1] !== sim.phase) seen.push(sim.phase);
    }
    expect(seen.slice(0, 4)).toEqual(["vote", "reveal", "vote", "reveal"]);
    expect(sim.phase).toBe("final");
    expect(sim.view(null).final!.gallery.every((m) => m.points === 0)).toBe(true);
  });

  it("rattrape plusieurs transitions d'un coup quand elles sont instantanées (aucun mème -> results)", () => {
    const sim = new Sim({ players: 3, settings: { createSeconds: 30, rounds: 1 } });
    sim.start();
    sim.wait(31_000);
    // personne n'a rien écrit : create -> (file vide) -> results en un seul tick
    expect(sim.phase).toBe("results");
    expect(sim.view(null).results).toEqual({ entries: [], roundPoints: { p1: 0, p2: 0, p3: 0 }, isLastRound: true });
    sim.wait(LIMITS.resultsSeconds * 1000);
    expect(sim.phase).toBe("final");
    expect(sim.view(null).final).toEqual({ ranking: ["p1", "p2", "p3"], awards: [], gallery: [] });
  });

  it("tick est sans effet (même objet) tant que rien ne doit changer", () => {
    const sim = new Sim({ players: 3 });
    sim.start();
    const before = sim.room;
    expect(tick(before, sim.now + 500, sim.catalog)).toBe(before);
    expect(tick(before, sim.now + 5_000, sim.catalog)).toBe(before);
  });
});

describe("transitions anticipées", () => {
  it("passe au vote dès que tous les participants connectés ont validé", () => {
    const sim = new Sim({ players: 3 });
    sim.start();
    sim.must(sim.ids[0], { type: "submit", meme: memeFor(sim.firstTemplate(sim.ids[0])) });
    sim.must(sim.ids[1], { type: "submit", meme: memeFor(sim.firstTemplate(sim.ids[1])) });
    expect(sim.phase).toBe("create");
    expect(sim.view(null).create).toMatchObject({ submittedCount: 2, totalPlayers: 3 });
    sim.must(sim.ids[2], { type: "submit", meme: memeFor(sim.firstTemplate(sim.ids[2])) });
    expect(sim.phase).toBe("vote");
    expect(sim.room.phaseStartedAt).toBe(sim.now);
    expect(sim.view(null).vote?.count).toBe(3);
  });

  it("un joueur déconnecté ne bloque pas : son brouillon non vide est pris quand même", () => {
    const sim = new Sim({ players: 3 });
    sim.start();
    sim.must(sim.ids[2], { type: "draft", meme: memeFor(sim.firstTemplate(sim.ids[2]), "pas fini") });
    sim.online.delete(sim.ids[2]);
    sim.wait(LIMITS.disconnectAfterMs + 1_000);
    expect(sim.view(null).players[2].connected).toBe(false);
    sim.submitAll();
    expect(sim.phase).toBe("vote");
    expect(sim.view(null).vote?.count).toBe(3);
  });

  it("passe à la révélation dès que tous les votants connectés ont voté", () => {
    const sim = new Sim({ players: 4 });
    sim.start();
    sim.submitAll();
    const v0 = sim.view(null).vote!;
    expect(v0).toMatchObject({ index: 0, count: 4, votedCount: 0, votersCount: 3, result: null });
    const author = sim.room.memes.find((m) => m.id === v0.memeId)!.authorId;
    const voters = sim.ids.filter((id) => id !== author);
    sim.must(voters[0], { type: "vote", memeId: v0.memeId, score: 3 });
    sim.must(voters[1], { type: "vote", memeId: v0.memeId, score: 1 });
    expect(sim.phase).toBe("vote");
    expect(sim.view(null).vote).toMatchObject({ votedCount: 2, votersCount: 3 });
    sim.must(voters[2], { type: "vote", memeId: v0.memeId, score: 0 });
    expect(sim.phase).toBe("reveal");
    const result = sim.view(null).vote!.result!;
    expect(result).toMatchObject({ memeId: v0.memeId, authorId: author, points: 4, breakdown: [1, 1, 0, 1], round: 1 });
    expect(sim.view(null).players.find((p) => p.id === author)!.score).toBe(4);
  });

  it("sans aucun votant connecté, on attend l'échéance (pas de saut immédiat)", () => {
    const sim = new Sim({ players: 2, settings: { voteSeconds: 10 } });
    sim.start();
    sim.submitAll();
    const author = sim.room.memes.find((m) => m.id === sim.view(null).vote!.memeId)!.authorId;
    const other = sim.ids.find((id) => id !== author)!;
    sim.online.delete(other);
    sim.wait(9_000);
    expect(sim.phase).toBe("vote");
    sim.wait(4_000); // l'autre est maintenant marqué déconnecté (> 12 s) mais l'échéance est passée
    expect(sim.phase).toBe("reveal");
    expect(sim.view(null).vote?.result?.points).toBe(0);
  });
});

describe("idempotence des actions", () => {
  /** rejoue l'action : l'état ne doit plus bouger du tout */
  function replay(sim: Sim, playerId: string | null, action: Parameters<Sim["act"]>[1]) {
    const before = sim.room;
    const out = applyAction(before, playerId, action, sim.now, sim.catalog);
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.room).toBe(before);
  }

  it("join avec le même joueur ne crée pas de doublon et renvoie le même jeton", () => {
    const sim = new Sim({ players: 2 });
    const before = sim.room;
    const out = applyAction(before, "p2", { type: "join", name: "Autre nom", avatar: "dog" }, sim.now, sim.catalog);
    expect(out).toMatchObject({ ok: true, result: { playerId: "p2", token: sim.tokens.get("p2") } });
    if (out.ok) expect(out.room).toBe(before);
  });

  it("settings, start, draft, submit, unsubmit", () => {
    const sim = new Sim({ players: 3 });
    sim.must(sim.host, { type: "settings", patch: { rounds: 2 } });
    replay(sim, sim.host, { type: "settings", patch: { rounds: 2 } });
    sim.start();
    replay(sim, sim.host, { type: "start" });
    expect(sim.room.round).toBe(1);
    const meme = memeFor(sim.firstTemplate("p2"), "une fois");
    sim.must("p2", { type: "draft", meme });
    replay(sim, "p2", { type: "draft", meme });
    sim.must("p2", { type: "submit", meme });
    replay(sim, "p2", { type: "submit", meme });
    // un brouillon tardif ne défait pas la validation
    replay(sim, "p2", { type: "draft", meme: memeFor(sim.firstTemplate("p2"), "vieux brouillon") });
    expect(sim.view("p2").create).toMatchObject({ submitted: true, submittedCount: 1 });
    expect(sim.view("p2").create?.myMeme?.values.haut).toBe("une fois");
    sim.must("p2", { type: "unsubmit" });
    replay(sim, "p2", { type: "unsubmit" });
    expect(sim.view("p2").create).toMatchObject({ submitted: false, submittedCount: 0 });
  });

  it("vote : même note deux fois, puis rejouée après la révélation", () => {
    const sim = new Sim({ players: 3 });
    sim.start();
    sim.submitAll();
    const { memeId } = sim.view(null).vote!;
    const author = sim.room.memes.find((m) => m.id === memeId)!.authorId;
    const [a, b] = sim.ids.filter((id) => id !== author);
    sim.must(a, { type: "vote", memeId, score: 2 });
    replay(sim, a, { type: "vote", memeId, score: 2 });
    expect(sim.view(a).vote).toMatchObject({ myVote: 2, votedCount: 1 });
    sim.must(b, { type: "vote", memeId, score: 3 });
    expect(sim.phase).toBe("reveal");
    replay(sim, b, { type: "vote", memeId, score: 3 });
    expect(sim.view(null).vote?.result?.points).toBe(5);
    // une note différente après la clôture est refusée
    expect(sim.act(b, { type: "vote", memeId, score: 0 })).toMatchObject({ ok: false, error: "bad_phase" });
    expect(sim.view(null).vote?.result?.points).toBe(5);
  });

  it("skip : un double envoi ne saute pas deux phases", () => {
    const sim = new Sim({ players: 3 });
    sim.start();
    sim.submitAll();
    sim.wait(2_000);
    sim.must(sim.host, { type: "skip" });
    expect(sim.phase).toBe("reveal");
    replay(sim, sim.host, { type: "skip" });
    sim.sleep(SKIP_GUARD_MS - 100);
    replay(sim, sim.host, { type: "skip" });
    expect(sim.phase).toBe("reveal");
  });

  it("kick, removeMeme, leave, again", () => {
    const sim = new Sim({ players: 4, settings: { rounds: 1 } });
    sim.must(sim.host, { type: "kick", playerId: "p4" });
    replay(sim, sim.host, { type: "kick", playerId: "p4" });
    expect(sim.view(null).players).toHaveLength(3);
    sim.online.delete("p4");
    sim.start();
    sim.submitAll();
    const { memeId } = sim.view(null).vote!;
    sim.must(sim.host, { type: "removeMeme", memeId });
    replay(sim, sim.host, { type: "removeMeme", memeId });
    expect(sim.view(null).vote).toMatchObject({ index: 1 });
    sim.playToFinal();
    sim.must(sim.host, { type: "again" });
    replay(sim, sim.host, { type: "again" });
    expect(sim.phase).toBe("lobby");
    sim.must("p3", { type: "leave" });
    // parti du lobby : son jeton n'est plus connu
    expect(sim.act("p3", { type: "leave" })).toMatchObject({ ok: false, error: "bad_token" });
    expect(sim.view(null).players.map((p) => p.id)).toEqual(["p1", "p2"]);
  });
});

describe("création de mème", () => {
  it("le brouillon est pris en compte à l'échéance, les mèmes vides sont exclus", () => {
    const sim = new Sim({ players: 4, settings: { createSeconds: 30 } });
    sim.start();
    sim.must("p1", { type: "submit", meme: memeFor(sim.firstTemplate("p1"), "validé") });
    sim.must("p2", { type: "draft", meme: memeFor(sim.firstTemplate("p2"), "brouillon") });
    sim.must("p3", { type: "draft", meme: memeFor(sim.firstTemplate("p3"), "   ") });
    sim.wait(30_000);
    expect(sim.phase).toBe("vote");
    expect(sim.view(null).vote?.count).toBe(2);
    const authors = sim.room.memes.map((m) => m.authorId).sort();
    expect(authors).toEqual(["p1", "p2"]);
    expect(sim.room.memes.map((m) => m.meme.values.haut).sort()).toEqual(["brouillon", "validé"]);
  });

  it("refuse de valider un mème vide", () => {
    const sim = new Sim({ players: 2 });
    sim.start();
    expect(sim.act("p1", { type: "submit", meme: memeFor(sim.firstTemplate("p1"), " \n ") })).toMatchObject({ ok: false, error: "invalid" });
    expect(sim.view("p1").create?.submitted).toBe(false);
  });

  it("unsubmit permet de modifier puis de revalider", () => {
    const sim = new Sim({ players: 3 });
    sim.start();
    const tpl = sim.firstTemplate("p1");
    sim.must("p1", { type: "submit", meme: memeFor(tpl, "v1") });
    expect(sim.view(null).players[0].done).toBe(true);
    sim.must("p1", { type: "unsubmit" });
    expect(sim.view(null).players[0].done).toBe(false);
    expect(sim.view("p1").create?.myMeme?.values.haut).toBe("v1");
    sim.must("p1", { type: "draft", meme: memeFor(tpl, "v2") });
    sim.must("p1", { type: "submit", meme: memeFor(tpl, "v3") });
    expect(sim.view("p1").create).toMatchObject({ submitted: true, myMeme: { values: { haut: "v3" } } });
    // revalider un autre texte sans unsubmit remplace le mème
    sim.must("p1", { type: "submit", meme: memeFor(tpl, "v4") });
    expect(sim.view("p1").create?.myMeme?.values.haut).toBe("v4");
  });

  it("refuse un gabarit hors main, inconnu, ou un mème illisible", () => {
    const sim = new Sim({ players: 2, settings: { jokers: 0 } });
    sim.start();
    const inHand = new Set(sim.view("p1").create!.hands.flat());
    const outside = sim.catalog.find((t) => !inHand.has(t.id))!.id;
    expect(sim.act("p1", { type: "submit", meme: memeFor(outside) })).toMatchObject({ ok: false, error: "invalid" });
    expect(sim.act("p1", { type: "submit", meme: memeFor(outside), usedJoker: true })).toMatchObject({ ok: false, error: "invalid" });
    expect(sim.act("p1", { type: "draft", meme: memeFor("gabarit-fantome") })).toMatchObject({ ok: false, error: "invalid" });
    expect(sim.act("p1", { type: "draft", meme: memeFor("perso:0123456789abcdef") })).toMatchObject({ ok: false, error: "invalid" });
    expect(sim.act("p1", { type: "draft", meme: { templateId: 42 } as never })).toMatchObject({ ok: false, error: "invalid" });
    expect(sim.view("p1").create?.myMeme).toBeNull();
  });

  it("mode meme-image : seul le gabarit imposé est accepté, même avec un joker", () => {
    const sim = new Sim({ players: 2, settings: { mode: "meme-image", jokers: 3 } });
    sim.start();
    const forced = sim.view("p1").create!.forcedTemplateId!;
    const other = sim.catalog.find((t) => t.id !== forced)!.id;
    expect(sim.act("p1", { type: "submit", meme: memeFor(other), usedJoker: true })).toMatchObject({ ok: false, error: "invalid" });
    sim.must("p1", { type: "submit", meme: memeFor(forced) });
    expect(sim.view("p1").me?.jokersLeft).toBe(3);
    // tous les joueurs ont le même gabarit imposé
    expect(sim.view("p2").create?.forcedTemplateId).toBe(forced);
  });

  it("joker : décompté une seule fois par manche, rendu si on revient à sa main", () => {
    const sim = new Sim({ players: 2, settings: { jokers: 1 } });
    sim.start();
    const hand = sim.view("p1").create!.hands.flat();
    const outside = sim.catalog.filter((t) => !hand.includes(t.id)).map((t) => t.id);
    sim.must("p1", { type: "draft", meme: memeFor(outside[0], "a"), usedJoker: true });
    expect(sim.view("p1").me?.jokersLeft).toBe(0);
    sim.must("p1", { type: "draft", meme: memeFor(outside[0], "ab"), usedJoker: true });
    sim.must("p1", { type: "draft", meme: memeFor(outside[1], "abc"), usedJoker: true });
    sim.must("p1", { type: "submit", meme: memeFor(outside[1], "abcd"), usedJoker: true });
    expect(sim.view("p1").me?.jokersLeft).toBe(0);
    // retour à un gabarit de la main : le joker est rendu
    sim.must("p1", { type: "submit", meme: memeFor(hand[0], "finalement") });
    expect(sim.view("p1").me?.jokersLeft).toBe(1);
    // et peut resservir
    sim.must("p1", { type: "submit", meme: memeFor(outside[2], "re"), usedJoker: true });
    expect(sim.view("p1").me?.jokersLeft).toBe(0);
    // l'autre joueur n'est pas affecté
    expect(sim.view("p2").me?.jokersLeft).toBe(1);
  });

  it("joker : épuisé à la manche suivante, mais rendu si le mème hors main était vide", () => {
    const sim = new Sim({ players: 2, settings: { jokers: 1, rounds: 3, createSeconds: 30 } });
    sim.start();
    const outsideOf = (id: string) => {
      const hand = sim.view(id).create!.hands.flat();
      return sim.catalog.find((t) => !hand.includes(t.id))!.id;
    };
    // manche 1 : p1 pose un joker sur un brouillon vide -> rendu à la fin de la création
    sim.must("p1", { type: "draft", meme: memeFor(outsideOf("p1"), ""), usedJoker: true });
    expect(sim.view("p1").me?.jokersLeft).toBe(0);
    sim.must("p2", { type: "submit", meme: memeFor(sim.firstTemplate("p2")) });
    sim.waitUntil((r) => r.phase === "vote");
    expect(sim.view("p1").me?.jokersLeft).toBe(1);
    sim.waitUntil((r) => r.phase === "create" && r.round === 2);
    // manche 2 : joker réellement utilisé
    sim.must("p1", { type: "submit", meme: memeFor(outsideOf("p1"), "joker"), usedJoker: true });
    sim.must("p2", { type: "submit", meme: memeFor(sim.firstTemplate("p2")) });
    sim.waitUntil((r) => r.phase === "create" && r.round === 3);
    expect(sim.view("p1").me?.jokersLeft).toBe(0);
    expect(sim.act("p1", { type: "submit", meme: memeFor(outsideOf("p1"), "encore"), usedJoker: true })).toMatchObject({ ok: false, error: "invalid" });
  });

  it("nettoie les textes : champs du gabarit seulement, contrôles retirés, \\n gardé, coupé à maxLength", () => {
    const sim = new Sim({ players: 2 });
    sim.start();
    const tplId = sim.view("p1").create!.hands.flat().find((id) => sim.catalog.find((t) => t.id === id)!.fields.length === 2)!;
    sim.must("p1", {
      type: "draft",
      meme: {
        templateId: tplId,
        values: {
          haut: `ligne 1\r\nligne\u0000 2\u0007\u001b[31m\u202e${"x".repeat(200)}`,
          bas: 12345 as never,
          intrus: "ne doit pas passer",
          __proto__: "non plus",
        } as never,
        stickers: [],
      },
    });
    const meme = sim.view("p1").create!.myMeme!;
    expect(Object.keys(meme.values).sort()).toEqual(["bas", "haut"]);
    expect(meme.values.bas).toBe("");
    expect(meme.values.haut.startsWith("ligne 1\nligne 2[31m")).toBe(true);
    expect(meme.values.haut).toHaveLength(60);
    expect(meme.values.haut).not.toMatch(/[\u0000-\u0009\u000b-\u001f\u202e]/);
  });

  it("nettoie les stickers : bornes, nombre maximal, ids valides", () => {
    const sim = new Sim({ players: 2 });
    sim.start();
    const tpl = sim.firstTemplate("p1");
    sim.must("p1", {
      type: "draft",
      meme: {
        templateId: tpl,
        values: { haut: "ok" },
        stickers: [
          { e: "skull", x: -4, y: 9, s: 50, r: 999 },
          { e: "fire", x: 0.5, y: 0.25, s: 0.001, r: -720 },
          { e: "../hack", x: 0.5, y: 0.5, s: 0.2, r: 0 },
          { e: "UPPER", x: 0.5, y: 0.5, s: 0.2, r: 0 },
          { e: "ok-1", x: Number.NaN, y: 0.5, s: 0.2, r: 0 },
          { e: "ok-2", x: "0.5" as never, y: 0.5, s: 0.2, r: 0 },
          null as never,
          ...Array.from({ length: 10 }, (_, i) => ({ e: `star-${i}`, x: 0.1, y: 0.1, s: 0.1, r: 10 })),
        ],
      },
    });
    const stickers = sim.view("p1").create!.myMeme!.stickers;
    expect(stickers).toHaveLength(MAX_STICKERS);
    expect(stickers[0]).toEqual({ e: "skull", x: 0, y: 1, s: 0.6, r: 180 });
    expect(stickers[1]).toEqual({ e: "fire", x: 0.5, y: 0.25, s: 0.06, r: -180 });
    expect(stickers.map((s) => s.e)).toEqual(["skull", "fire", "star-0", "star-1", "star-2", "star-3"]);
  });

  it("refuse les stickers quand ils sont désactivés (le mème passe sans eux)", () => {
    const sim = new Sim({ players: 2, settings: { stickers: false } });
    sim.start();
    sim.must("p1", {
      type: "submit",
      meme: { templateId: sim.firstTemplate("p1"), values: { haut: "texte" }, stickers: [{ e: "skull", x: 0.5, y: 0.5, s: 0.2, r: 0 }] },
    });
    expect(sim.view("p1").create?.myMeme).toMatchObject({ values: { haut: "texte" }, stickers: [] });
  });

  it("draft / submit / unsubmit hors phase de création : bad_phase", () => {
    const sim = new Sim({ players: 2 });
    const meme = memeFor(sim.catalog[0].id);
    expect(sim.act("p1", { type: "draft", meme })).toMatchObject({ ok: false, error: "bad_phase" });
    expect(sim.act("p1", { type: "submit", meme })).toMatchObject({ ok: false, error: "bad_phase" });
    expect(sim.act("p1", { type: "unsubmit" })).toMatchObject({ ok: false, error: "bad_phase" });
    expect(sim.act("p1", { type: "vote", memeId: "m1-1-1", score: 2 })).toMatchObject({ ok: false, error: "bad_phase" });
  });
});

describe("vote", () => {
  it("l'auteur ne peut pas voter pour son mème ; on peut changer sa note tant que le vote est ouvert", () => {
    const sim = new Sim({ players: 4 });
    sim.start();
    sim.submitAll();
    const { memeId } = sim.view(null).vote!;
    const author = sim.room.memes.find((m) => m.id === memeId)!.authorId;
    expect(sim.view(author).vote).toMatchObject({ isMine: true, myVote: null });
    expect(sim.act(author, { type: "vote", memeId, score: 3 })).toMatchObject({ ok: false, error: "invalid" });
    const voter = sim.ids.find((id) => id !== author)!;
    expect(sim.view(voter).vote?.isMine).toBe(false);
    sim.must(voter, { type: "vote", memeId, score: 1 });
    sim.must(voter, { type: "vote", memeId, score: 3 });
    expect(sim.view(voter).vote).toMatchObject({ myVote: 3, votedCount: 1 });
    expect(sim.act(voter, { type: "vote", memeId: "m1-1-99", score: 3 })).toMatchObject({ ok: false, error: "bad_phase" });
  });

  it("ne révèle jamais l'auteur pendant le vote : ni authorId, ni result, ni score, ni id parlant", () => {
    const sim = new Sim({ players: 5 });
    sim.start();
    sim.submitAll((id) => `texte-${id.toUpperCase()}`);
    for (let i = 0; i < 5; i++) {
      expect(sim.phase).toBe("vote");
      const entry = sim.room.memes.find((m) => m.id === sim.view(null).vote!.memeId)!;
      const scoresBefore = sim.view(null).players.map((p) => p.score);
      const voters = sim.ids.filter((id) => id !== entry.authorId);
      for (const viewer of [null, ...voters]) {
        const view = sim.view(viewer);
        expect(view.vote!.result).toBeNull();
        expect(view.vote!.isMine).toBe(false);
        const voteJson = JSON.stringify(view.vote);
        expect(voteJson).not.toContain("authorId");
        expect(voteJson).not.toContain(`"${entry.authorId}"`);
        expect(view.vote!.memeId).not.toContain(entry.authorId);
        expect(dump(view)).not.toContain("authorName");
        expect(view.results).toBeUndefined();
        expect(view.final).toBeUndefined();
      }
      // on vote un par un (sauf le dernier) : les scores ne bougent pas pendant le vote
      for (const v of voters.slice(0, -1)) {
        sim.must(v, { type: "vote", memeId: entry.id, score: 3 });
        expect(sim.view(null).players.map((p) => p.score)).toEqual(scoresBefore);
      }
      // avant le dernier vote, l'auteur n'est pas le seul « pas fini » : `done` ne le trahit pas
      const done = sim.view(null).players.filter((p) => p.done).map((p) => p.id);
      expect(done).toContain(entry.authorId);
      sim.must(voters[voters.length - 1], { type: "vote", memeId: entry.id, score: 3 });
      expect(sim.phase).toBe("reveal");
      expect(sim.view(null).vote!.result).toMatchObject({ authorId: entry.authorId, points: 12 });
      sim.waitUntil((r) => r.phase !== "reveal");
    }
    expect(sim.phase).toBe("results");
  });

  it("l'ordre de vote est mélangé (pas l'ordre d'arrivée) mais déterministe", () => {
    const order = (seed: string) => {
      const sim = new Sim({ players: 8, seed });
      sim.start();
      sim.submitAll();
      return sim.room.current!.queue.map((id) => sim.room.memes.find((m) => m.id === id)!.authorId);
    };
    const a = order("graine-1");
    expect(a).toEqual(order("graine-1"));
    expect([...a].sort()).toEqual(["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"]);
    expect([order("graine-1"), order("graine-2"), order("graine-3")].some((o) => o.join() !== "p1,p2,p3,p4,p5,p6,p7,p8")).toBe(true);
    expect(order("graine-1")).not.toEqual(order("graine-2"));
  });

  it("classement de manche : trié, points de manche par joueur, dernière manche signalée", () => {
    const sim = new Sim({ players: 3, settings: { rounds: 2 } });
    sim.start();
    sim.submitAll();
    const points: Record<string, 0 | 1 | 2 | 3> = { p1: 3, p2: 1, p3: 2 };
    while (sim.phase !== "results") {
      if (sim.phase === "vote") {
        const author = sim.room.memes.find((m) => m.id === sim.view(null).vote!.memeId)!.authorId;
        sim.voteAll(() => points[author]);
      } else sim.wait(1000);
    }
    const results = sim.view("p2").results!;
    expect(results.isLastRound).toBe(false);
    expect(results.entries.map((e) => e.authorId)).toEqual(["p1", "p3", "p2"]);
    expect(results.entries.map((e) => e.points)).toEqual([6, 4, 2]);
    expect(results.roundPoints).toEqual({ p1: 6, p2: 2, p3: 4 });
    expect(results.entries[0]).toMatchObject({ authorName: "Joueur 1", authorAvatar: "fox", round: 1, breakdown: [0, 0, 0, 2] });
  });
});

describe("arrivée en cours de partie", () => {
  it("le nouveau vote tout de suite et crée à partir de la manche suivante", () => {
    const sim = new Sim({ players: 3, settings: { rounds: 2 } });
    sim.start();
    const late = sim.join("Retardataire");
    const view = sim.view(late);
    expect(view.phase).toBe("create");
    expect(view.me).toMatchObject({ id: late, isHost: false });
    expect(view.create).toMatchObject({ hands: [], situations: [], submitted: false, myMeme: null, totalPlayers: 3 });
    expect(sim.act(late, { type: "submit", meme: memeFor(sim.catalog[0].id) })).toMatchObject({ ok: false, error: "bad_phase" });
    // il ne bloque pas la création
    sim.submitAll();
    expect(sim.phase).toBe("vote");
    // ... et il vote tout de suite
    const { memeId } = sim.view(late).vote!;
    expect(sim.view(late).vote).toMatchObject({ isMine: false, votersCount: 3 });
    sim.must(late, { type: "vote", memeId, score: 3 });
    expect(sim.view(late).vote?.myVote).toBe(3);
    sim.waitUntil((r) => r.phase === "create" && r.round === 2, 900_000);
    const next = sim.view(late).create!;
    expect(next.hands).toHaveLength(3);
    expect(next.totalPlayers).toBe(4);
    sim.must(late, { type: "submit", meme: memeFor(sim.firstTemplate(late)) });
    expect(sim.view(late).create?.submitted).toBe(true);
  });
});

describe("kick, leave, hôte", () => {
  it("kick : le joueur disparaît et son jeton renvoie « kicked »", () => {
    const sim = new Sim({ players: 3 });
    expect(sim.act("p2", { type: "kick", playerId: "p3" })).toMatchObject({ ok: false, error: "not_host" });
    expect(sim.act("p1", { type: "kick", playerId: "p1" })).toMatchObject({ ok: false, error: "invalid" });
    sim.must("p1", { type: "kick", playerId: "p3" });
    expect(sim.view(null).players.map((p) => p.id)).toEqual(["p1", "p2"]);
    expect(authenticate(sim.room, sim.tokens.get("p3"))).toEqual({ kind: "kicked" });
    expect(authenticate(sim.room, sim.tokens.get("p2"))).toEqual({ kind: "player", playerId: "p2" });
    expect(authenticate(sim.room, "jeton-inconnu")).toEqual({ kind: "unknown" });
    expect(authenticate(sim.room, null)).toEqual({ kind: "unknown" });
    // il ne peut pas revenir avec le même jeton
    const back = applyAction(sim.room, null, { type: "join", name: "Revenant", avatar: "cat" }, sim.now, sim.catalog, { playerId: "px", token: sim.tokens.get("p3")! });
    expect(back).toMatchObject({ ok: false, error: "kicked" });
    expect(sim.act("p3", { type: "leave" })).toMatchObject({ ok: false, error: "bad_token" });
  });

  it("kick pendant le vote de son mème : le mème est retiré et on passe au suivant", () => {
    const sim = new Sim({ players: 4, settings: { rounds: 1 } });
    sim.start();
    sim.submitAll();
    const { memeId } = sim.view(null).vote!;
    const author = sim.room.memes.find((m) => m.id === memeId)!.authorId;
    const host = sim.host;
    const target = author === host ? sim.ids.find((id) => id !== host)! : author;
    // on avance jusqu'au mème de la cible
    while (sim.room.memes.find((m) => m.id === sim.view(null).vote?.memeId)?.authorId !== target) {
      sim.voteAll(() => 1);
      sim.waitUntil((r) => r.phase === "vote");
    }
    const index = sim.view(null).vote!.index;
    sim.must(host, { type: "kick", playerId: target });
    sim.online.delete(target);
    if (index < 3) {
      expect(sim.phase).toBe("vote");
      expect(sim.view(null).vote!.index).toBe(index + 1);
    } else {
      expect(sim.phase).toBe("results");
    }
    sim.playToFinal(() => 2);
    const final = sim.view(null).final!;
    expect(final.gallery).toHaveLength(3);
    expect(final.gallery.some((m) => m.authorId === target)).toBe(false);
    expect(final.ranking).not.toContain(target);
    expect(dump(sim.view(null))).not.toContain(`"${target}"`);
  });

  it("kick pendant la création : le joueur ne bloque plus et son mème n'est pas joué", () => {
    const sim = new Sim({ players: 3 });
    sim.start();
    sim.must("p3", { type: "draft", meme: memeFor(sim.firstTemplate("p3"), "à jeter") });
    sim.must("p1", { type: "submit", meme: memeFor(sim.firstTemplate("p1")) });
    sim.must("p2", { type: "submit", meme: memeFor(sim.firstTemplate("p2")) });
    expect(sim.phase).toBe("create");
    sim.must("p1", { type: "kick", playerId: "p3" });
    expect(sim.phase).toBe("vote");
    expect(sim.view(null).vote?.count).toBe(2);
  });

  it("leave dans le lobby : retiré ; l'hôte qui part passe la main", () => {
    const sim = new Sim({ players: 3 });
    sim.must("p1", { type: "leave" });
    const view = sim.view(null);
    expect(view.players.map((p) => p.id)).toEqual(["p2", "p3"]);
    expect(view.hostId).toBe("p2");
    expect(view.players[0].isHost).toBe(true);
    expect(authenticate(sim.room, sim.tokens.get("p1"))).toEqual({ kind: "unknown" });
  });

  it("leave en cours de partie : marqué parti, ses mèmes restent, il peut revenir avec son jeton", () => {
    const sim = new Sim({ players: 4, settings: { rounds: 2 } });
    sim.start();
    sim.must("p4", { type: "submit", meme: memeFor(sim.firstTemplate("p4"), "souvenir") });
    sim.must("p4", { type: "leave" });
    sim.online.delete("p4");
    expect(authenticate(sim.room, sim.tokens.get("p4"))).toEqual({ kind: "left", playerId: "p4" });
    let view = sim.view(null);
    expect(view.players.find((p) => p.id === "p4")).toMatchObject({ connected: false });
    expect(view.create).toMatchObject({ totalPlayers: 3, submittedCount: 0 });
    // vue demandée avec l'id d'un joueur parti : traitée comme un spectateur
    expect(sim.view("p4").me).toBeNull();
    expect(sim.act("p4", { type: "unsubmit" })).toMatchObject({ ok: false, error: "bad_token" });
    sim.submitAll();
    expect(sim.view(null).vote?.count).toBe(4);
    sim.waitUntil((r) => r.phase === "results" || r.phase === "vote");
    while (sim.phase !== "results") {
      if (sim.phase === "vote") sim.voteAll(() => 2);
      else sim.wait(1000);
    }
    view = sim.view(null);
    expect(view.results!.entries.find((e) => e.authorId === "p4")).toMatchObject({ points: 6, authorName: "Joueur 4" });
    expect(view.players.find((p) => p.id === "p4")!.score).toBe(6);
    // retour avec le même jeton
    const back = applyAction(sim.room, "p4", { type: "join", name: "Joueur 4", avatar: "cat" }, sim.now, sim.catalog);
    expect(back).toMatchObject({ ok: true, result: { playerId: "p4", token: sim.tokens.get("p4") } });
    if (back.ok) {
      sim.room = back.room;
      sim.online.add("p4");
      expect(sim.view("p4").me).toMatchObject({ id: "p4" });
      expect(sim.view("p4").players.find((p) => p.id === "p4")).toMatchObject({ connected: true, score: 6 });
    }
  });

  it("transfert d'hôte : après 30 s de silence, le plus ancien joueur connecté devient hôte", () => {
    const sim = new Sim({ players: 4 });
    sim.online.delete("p1");
    sim.wait(LIMITS.disconnectAfterMs + 2_000);
    expect(sim.view(null).players[0]).toMatchObject({ connected: false, isHost: true });
    sim.wait(HOST_TIMEOUT_MS - LIMITS.disconnectAfterMs);
    const view = sim.view("p2");
    expect(view.hostId).toBe("p2");
    expect(view.me?.isHost).toBe(true);
    expect(view.players.filter((p) => p.isHost).map((p) => p.id)).toEqual(["p2"]);
    // l'ancien hôte revient : il ne récupère pas le rôle
    sim.online.add("p1");
    sim.wait(2_000);
    expect(sim.view("p1")).toMatchObject({ hostId: "p2", me: { isHost: false } });
    expect(sim.act("p1", { type: "start" })).toMatchObject({ ok: false, error: "not_host" });
    sim.must("p2", { type: "start" });
    expect(sim.phase).toBe("create");
  });

  it("l'hôte garde son rôle si personne d'autre n'est connecté", () => {
    const sim = new Sim({ players: 2 });
    sim.online.clear();
    sim.sleep(10 * 60_000);
    sim.room = tick(sim.room, sim.now, sim.catalog);
    expect(sim.room.hostId).toBe("p1");
  });

  it("l'hôte qui quitte en cours de partie est remplacé immédiatement", () => {
    const sim = new Sim({ players: 3 });
    sim.start();
    sim.must("p1", { type: "leave" });
    expect(sim.room.hostId).toBe("p2");
    expect(sim.act("p2", { type: "skip" }).ok).toBe(true);
  });
});

describe("modération et rejouer", () => {
  it("removeMeme : 0 point, retiré des résultats et de la galerie, on passe au suivant", () => {
    const sim = new Sim({ players: 4, settings: { rounds: 1 } });
    sim.start();
    sim.submitAll();
    const first = sim.view(null).vote!;
    const author = sim.room.memes.find((m) => m.id === first.memeId)!.authorId;
    const voter = sim.ids.find((id) => id !== author)!;
    sim.must(voter, { type: "vote", memeId: first.memeId, score: 3 });
    expect(sim.act(voter === sim.host ? author : voter === "p2" ? "p3" : "p2", { type: "removeMeme", memeId: first.memeId }).ok).toBe(
      (voter === sim.host ? author : voter === "p2" ? "p3" : "p2") === sim.host,
    );
    sim.must(sim.host, { type: "removeMeme", memeId: first.memeId });
    expect(sim.view(null).vote).toMatchObject({ index: 1, votedCount: 0 });
    expect(sim.act(sim.host, { type: "removeMeme", memeId: "inconnu" })).toMatchObject({ ok: false, error: "invalid" });
    sim.playToFinal(() => 2);
    const view = sim.view(null);
    expect(view.final!.gallery).toHaveLength(3);
    expect(view.final!.gallery.some((m) => m.memeId === first.memeId)).toBe(false);
    expect(view.players.find((p) => p.id === author)!.score).toBe(0);
    expect(view.final!.awards.some((a) => a.memeId === first.memeId)).toBe(false);
  });

  it("removeMeme du dernier mème pendant la révélation : direct au classement, sans lui", () => {
    const sim = new Sim({ players: 2, settings: { rounds: 1 } });
    sim.start();
    sim.submitAll();
    sim.voteAll(() => 3);
    sim.waitUntil((r) => r.phase === "vote");
    sim.voteAll(() => 3);
    expect(sim.phase).toBe("reveal");
    const last = sim.view(null).vote!.memeId;
    sim.must(sim.host, { type: "removeMeme", memeId: last });
    expect(sim.phase).toBe("results");
    expect(sim.view(null).results!.entries).toHaveLength(1);
  });

  it("skip : réservé à l'hôte, hors lobby et final ; fait avancer chaque phase", () => {
    const sim = new Sim({ players: 3, settings: { rounds: 1 } });
    expect(sim.act(sim.host, { type: "skip" })).toMatchObject({ ok: false, error: "bad_phase" });
    sim.start();
    expect(sim.act("p2", { type: "skip" })).toMatchObject({ ok: false, error: "not_host" });
    sim.must("p2", { type: "draft", meme: memeFor(sim.firstTemplate("p2"), "brouillon") });
    sim.must("p3", { type: "draft", meme: memeFor(sim.firstTemplate("p3"), "brouillon 2") });
    const seen: string[] = [];
    for (let i = 0; i < 12 && sim.phase !== "final"; i++) {
      sim.wait(2_000);
      sim.must(sim.host, { type: "skip" });
      seen.push(sim.phase);
    }
    expect(seen).toEqual(["vote", "reveal", "vote", "reveal", "results", "final"]);
    expect(sim.act(sim.host, { type: "skip" })).toMatchObject({ ok: false, error: "bad_phase" });
  });

  it("again : retour au lobby, scores et jokers remis à zéro, joueurs et réglages conservés", () => {
    const sim = new Sim({ players: 4, settings: { rounds: 1, jokers: 2, profs: ["Mme Roux"], mode: "theme" } });
    sim.start();
    const hand = sim.view("p2").create!.hands.flat();
    const outside = sim.catalog.find((t) => !hand.includes(t.id))!.id;
    sim.must("p2", { type: "submit", meme: memeFor(outside, "joker"), usedJoker: true });
    sim.must("p4", { type: "submit", meme: memeFor(sim.firstTemplate("p4")) });
    sim.must("p4", { type: "leave" });
    sim.online.delete("p4");
    expect(sim.act(sim.host, { type: "again" })).toMatchObject({ ok: false, error: "bad_phase" });
    sim.must("p1", { type: "submit", meme: memeFor(sim.firstTemplate("p1")) });
    sim.must("p3", { type: "submit", meme: memeFor(sim.firstTemplate("p3")) });
    expect(sim.phase).toBe("vote");
    sim.playToFinal(() => 3);
    expect(sim.view("p2").me?.jokersLeft).toBe(1);
    expect(sim.act("p2", { type: "again" })).toMatchObject({ ok: false, error: "not_host" });
    const settingsBefore = sim.view(null).settings;
    sim.must(sim.host, { type: "again" });
    const view = sim.view("p2");
    expect(view).toMatchObject({ phase: "lobby", round: 0, phaseEndsAt: null, settings: settingsBefore });
    expect(view.players.map((p) => p.id)).toEqual(["p1", "p2", "p3"]); // le joueur parti n'est plus là
    expect(view.players.every((p) => p.score === 0 && !p.done)).toBe(true);
    expect(view.me?.jokersLeft).toBe(2);
    expect(view.final).toBeUndefined();
    // et on peut rejouer
    sim.playToFinal(() => 1);
    expect(sim.view(null).final!.gallery).toHaveLength(3);
    expect(sim.view(null).players.every((p) => p.score === 2)).toBe(true);
  });
});

describe("vues : spectateur, secrets, versions", () => {
  it("spectateur : pas de `me`, pas de mains, pas de brouillon", () => {
    const sim = new Sim({ players: 3 });
    sim.start();
    sim.must("p1", { type: "draft", meme: memeFor(sim.firstTemplate("p1"), "secret de p1") });
    const view = sim.view(null);
    expect(view.me).toBeNull();
    expect(view.create).toMatchObject({ hands: [], situations: [], submitted: false, myMeme: null, totalPlayers: 3 });
    expect(dump(view)).not.toContain("secret de p1");
    // un autre joueur ne voit pas non plus le brouillon ni la main de p1
    expect(dump(sim.view("p2"))).not.toContain("secret de p1");
    expect(sim.view("p2").create!.hands).not.toEqual(sim.view("p1").create!.hands);
    // id inconnu : spectateur
    expect(sim.view("fantome").me).toBeNull();
  });

  it("aucune fuite de jeton ni de graine dans aucune vue, à aucune phase", () => {
    const sim = new Sim({ players: 5, settings: { rounds: 1 }, seed: "GRAINE-ULTRA-SECRETE" });
    const check = () => {
      for (const viewer of [null, ...sim.ids]) {
        const json = dump(sim.view(viewer));
        expect(json).not.toContain("GRAINE-ULTRA-SECRETE");
        expect(json).not.toContain("token");
        expect(json).not.toContain("kicked");
        for (const token of sim.tokens.values()) expect(json).not.toContain(token);
      }
    };
    check();
    sim.must(sim.host, { type: "kick", playerId: "p5" });
    sim.online.delete("p5");
    check();
    sim.start();
    check();
    sim.submitAll();
    check();
    sim.voteAll(() => 2);
    check();
    sim.waitUntil((r) => r.phase === "results");
    check();
    sim.waitUntil((r) => r.phase === "final");
    check();
  });

  it("la version ne bouge pas sur une simple présence", () => {
    const sim = new Sim({ players: 3 });
    const v0 = sim.view("p2").version;
    const r0 = sim.room;
    // sondages rapprochés : aucune écriture du tout
    sim.now += 1_000;
    expect(touchPresence(sim.room, "p2", sim.now)).toBe(r0);
    sim.wait(3_000);
    // présence réécrite (> 4 s) mais version inchangée
    sim.wait(8_000);
    expect(sim.room).not.toBe(r0);
    expect(sim.room.players[1].lastSeen).toBeGreaterThan(r0.players[1].lastSeen);
    expect(sim.view("p2").version).toBe(v0);
    expect(sim.view(null).version).toBe(sim.room.version);
    expect(viewVersion(sim.room, "p2")).toBe(v0);
  });

  it("la version bouge quand un joueur se déconnecte ou se reconnecte", () => {
    const sim = new Sim({ players: 3 });
    const v0 = sim.view(null).version;
    sim.online.delete("p3");
    sim.wait(LIMITS.disconnectAfterMs - 1_000);
    expect(sim.view(null).version).toBe(v0);
    sim.wait(1_000);
    expect(sim.view(null).players[2].connected).toBe(false);
    const v1 = sim.view(null).version;
    expect(v1).toBeGreaterThan(v0);
    sim.wait(20_000);
    expect(sim.view(null).version).toBe(v1);
    sim.online.add("p3");
    sim.wait(1_000);
    expect(sim.view(null).players[2].connected).toBe(true);
    expect(sim.view(null).version).toBeGreaterThan(v1);
  });

  it("la version bouge pour les compteurs ; un brouillon ne change que la version de son auteur", () => {
    const sim = new Sim({ players: 3 });
    sim.start();
    const before = { p1: sim.view("p1").version, p2: sim.view("p2").version, tv: sim.view(null).version };
    sim.must("p1", { type: "draft", meme: memeFor(sim.firstTemplate("p1"), "brouillon") });
    expect(sim.view("p1").version).toBeGreaterThan(before.p1);
    expect(sim.view("p2").version).toBe(before.p2);
    expect(sim.view(null).version).toBe(before.tv);
    sim.must("p1", { type: "submit", meme: memeFor(sim.firstTemplate("p1"), "brouillon") });
    expect(sim.view("p2").version).toBeGreaterThan(before.p2);
    expect(sim.view(null).version).toBeGreaterThan(before.tv);
    expect(sim.view(null).create?.submittedCount).toBe(1);
    sim.submitAll();
    const { memeId } = sim.view(null).vote!;
    const author = sim.room.memes.find((m) => m.id === memeId)!.authorId;
    const [a, b] = sim.ids.filter((id) => id !== author);
    const v1 = sim.view(null).version;
    sim.must(a, { type: "vote", memeId, score: 1 });
    const v2 = sim.view(null).version;
    expect(v2).toBeGreaterThan(v1);
    // changer sa note : visible seulement par le votant
    const vb = sim.view(b).version;
    const va = sim.view(a).version;
    sim.must(a, { type: "vote", memeId, score: 2 });
    expect(sim.view(null).version).toBe(v2);
    expect(sim.view(b).version).toBe(vb);
    expect(sim.view(a).version).toBeGreaterThan(va);
  });

  it("les versions ne décroissent jamais au fil d'une partie", () => {
    const sim = new Sim({ players: 4, settings: { rounds: 2 } });
    let last = new Map<string | null, number>();
    const check = () => {
      const next = new Map<string | null, number>();
      for (const viewer of [null, ...sim.ids]) {
        const v = sim.view(viewer).version;
        expect(v).toBeGreaterThanOrEqual(last.get(viewer) ?? 0);
        next.set(viewer, v);
      }
      last = next;
    };
    sim.start();
    let guard = 0;
    while (sim.phase !== "final" && guard++ < 2000) {
      if (sim.phase === "create") sim.submitAll();
      else if (sim.phase === "vote") sim.voteAll(() => 2);
      else sim.wait(1000);
      check();
    }
    sim.must(sim.host, { type: "again" });
    check();
  });
});

describe("distribution des mains", () => {
  it("mains de la bonne taille, sans doublon entre mains, catégories variées, gabarits du catalogue", () => {
    const sim = new Sim({ players: 30, settings: { handSize: 4, rerolls: 2 } });
    sim.start();
    const ids = new Set(sim.catalog.map((t) => t.id));
    for (const id of sim.ids) {
      const hands = sim.view(id).create!.hands;
      expect(hands).toHaveLength(3);
      const all = hands.flat();
      expect(all).toHaveLength(12);
      expect(new Set(all).size).toBe(12);
      for (const t of all) expect(ids.has(t)).toBe(true);
      for (const hand of hands) {
        expect(hand).toHaveLength(4);
        expect(new Set(hand.map((t) => categoryOf(sim.catalog, t))).size).toBeGreaterThanOrEqual(3);
      }
    }
    // tous les joueurs n'ont pas la même main
    expect(new Set(sim.ids.map((id) => sim.view(id).create!.hands[0].join())).size).toBeGreaterThan(20);
  });

  it("évite les gabarits déjà proposés au joueur dans la partie quand c'est possible", () => {
    const sim = new Sim({ players: 2, settings: { handSize: 3, rerolls: 1, rounds: 5 } });
    sim.start();
    const seen = new Set<string>();
    for (let round = 1; round <= 5; round++) {
      sim.waitUntil((r) => r.phase === "create" && r.round === round, 900_000);
      const all = sim.view("p1").create!.hands.flat();
      expect(all).toHaveLength(6);
      for (const t of all) {
        expect(seen.has(t)).toBe(false); // 5 manches x 6 = 30 gabarits : jamais deux fois le même
        seen.add(t);
      }
      sim.submitAll();
    }
    expect(seen.size).toBe(30);
  });

  it("quand tout a déjà été vu, redistribue quand même des mains complètes", () => {
    const sim = new Sim({ players: 2, settings: { handSize: 6, rerolls: 4, rounds: 3 } });
    sim.start();
    for (let round = 1; round <= 3; round++) {
      sim.waitUntil((r) => r.phase === "create" && r.round === round, 900_000);
      const hands = sim.view("p2").create!.hands;
      expect(hands).toHaveLength(5);
      expect(new Set(hands.flat()).size).toBe(30);
      sim.submitAll();
    }
  });

  it("respecte le filtre de catégories", () => {
    const sim = new Sim({ players: 3, settings: { categories: ["ecole", "cases"], handSize: 4, rerolls: 1 } });
    sim.start();
    for (const id of sim.ids) {
      const all = sim.view(id).create!.hands.flat();
      expect(all).toHaveLength(8);
      for (const t of all) expect(["ecole", "cases"]).toContain(categoryOf(sim.catalog, t));
    }
  });

  it("ignore le filtre s'il laisse trop peu de gabarits", () => {
    const catalog = fakeCatalog(30).filter((t) => t.category !== "affiches" || t.id.endsWith("-1"));
    const sim = new Sim({ players: 2, catalog, settings: { categories: ["affiches"], handSize: 4, rerolls: 0 } });
    sim.start();
    const cats = new Set(sim.view("p1").create!.hands.flat().map((t) => categoryOf(catalog, t)));
    expect(cats.size).toBeGreaterThanOrEqual(3);
  });

  it("petit catalogue : mains plus petites plutôt que des doublons dans une main", () => {
    const catalog = fakeCatalog(4);
    const sim = new Sim({ players: 2, catalog, settings: { handSize: 6, rerolls: 1 } });
    sim.start();
    const hands = sim.view("p1").create!.hands;
    expect(hands).toHaveLength(2);
    for (const hand of hands) {
      expect(hand).toHaveLength(4);
      expect(new Set(hand).size).toBe(4);
    }
  });

  it("mode theme : la situation imposée est la même pour tous et change à chaque manche", () => {
    const sim = new Sim({ players: 3, settings: { mode: "theme", rounds: 3, profs: ["M. Martin"] } });
    sim.start();
    const themes: string[] = [];
    for (let round = 1; round <= 3; round++) {
      sim.waitUntil((r) => r.phase === "create" && r.round === round, 900_000);
      const t = sim.ids.map((id) => sim.view(id).create!.theme);
      expect(new Set(t).size).toBe(1);
      expect(t[0]).toBeTruthy();
      expect(sim.view(null).create!.theme).toBe(t[0]);
      themes.push(t[0]!);
      sim.submitAll();
    }
    expect(themes.join("|")).not.toMatch(/\{(prof|eleve)\}/);
  });

  it("mode meme-image : le gabarit imposé change d'une manche à l'autre", () => {
    const sim = new Sim({ players: 3, settings: { mode: "meme-image", rounds: 4 } });
    sim.start();
    const forced: string[] = [];
    for (let round = 1; round <= 4; round++) {
      sim.waitUntil((r) => r.phase === "create" && r.round === round, 900_000);
      forced.push(sim.view(null).create!.forcedTemplateId!);
      sim.submitAll();
    }
    expect(new Set(forced).size).toBe(4);
  });
});
