/**
 * Test « fuzz » : 200 parties où les joueurs font n'importe quoi dans n'importe
 * quel ordre (graine fixe, donc rejouable). On vérifie des invariants après
 * CHAQUE opération, puis que la partie atteint toujours le podium.
 */
import { describe, expect, it } from "vitest";
import { addImage, applyAction, buildView, createRoom, engineDebug, enter, removeImage, tick } from "./engine";
import { mulberry32 } from "./rng";
import type { RoomState } from "./state";
import { expectedScores, fakeCatalog } from "./testkit";
import { LIMITS, type Action, type GameMode, type Meme, type Phase, type RoomView, type VoteScore } from "./types";

const PHASES: Phase[] = ["lobby", "create", "vote", "reveal", "results", "final"];
const MODES: GameMode[] = ["classique", "meme-image", "theme"];
const GAMES = 200;

interface World {
  room: RoomState;
  now: number;
  rand: () => number;
  catalog: ReturnType<typeof fakeCatalog>;
  /** tous les jetons jamais émis (pour chercher des fuites) */
  tokens: Map<string, string>;
  online: Set<string>;
  joined: number;
  images: number;
  lastViews: Map<string, { version: number; json: string }>;
  ops: number;
  errors: Map<string, number>;
}

function int(w: World, n: number): number {
  return Math.floor(w.rand() * n);
}

function pick<T>(w: World, items: readonly T[]): T | undefined {
  return items.length ? items[int(w, items.length)] : undefined;
}

function activeIds(w: World): string[] {
  return w.room.players.filter((p) => !p.left && !p.bot).map((p) => p.id);
}

function stripNow(view: RoomView): string {
  return JSON.stringify({ ...view, now: 0 });
}

/** assertion légère (des millions d'appels : `expect` serait trop lent ici) */
function ensure(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(`invariant violé : ${message}`);
}

