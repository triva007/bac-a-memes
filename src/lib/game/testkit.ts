/**
 * Outils de test du moteur (aucun test ici) : faux catalogue, horloge factice
 * et petit simulateur de partie qui enchaîne les appels comme le fait la route
 * (tick + présence -> action).
 */
import { applyAction, buildView, createRoom, engineDebug, enter, tick } from "./engine";
import { mulberry32 } from "./rng";
import type { ActionOutcome, RoomState } from "./state";
import type { Action, Meme, RoomView, Settings, TemplateMeta, VoteScore } from "./types";

export const FAKE_CATEGORIES = ["reactions", "ecole", "ecrans", "cases", "affiches"];

/** `n` gabarits répartis sur 5 catégories ; champs "haut"/"bas" (60 car.), un sur trois n'a qu'un champ. */
export function fakeCatalog(n = 30): TemplateMeta[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `tpl-${FAKE_CATEGORIES[i % 5]}-${Math.floor(i / 5) + 1}`,
    category: FAKE_CATEGORIES[i % 5],
    fields: i % 3 === 0 ? [{ id: "haut", maxLength: 60 }] : [
      { id: "haut", maxLength: 60 },
      { id: "bas", maxLength: 40 },
    ],
  }));
}

export function categoryOf(catalog: TemplateMeta[], id: string): string {
  if (id.startsWith("perso:")) return "perso";
  return catalog.find((t) => t.id === id)?.category ?? "?";
}

export function memeFor(templateId: string, text = "coucou"): Meme {
  return { templateId, values: { haut: text }, stickers: [] };
}

export const T0 = 1_800_000_000_000;

export interface SimOptions {
  players: number;
  settings?: Partial<Settings>;
  seed?: string;
  catalog?: TemplateMeta[];
}

export class Sim {
  room: RoomState;
  now = T0;
  catalog: TemplateMeta[];
  /** ids des joueurs dans l'ordre d'arrivée (ids[0] = hôte) */
  ids: string[] = [];
  tokens = new Map<string, string>();
  /** joueurs qui « ont leur téléphone allumé » : ils interrogent le serveur à chaque `poll` */
  online = new Set<string>();