/** invariants vérifiés après chaque opération */
function check(w: World): void {
  const room = w.room;
  ensure(PHASES.includes(room.phase), `phase inconnue ${room.phase}`);
  ensure(room.round >= 0 && room.round <= room.settings.rounds, `manche ${room.round} hors bornes`);
  if (room.phase === "lobby" || room.phase === "final") {
    ensure(room.phaseEndsAt === null, "minuteur en lobby/final");
  } else {
    ensure(room.phaseEndsAt !== null, "phase minutée sans échéance");
    ensure(room.phaseEndsAt > room.phaseStartedAt, "échéance avant le début");
    ensure(room.phaseStartedAt <= w.now, "phase datée dans le futur");
    ensure(room.current !== null, "phase de jeu sans manche");
    ensure(room.round >= 1, "phase de jeu en manche 0");
  }
  if (room.phase === "lobby") ensure(room.round === 0, "lobby avec une manche");
  const present = room.players.filter((p) => !p.left);
  if (present.some((p) => !p.bot)) ensure(room.players.some((p) => p.id === room.hostId), "hôte inexistant");
  ensure(!room.players.find((p) => p.id === room.hostId)?.bot, "un robot est hôte");
  for (const p of room.players) if (p.bot) ensure(p.connected && !p.left, "robot déconnecté");
  ensure(new Set(room.players.map((p) => p.id)).size === room.players.length, "ids en double");
  ensure(new Set(room.players.map((p) => p.token)).size === room.players.length, "jetons en double");
  ensure(new Set(room.players.map((p) => p.name.toLowerCase())).size === room.players.length, "noms en double");
  ensure(present.length <= LIMITS.maxPlayers, "trop de joueurs");
  for (const p of room.players) {
    ensure(p.jokersLeft >= 0 && p.jokersLeft <= room.settings.jokers, `jokers de ${p.id} = ${p.jokersLeft}`);
    ensure(p.name.length > 0 && p.name.length <= LIMITS.nameMaxLength, "nom hors bornes");
    if (p.left) ensure(!p.connected, "joueur parti mais connecté");
  }
  // mèmes et votes
  ensure(new Set(room.memes.map((m) => m.id)).size === room.memes.length, "ids de mèmes en double");
  for (const m of room.memes) {
    ensure(m.votes[m.authorId] === undefined, "vote pour son propre mème");
    for (const v of Object.values(m.votes)) ensure(v === 0 || v === 1 || v === 2 || v === 3, "note invalide");
    ensure(m.meme.stickers.length <= 6, "trop de stickers");
    if (m.removed) ensure(m.closed, "mème retiré non clos");
  }
  if (room.current) {
    for (const rp of Object.values(room.current.participants)) {
      for (const hand of rp.hands) ensure(new Set(hand).size === hand.length, "doublon dans une main");
      if (rp.submitted) ensure(rp.meme !== null, "validé sans mème");
    }
    if (room.phase === "vote" || room.phase === "reveal") {
      const id = room.current.queue[room.current.index];
      const m = room.memes.find((x) => x.id === id);
      ensure(m, "mème courant introuvable");
      ensure(!m.removed, "mème courant retiré");
      ensure(m.closed === (room.phase === "reveal"), "clôture du mème incohérente avec la phase");
    }
  }

  // vues : spectateur + tous les joueurs présents (le jeton d'un joueur parti ne donne plus de vue)
  for (const p of room.players) if (p.left) w.lastViews.delete(p.id);
  const expected = expectedScores(room);
  const secrets = [room.seed, ...w.tokens.values()];
  for (const viewer of [null, ...present.map((p) => p.id)]) {
    const view = buildView(room, viewer, w.now);
    const json = stripNow(view);
    // scores = somme des votes des mèmes clos
    for (const p of view.players) ensure(p.score === expected[p.id], `score de ${p.id} : ${p.score} au lieu de ${expected[p.id]}`);
    // aucune fuite de secret
    for (const secret of secrets) ensure(!json.includes(secret), "fuite de secret dans une vue");
    // présence des blocs selon la phase
    ensure((view.create !== undefined) === (room.phase === "create"), "bloc create");
    ensure((view.vote !== undefined) === (room.phase === "vote" || room.phase === "reveal"), "bloc vote");
    ensure((view.results !== undefined) === (room.phase === "results"), "bloc results");
    ensure((view.final !== undefined) === (room.phase === "final"), "bloc final");
    ensure((view.me !== null) === (viewer !== null), "bloc me");
    if (view.vote) {
      ensure(view.vote.votedCount <= view.vote.votersCount, "plus de votes que de votants");
      ensure(view.vote.index < view.vote.count, "index de vote hors file");
      const author = room.memes.find((m) => m.id === view.vote!.memeId)!.authorId;
      ensure(view.vote.isMine === (viewer === author), "isMine incohérent");
      if (room.phase === "vote") {
        ensure(view.vote.result === null, "résultat visible pendant le vote");
        ensure(!JSON.stringify(view.vote).includes("authorId"), "auteur visible pendant le vote");
        if (viewer !== author) ensure(!JSON.stringify(view.vote).includes(`"${author}"`), "id de l'auteur visible pendant le vote");
      } else {
        ensure(view.vote.result !== null && view.vote.result.authorId === author, "révélation sans résultat");
      }
    }
    if (view.create) {
      ensure(view.create.submittedCount <= view.create.totalPlayers, "plus de validés que de participants");
      if (viewer === null) ensure(view.create.hands.length === 0 && view.create.myMeme === null, "main visible par un spectateur");
    }
    if (view.results) {
      const pts = view.results.entries.map((e) => e.points);
      ensure(pts.every((v, i) => i === 0 || pts[i - 1] >= v), "classement de manche non trié");
    }
    if (view.final) {
      ensure(view.final.ranking.length === view.players.length, "classement incomplet");
      ensure(view.final.awards.length <= 6, "trop de récompenses");
      for (const a of view.final.awards) ensure(view.players.some((p) => p.id === a.playerId), "récompense à un absent");
      ensure(view.final.gallery.every((m) => view.players.some((p) => p.id === m.authorId)), "mème d'un expulsé dans la galerie");
    }
    // version : jamais décroissante, et toute vue qui change fait changer la version
    const key = viewer ?? "(tv)";
    const previous = w.lastViews.get(key);
    if (previous) {
      ensure(view.version >= previous.version, `version de ${key} en baisse`);
      if (json !== previous.json) ensure(view.version > previous.version, `vue de ${key} changée sans changement de version`);
    }
    w.lastViews.set(key, { version: view.version, json });
  }
  for (const key of [...w.lastViews.keys()]) {
    if (key !== "(tv)" && !room.players.some((p) => p.id === key)) w.lastViews.delete(key);
  }
}

function act(w: World, playerId: string | null, action: Action, creds?: { playerId: string; token: string }): boolean {
  w.ops += 1;
  w.room = enter(w.room, playerId, w.now, w.catalog);
  const out = applyAction(w.room, playerId, action, w.now, w.catalog, creds);
  if (out.ok) {
    w.room = out.room;
    // rejouer exactement la même action ne doit plus rien changer (idempotence), sauf "skip" et "join" anonyme
    if (action.type !== "skip" && action.type !== "addBots" && !(action.type === "join" && creds)) {
      const again = applyAction(w.room, playerId, action, w.now, w.catalog, creds);
      if (again.ok) expect(again.room, `action ${action.type} non idempotente`).toBe(w.room);
    }
  } else {
    w.errors.set(out.error, (w.errors.get(out.error) ?? 0) + 1);
  }
  check(w);
  return out.ok;
}

function pollAll(w: World): void {
  for (const id of w.online) w.room = enter(w.room, id, w.now, w.catalog);
  w.room = tick(w.room, w.now, w.catalog);
  check(w);
}

function join(w: World, name?: string): void {
  w.joined += 1;
  const id = `j${w.joined}`;
  const token = `jeton-${id}-${"q".repeat(30)}`;
  w.tokens.set(id, token);
  const ok = act(w, null, { type: "join", name: name ?? pick(w, ["Léa", "Tom", "Inès", "Noé", "Zoé", `Élève ${w.joined}`])!, avatar: "cat" }, { playerId: id, token });
  if (ok) w.online.add(id);
}

function randomMeme(w: World, playerId: string): { meme: Meme; usedJoker: boolean } {
  const view = buildView(w.room, playerId, w.now);
  const hand = view.create?.forcedTemplateId ? [view.create.forcedTemplateId] : (view.create?.hands.flat() ?? []);
  const roll = w.rand();
  let templateId: string;
  let usedJoker = false;
  if (roll < 0.7 && hand.length) templateId = pick(w, hand)!;
  else if (roll < 0.85) {
    templateId = pick(w, w.catalog)!.id;
    usedJoker = w.rand() < 0.7;
  } else if (roll < 0.92 && w.room.images.length) {
    templateId = `perso:${pick(w, w.room.images)!.id}`;
    usedJoker = w.rand() < 0.5;
  } else templateId = pick(w, ["inconnu", "perso:deadbeefdeadbeef", ""])!;
  const text = pick(w, ["", "  ", "quand le prof dit « contrôle surprise »", "x".repeat(300), "ligne 1\nligne 2\u0000\u0007"])!;
  const stickers = w.rand() < 0.3 ? Array.from({ length: int(w, 9) }, () => ({ e: pick(w, ["skull", "fire", "BAD ID"])!, x: w.rand() * 3 - 1, y: w.rand(), s: w.rand(), r: w.rand() * 720 - 360 })) : [];
  return { meme: { templateId, values: { haut: text, bas: w.rand() < 0.5 ? "bas" : "", intrus: "x" }, stickers }, usedJoker };
}