  constructor(options: SimOptions) {
    engineDebug.strict = true;
    this.catalog = options.catalog ?? fakeCatalog();
    const created = createRoom({
      code: "TEST",
      seed: options.seed ?? "graine-de-test",
      now: this.now,
      host: { id: "p1", token: "tok-p1-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", name: "Joueur 1", avatar: "fox" },
    });
    if (!created.ok) throw new Error("createRoom a échoué");
    this.room = created.room;
    this.ids.push("p1");
    this.tokens.set("p1", "tok-p1-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    this.online.add("p1");
    for (let i = 2; i <= options.players; i++) this.join(`Joueur ${i}`);
    if (options.settings) this.must(this.host, { type: "settings", patch: options.settings });
  }

  get host(): string {
    return this.room.hostId;
  }

  get phase(): RoomState["phase"] {
    return this.room.phase;
  }

  join(name: string, avatar = "cat"): string {
    const n = this.ids.length + 1;
    const id = `p${n}`;
    const token = `tok-${id}-${"b".repeat(32)}`;
    const out = applyAction(this.room, null, { type: "join", name, avatar }, this.now, this.catalog, { playerId: id, token });
    if (!out.ok) throw new Error(`join refusé : ${out.error}`);
    this.room = out.room;
    this.ids.push(id);
    this.tokens.set(id, token);
    this.online.add(id);
    return id;
  }

  /** applique une action comme le ferait la route ; met à jour la salle si elle est acceptée */
  act(playerId: string | null, action: Action): ActionOutcome {
    const current = enter(this.room, playerId, this.now, this.catalog);
    this.room = current;
    const out = applyAction(current, playerId, action, this.now, this.catalog);
    if (out.ok) this.room = out.room;
    return out;
  }

  /** comme `act`, mais l'action doit réussir */
  must(playerId: string | null, action: Action): RoomState {
    const out = this.act(playerId, action);
    if (!out.ok) throw new Error(`action ${action.type} refusée : ${out.error} (${out.message})`);
    return out.room;
  }

  /** tous les joueurs en ligne interrogent le serveur (présence + tick) */
  poll(): void {
    for (const id of this.online) {
      this.room = enter(this.room, id, this.now, this.catalog);
    }
    this.room = tick(this.room, this.now, this.catalog);
  }

  /** le temps passe SANS que personne n'interroge le serveur */
  sleep(ms: number): void {
    this.now += ms;
  }

  /** le temps passe, par pas d'une seconde, avec tout le monde qui interroge */
  wait(ms: number): void {
    let left = ms;
    while (left > 0) {
      const step = Math.min(1000, left);
      this.now += step;
      left -= step;
      this.poll();
    }
  }

  /** attend (en interrogeant chaque seconde) jusqu'à ce que la condition soit vraie */
  waitUntil(cond: (room: RoomState) => boolean, maxMs = 600_000): void {
    let waited = 0;
    while (!cond(this.room)) {
      if (waited >= maxMs) throw new Error(`waitUntil : toujours en phase ${this.room.phase} après ${maxMs} ms`);
      this.wait(1000);
      waited += 1000;
    }
  }

  view(playerId: string | null): RoomView {
    return buildView(this.room, playerId, this.now);
  }

  start(): void {
    this.must(this.host, { type: "start" });
  }

  /** premier gabarit de la main d'un joueur */
  firstTemplate(playerId: string): string {
    const v = this.view(playerId);
    const id = v.create?.forcedTemplateId ?? v.create?.hands[0]?.[0];
    if (!id) throw new Error(`pas de main pour ${playerId}`);
    return id;
  }

  /** tous les participants en ligne valident un mème */
  submitAll(text: (playerId: string) => string = (id) => `mème de ${id}`): void {
    for (const id of this.ids) {
      if (this.phase !== "create") break;
      if (!this.online.has(id) || !this.room.current?.participants[id]) continue;
      this.must(id, { type: "submit", meme: memeFor(this.firstTemplate(id), text(id)) });
    }
  }

  /** tous les joueurs en ligne notent le mème courant */
  voteAll(score: (voterId: string, memeId: string) => VoteScore): void {
    const memeId = this.view(null).vote?.memeId;
    if (!memeId) throw new Error("pas de mème en cours");
    for (const id of this.ids) {
      if (this.phase !== "vote" || this.view(null).vote?.memeId !== memeId) break;
      if (!this.online.has(id)) continue;
      const v = this.view(id);
      if (!v.me || v.vote?.isMine) continue;
      this.must(id, { type: "vote", memeId, score: score(id, memeId) });
    }
  }

  /** joue une partie entière : tout le monde valide, tout le monde vote, les minuteurs font le reste */
  playToFinal(score: (voterId: string, memeId: string) => VoteScore = defaultScore): void {
    if (this.phase === "lobby") this.start();
    let guard = 0;
    while (this.phase !== "final") {
      if (guard++ > 5000) throw new Error("la partie ne se termine pas");
      if (this.phase === "create") this.submitAll();
      else if (this.phase === "vote") this.voteAll(score);
      else this.wait(1000);
    }
  }
}

export function defaultScore(voterId: string, memeId: string): VoteScore {
  const r = mulberry32(hash(`${voterId}/${memeId}`))();
  return Math.floor(r * 4) as VoteScore;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** somme des votes reçus par joueur, recalculée « à la main » depuis l'état interne */
export function expectedScores(room: RoomState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of room.players) out[p.id] = 0;
  for (const m of room.memes) {
    if (!m.closed || m.removed || !(m.authorId in out)) continue;
    for (const v of Object.values(m.votes)) out[m.authorId] += v;
  }
  return out;
}