function randomOp(w: World): void {
  const room = w.room;
  const ids = activeIds(w);
  const someone = pick(w, ids) ?? null;
  const host = room.hostId || null;
  const roll = w.rand();

  if (roll < 0.22) {
    // le temps passe (parfois beaucoup), tout le monde en ligne interroge
    const big = w.rand() < 0.08;
    const seconds = big ? 10 + int(w, 50) : 1 + int(w, 3);
    for (let i = 0; i < seconds; i++) {
      w.now += 1_000;
      if (!big || i === seconds - 1) pollAll(w);
    }
  } else if (roll < 0.47) {
    if (!someone) return;
    const { meme, usedJoker } = randomMeme(w, someone);
    act(w, someone, { type: w.rand() < 0.6 ? "submit" : "draft", meme, usedJoker });
  } else if (roll < 0.5) {
    act(w, someone, { type: "unsubmit" });
  } else if (roll < 0.75) {
    const current = room.current?.queue[room.current.index];
    const memeId = w.rand() < 0.9 && current ? current : pick(w, [...room.memes.map((m) => m.id), "m0-0-0"])!;
    act(w, someone, { type: "vote", memeId, score: int(w, 4) as VoteScore });
  } else if (roll < 0.78) {
    if (ids.length < 9) join(w);
  } else if (roll < 0.8) {
    // un joueur éteint ou rallume son téléphone
    if (!someone) return;
    if (w.online.has(someone)) w.online.delete(someone);
    else w.online.add(someone);
  } else if (roll < 0.815) {
    if (someone && act(w, someone, { type: "leave" })) w.online.delete(someone);
  } else if (roll < 0.83) {
    // retour d'un joueur parti en cours de partie
    const gone = pick(w, room.players.filter((p) => p.left));
    if (gone && act(w, gone.id, { type: "join", name: gone.name, avatar: "dog" })) w.online.add(gone.id);
  } else if (roll < 0.845) {
    const target = pick(w, w.room.players.map((p) => p.id));
    if (target && act(w, w.rand() < 0.8 ? host : someone, { type: "kick", playerId: target })) w.online.delete(target);
  } else if (roll < 0.88) {
    act(w, w.rand() < 0.85 ? host : someone, { type: "skip" });
  } else if (roll < 0.9) {
    const memeId = pick(w, [...room.memes.map((m) => m.id), "nimp"]);
    if (memeId) act(w, w.rand() < 0.85 ? host : someone, { type: "removeMeme", memeId });
  } else if (roll < 0.93) {
    act(w, w.rand() < 0.85 ? host : someone, { type: "start" });
  } else if (roll < 0.95) {
    act(w, host, {
      type: "settings",
      patch: {
        mode: pick(w, MODES),
        rounds: 1 + int(w, 3),
        createSeconds: 30 + int(w, 20),
        voteSeconds: 6 + int(w, 6),
        handSize: 3 + int(w, 4),
        rerolls: int(w, 3),
        jokers: int(w, 3),
        stickers: w.rand() < 0.7,
        categories: pick(w, [[], ["ecole", "cases"], ["perso"], ["affiches", "perso"]]),
        uploads: pick(w, ["all", "all", "host", "off"] as const),
      },
    });
  } else if (roll < 0.975) {
    // pack perso
    w.ops += 1;
    if (w.rand() < 0.7 || room.images.length === 0) {
      w.images += 1;
      const out = addImage(enter(room, someone, w.now, w.catalog), someone, { id: w.images.toString(16).padStart(24, "0"), w: 800, h: 600 }, w.now, w.catalog);
      if (out.ok) w.room = out.room;
    } else {
      const out = removeImage(enter(room, someone, w.now, w.catalog), w.rand() < 0.5 ? host : someone, pick(w, room.images)!.id, w.now, w.catalog);
      if (out.ok) w.room = out.room;
    }
    check(w);
  } else if (roll < 0.982) {
    act(w, w.rand() < 0.85 ? host : someone, { type: "again" });
  } else if (roll < 0.992) {
    // robots (lobby surtout ; ailleurs : refus attendu)
    if (w.rand() < 0.75) act(w, w.rand() < 0.9 ? host : someone, { type: "addBots", count: 1 + int(w, 4) });
    else act(w, host, { type: "removeBots" });
  } else {
    // n'importe quoi : joueur inconnu, action sans droit
    act(w, pick(w, ["fantome", null]) ?? null, pick(w, [{ type: "start" }, { type: "skip" }, { type: "leave" }, { type: "again" }] as Action[])!);
  }
}

/** fin de partie « sage » : tout le monde revient et on laisse les minuteurs finir */
function driveToFinal(w: World): void {
  let guard = 0;
  while (w.room.phase !== "final") {
    expect(guard++, "la partie n'atteint jamais le podium").toBeLessThan(4000);
    while (activeIds(w).length < 2) join(w, `Renfort ${w.joined}`);
    for (const id of activeIds(w)) w.online.add(id);
    w.now += 1_000;
    pollAll(w);
    if (w.room.phase === "lobby") {
      // l'hôte a pu changer : on relance avec l'hôte courant
      act(w, w.room.hostId, { type: "start" });
    }
  }
}

function playGame(seed: number): World {
  engineDebug.strict = true;
  const rand = mulberry32(seed * 7919 + 13);
  const created = createRoom({ code: "FUZZ", seed: `graine-secrete-${seed}`, now: 1_800_000_000_000, host: { id: "j0", token: `jeton-j0-${"q".repeat(30)}`, name: "Hôte", avatar: "fox" } });
  if (!created.ok) throw new Error("createRoom");
  const w: World = {
    room: created.room,
    now: 1_800_000_000_000,
    rand,
    catalog: fakeCatalog(12 + Math.floor(rand() * 19)),
    tokens: new Map([["j0", `jeton-j0-${"q".repeat(30)}`]]),
    online: new Set(["j0"]),
    joined: 0,
    images: 0,
    lastViews: new Map(),
    ops: 0,
    errors: new Map(),
  };
  check(w);
  const others = 1 + int(w, 6);
  for (let i = 0; i < others; i++) join(w);
  act(w, w.room.hostId, {
    type: "settings",
    patch: { mode: MODES[seed % 3], rounds: 1 + int(w, 3), createSeconds: 30 + int(w, 15), voteSeconds: 6 + int(w, 5), handSize: 3 + int(w, 4), rerolls: int(w, 3), jokers: int(w, 3) },
  });
  if (w.rand() < 0.45) act(w, w.room.hostId, { type: "addBots", count: 1 + int(w, 5) });
  if (w.rand() < 0.8) act(w, w.room.hostId, { type: "start" });
  const steps = 120 + int(w, 120);
  for (let i = 0; i < steps; i++) randomOp(w);
  driveToFinal(w);
  return w;
}

describe("fuzz : 200 parties en désordre", () => {
  it("jamais d'exception, invariants tenus à chaque opération, et on atteint toujours le podium", () => {
    let ops = 0;
    const errors = new Map<string, number>();
    const reachedPhases = new Set<string>();
    for (let seed = 1; seed <= GAMES; seed++) {
      let w: World;
      try {
        w = playGame(seed);
      } catch (error) {
        throw new Error(`partie fuzz n°${seed} : ${error instanceof Error ? error.message : String(error)}`, { cause: error });
      }
      expect(w.room.phase).toBe("final");
      const view = buildView(w.room, null, w.now);
      // podium cohérent : scores = somme des votes, classement décroissant
      const expected = expectedScores(w.room);
      for (const p of view.players) expect(p.score).toBe(expected[p.id]);
      const ranked = view.final!.ranking.map((id) => expected[id]);
      expect(ranked).toEqual([...ranked].sort((a, b) => b - a));
      expect(view.final!.gallery.reduce((a, m) => a + m.points, 0)).toBe(Object.values(expected).reduce((a, b) => a + b, 0));
      ops += w.ops;
      for (const [k, v] of w.errors) errors.set(k, (errors.get(k) ?? 0) + v);
      if (view.final!.gallery.length > 0) reachedPhases.add("avec mèmes");
      if (view.final!.awards.length > 0) reachedPhases.add("avec récompenses");
    }
    // le test a bien exercé des chemins variés (succès comme refus)
    expect(ops).toBeGreaterThan(GAMES * 100);
    for (const code of ["bad_phase", "invalid", "not_host", "bad_token"]) expect(errors.get(code) ?? 0, code).toBeGreaterThan(20);
    expect(reachedPhases).toEqual(new Set(["avec mèmes", "avec récompenses"]));
  }, 120_000);
});
