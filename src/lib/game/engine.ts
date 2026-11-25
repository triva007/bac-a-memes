/**
 * MOTEUR DE JEU — pur et déterministe.
 * Aucune I/O, pas de Date.now(), pas de Math.random() : l'heure (`now`), le
 * catalogue de gabarits et les identifiants aléatoires sont injectés. Toutes
 * les fonctions renvoient un NOUVEL état (ou le même objet si rien n'a changé)
 * et ne modifient jamais l'état reçu.
 *
 *   createRoom  -> nouvelle salle (lobby) avec son hôte
 *   tick        -> fait avancer les phases selon l'heure et l'état (paresseux)
 *   applyAction -> applique une action d'un joueur (idempotente)
 *   addImage / removeImage -> pack perso
 *   touchPresence -> note qu'un joueur vient de se manifester (écriture rare)
 *   enter       -> début de requête : tick + présence + tick
 *   buildView   -> vue envoyée à un joueur (ou à un spectateur) : sans secret
 */
import { computeAwards, memePoints } from "./awards";
import { buildPool, dealHands, dealSituations, persoTemplateId, pickForcedTemplate, pickTheme } from "./deal";
import { deterministicHex, makeRng, shuffle } from "./rng";
import {
  applySettingsPatch,
  cleanAvatar,
  cleanName,
  memeHasContent,
  sameMeme,
  sanitizeMeme,
  uniqueName,
} from "./sanitize";
import type {
  ActionOutcome,
  ActionResult,
  EngineError,
  ErrorCode,
  JoinCredentials,
  MemeEntry,
  PlayerState,
  RoomState,
  RoundState,
} from "./state";
import {
  DEFAULT_SETTINGS,
  LIMITS,
  PERSO_CATEGORY,
  PERSO_FIELDS,
  PERSO_PREFIX,
  type Action,
  type CustomImage,
  type Meme,
  type MemeResult,
  type Phase,
  type PlayerView,
  type RoomView,
  type TemplateMeta,
  type VoteScore,
} from "./types";

export type { ActionOutcome, EngineError, ErrorCode, JoinCredentials, RoomState } from "./state";

/** l'hôte perd son rôle s'il n'a pas donné signe de vie depuis ce délai */
export const HOST_TIMEOUT_MS = 45_000;
/** la présence (lastSeen) n'est réécrite que si la valeur stockée est plus vieille que ça */
export const PRESENCE_WRITE_MS = 4_000;
/** retard maximal pour lequel une phase est datée depuis l'échéance de la précédente (au-delà : depuis maintenant) */
export const MAX_CATCHUP_MS = 3_000;
/** un "skip" est ignoré si la phase vient de commencer (anti double-envoi) */
export const SKIP_GUARD_MS = 1_500;
/** cartes situation par joueur et par manche */
export const SITUATIONS_PER_PLAYER = 3;

/** Couleurs d'accent des joueurs : surligneurs de la charte (`src/app/globals.css`). */
export const PLAYER_COLORS = [
  "#ffe94a", // fluo-yellow
  "#ff5fa2", // fluo-pink
  "#5df2a0", // fluo-green
  "#5cc8ff", // fluo-blue
  "#ff9a3d", // fluo-orange
  "#7b5cff", // violet
  "#f28b82", // margin
  "#b9d4f0", // rule
  "#e5383b", // red-pen
];

/** Réservé aux tests : vérifie qu'aucune mutation n'échappe au suivi des changements. */
export const engineDebug = { strict: false };

// ------------------------------------------------------------------ outils

interface Ctx {
  now: number;
  catalog: TemplateMeta[];
  /** l'état a changé (à sauvegarder) */
  dirty: boolean;
  /** changement visible par tous : la version publique doit augmenter */
  bumped: boolean;
}

function fail(error: ErrorCode, message: string): EngineError {
  return { ok: false, error, message };
}

type Step = { ok: true; result: ActionResult } | EngineError;
const DONE: Step = { ok: true, result: {} };

function bump(ctx: Ctx): void {
  ctx.bumped = true;
  ctx.dirty = true;
}

/** changement visible par ce joueur seulement (brouillon, joker, note modifiée) */
function bumpPrivate(ctx: Ctx, p: PlayerState): void {
  p.pv += 1;
  ctx.dirty = true;
}

function run<T>(room: RoomState, now: number, catalog: TemplateMeta[], fn: (d: RoomState, ctx: Ctx) => T): { room: RoomState; value: T } {
  const d = structuredClone(room);
  const ctx: Ctx = { now, catalog, dirty: false, bumped: false };
  const value = fn(d, ctx);
  if (!ctx.dirty) {
    if (engineDebug.strict && JSON.stringify(d) !== JSON.stringify(room)) {
      throw new Error("engine: mutation non suivie (dirty manquant)");
    }
    return { room, value };
  }
  if (ctx.bumped) d.version += 1;
  return { room: d, value };
}

const catalogIndex = new WeakMap<TemplateMeta[], Map<string, TemplateMeta>>();
function catalogById(catalog: TemplateMeta[]): Map<string, TemplateMeta> {
  let map = catalogIndex.get(catalog);
  if (!map) {
    map = new Map(catalog.map((t) => [t.id, t]));
    catalogIndex.set(catalog, map);
  }
  return map;
}

function persoMeta(templateId: string): TemplateMeta {
  return { id: templateId, category: PERSO_CATEGORY, fields: PERSO_FIELDS };
}

function rng(d: RoomState, ...parts: (string | number)[]): () => number {
  return makeRng(d.seed, d.game, ...parts);
}

function findPlayer(d: RoomState, id: string | null | undefined): PlayerState | undefined {
  return id ? d.players.find((p) => p.id === id) : undefined;
}

function currentMeme(d: RoomState): MemeEntry | undefined {
  const cur = d.current;
  if (!cur) return undefined;
  const id = cur.queue[cur.index];
  return id ? d.memes.find((m) => m.id === id) : undefined;
}

function setPhase(d: RoomState, ctx: Ctx, phase: Phase, at: number, durationMs: number | null): void {
  d.phase = phase;
  d.phaseStartedAt = at;
  d.phaseEndsAt = durationMs === null ? null : at + durationMs;
  bump(ctx);
}

// ------------------------------------------------------------------ création de salle

export interface CreateRoomParams {
  code: string;
  /** graine des tirages (aléatoire fort fourni par la route) */
  seed: string;
  now: number;
  host: { id: string; token: string; name: string; avatar: string };
}

export function createRoom(params: CreateRoomParams): ActionOutcome {
  const name = cleanName(params.host.name, LIMITS.nameMaxLength);
  if (!name) return fail("invalid", "Choisis un prénom pour entrer.");
  const host: PlayerState = {
    id: params.host.id,
    token: params.host.token,
    name,
    avatar: cleanAvatar(params.host.avatar),
    color: PLAYER_COLORS[0],
    seq: 1,
    joinedAt: params.now,
    lastSeen: params.now,
    connected: true,
    left: false,
    jokersLeft: DEFAULT_SETTINGS.jokers,
    pv: 0,
    seen: {},
  };
  const room: RoomState = {
    code: params.code,
    seed: params.seed,
    game: 1,
    createdAt: params.now,
    version: 1,
    phase: "lobby",
    phaseStartedAt: params.now,
    phaseEndsAt: null,
    round: 0,
    settings: { ...DEFAULT_SETTINGS, categories: [], profs: [], extraNames: [] },
    hostId: host.id,
    ownerId: host.id,
    players: [host],
    kicked: [],
    nextSeq: 2,
    current: null,
    memes: [],
    awards: [],
    images: [],
    usedThemes: [],
    usedForced: [],
  };
  return { ok: true, room, result: { playerId: host.id, token: host.token } };
}

// ------------------------------------------------------------------ authentification

export type AuthResult =
  | { kind: "player"; playerId: string }
  /** a quitté en cours de partie : doit refaire "join" (avec le même token) pour revenir */
  | { kind: "left"; playerId: string }
  | { kind: "kicked" }
  | { kind: "unknown" };

export function authenticate(room: RoomState, token: string | null | undefined): AuthResult {
  if (!token) return { kind: "unknown" };
  if (room.kicked.includes(token)) return { kind: "kicked" };
  const p = room.players.find((x) => x.token === token);
  if (!p) return { kind: "unknown" };
  return p.left ? { kind: "left", playerId: p.id } : { kind: "player", playerId: p.id };
}

// ------------------------------------------------------------------ présence

/**
 * Note qu'un joueur vient de faire une requête. Pour limiter les écritures, ne
 * change l'état que si le `lastSeen` stocké date de plus de PRESENCE_WRITE_MS
 * ou si le joueur était marqué déconnecté. Ne touche jamais à `version`
 * (c'est `tick` qui bascule `connected` et incrémente alors la version).
 */
export function touchPresence(room: RoomState, playerId: string | null, now: number): RoomState {
  const p = findPlayer(room, playerId);
  if (!p || p.left) return room;
  if (now <= p.lastSeen) return room;
  if (p.connected && now - p.lastSeen < PRESENCE_WRITE_MS) return room;
  return { ...room, players: room.players.map((q) => (q === p ? { ...q, lastSeen: now } : q)) };
}

function isConnectedAt(p: PlayerState, now: number): boolean {
  return !p.left && now - p.lastSeen < LIMITS.disconnectAfterMs;
}

function presenceStale(d: RoomState, now: number): boolean {
  return d.players.some((p) => p.connected !== isConnectedAt(p, now));
}

/**
 * Hôte à désigner, ou undefined s'il n'y a rien à changer. Si l'hôte est parti
 * ou muet depuis trop longtemps, le rôle passe au plus ancien joueur connecté.
 * (Suppose les statuts `connected` à jour.)
 */
function nextHost(d: RoomState, now: number): string | undefined {
  const host = findPlayer(d, d.hostId);
  // le créateur de la salle reprend la main dès qu'il est de retour
  if (d.ownerId && d.ownerId !== d.hostId) {
    const owner = findPlayer(d, d.ownerId);
    if (owner && !owner.left && owner.connected) return owner.id;
  }
  if (host && !host.left && now - host.lastSeen <= HOST_TIMEOUT_MS) return undefined;
  let next = d.players.find((p) => !p.left && p.connected && p.id !== d.hostId);
  if (!next && (!host || host.left)) next = d.players.find((p) => !p.left && p.id !== d.hostId);
  if (next) return next.id;
  if (!host && d.hostId !== "") return "";
  return undefined;
}

function refreshPresence(d: RoomState, ctx: Ctx): void {
  for (const p of d.players) {
    const connected = isConnectedAt(p, ctx.now);
    if (connected !== p.connected) {
      p.connected = connected;
      bump(ctx);
    }
  }
  const host = nextHost(d, ctx.now);
  if (host !== undefined) {
    d.hostId = host;
    bump(ctx);
  }
}

// ------------------------------------------------------------------ déroulement

function startRound(d: RoomState, ctx: Ctx, round: number, at: number): void {
  const s = d.settings;
  d.round = round;
  const active = d.players.filter((p) => !p.left);
  const sitCtx = { profs: s.profs, eleves: [...active.map((p) => p.name), ...s.extraNames] };
  const persoIds = d.images.map((i) => persoTemplateId(i.id));
  const pool = buildPool(ctx.catalog, persoIds, s.categories, s.handSize);
  const cur: RoundState = { participants: {}, theme: null, forcedTemplateId: null, queue: [], index: 0 };

  let themeId: string | null = null;
  if (s.mode === "theme") {
    const theme = pickTheme(d.usedThemes, sitCtx, rng(d, round, "theme"));
    if (theme) {
      cur.theme = theme.text;
      themeId = theme.id;
      d.usedThemes.push(theme.id);
    }
  }
  if (s.mode === "meme-image") {
    const forced = pickForcedTemplate(pool, d.usedForced, rng(d, round, "forced"));
    if (forced) {
      cur.forcedTemplateId = forced;
      d.usedForced.push(forced);
    }
  }

  const dealNo = d.game * 100 + round;
  for (const p of active) {
    let hands: string[][];
    if (cur.forcedTemplateId) {
      hands = [[cur.forcedTemplateId]];
    } else {
      hands = dealHands({ pool, handSize: s.handSize, hands: 1 + s.rerolls, seen: p.seen, rand: rng(d, round, p.id, "hands") });
      for (const hand of hands) for (const id of hand) p.seen[id] = dealNo;
    }
    const situations = dealSituations(
      round,
      SITUATIONS_PER_PLAYER,
      themeId,
      sitCtx,
      rng(d, p.id, "situations"),
      rng(d, round, p.id, "names"),
    );
    cur.participants[p.id] = { hands, situations, meme: null, submitted: false, usedJoker: false };
  }
  d.current = cur;
  setPhase(d, ctx, "create", at, s.createSeconds * 1000);
}

/** Fin de la création : construit la file de vote (validés + brouillons non vides), mélangée. */
function enterVote(d: RoomState, ctx: Ctx, at: number): void {
  const cur = d.current;
  if (!cur) return;
  const entries: { p: PlayerState; meme: Meme }[] = [];
  for (const p of d.players) {
    const rp = cur.participants[p.id];
    if (!rp) continue;
    if (rp.meme && memeHasContent(rp.meme)) {
      entries.push({ p, meme: rp.meme });
    } else if (rp.usedJoker) {
      // mème vide exclu : le joker n'a servi à rien, on le rend
      rp.usedJoker = false;
      p.jokersLeft += 1;
      bumpPrivate(ctx, p);
    }
  }
  const order = shuffle(entries, rng(d, d.round, "queue"));
  cur.queue = [];
  cur.index = 0;
  order.forEach((e, i) => {
    // id opaque : la position dans la file mélangée ne dit rien de l'auteur
    const id = `m${d.game}-${d.round}-${i + 1}`;
    d.memes.push({
      id,
      authorId: e.p.id,
      authorName: e.p.name,
      authorAvatar: e.p.avatar,
      meme: e.meme,
      round: d.round,
      votes: {},
      closed: false,
      removed: false,
    });
    cur.queue.push(id);
  });
  if (cur.queue.length === 0) enterResults(d, ctx, at);
  else setPhase(d, ctx, "vote", at, d.settings.voteSeconds * 1000);
}

function enterReveal(d: RoomState, ctx: Ctx, at: number): void {
  const m = currentMeme(d);
  if (m) m.closed = true;
  setPhase(d, ctx, "reveal", at, LIMITS.revealSeconds * 1000);
}

/** Mème suivant (en sautant les mèmes retirés) ou classement de la manche. */
function advance(d: RoomState, ctx: Ctx, at: number): void {
  const cur = d.current;
  if (!cur) return;
  cur.index += 1;
  while (cur.index < cur.queue.length) {
    const m = currentMeme(d);
    if (m && !m.removed) break;
    cur.index += 1;
  }
  if (cur.index >= cur.queue.length) enterResults(d, ctx, at);
  else setPhase(d, ctx, "vote", at, d.settings.voteSeconds * 1000);
}

function enterResults(d: RoomState, ctx: Ctx, at: number): void {
  setPhase(d, ctx, "results", at, LIMITS.resultsSeconds * 1000);
}

function afterResults(d: RoomState, ctx: Ctx, at: number): void {
  if (d.round >= d.settings.rounds) {
    d.awards = computeAwards(d);
    setPhase(d, ctx, "final", at, null);
  } else {
    startRound(d, ctx, d.round + 1, at);
  }
}

/**
 * Date de début de la phase suivante quand la précédente s'est terminée à
 * l'échéance `deadline`. En fonctionnement normal (quelqu'un interroge le
 * serveur chaque seconde) c'est exactement l'échéance : les minuteurs ne
 * dérivent pas et deux instances calculent la même chose. Si personne n'était
 * connecté à l'échéance, ou si le retard dépasse MAX_CATCHUP_MS (personne n'a
 * interrogé le serveur), on repart de maintenant : on ne fait jamais défiler
 * des écrans que personne n'a vus, et chaque phase garde sa durée entière.
 */
function startAfter(d: RoomState, now: number, deadline: number): number {
  if (now - deadline > MAX_CATCHUP_MS) return now;
  let lastActivity = -Infinity;
  for (const p of d.players) if (!p.left && p.lastSeen > lastActivity) lastActivity = p.lastSeen;
  if (lastActivity < deadline - LIMITS.disconnectAfterMs) return now;
  return deadline;
}

type Transition =
  | { kind: "toVote" | "toReveal" | "advance" | "afterResults"; at: number }
  /** personne n'a interrogé le serveur pendant tout le vote : on le rejoue */
  | { kind: "restartVote"; at: number };

/** Prochaine transition due à `now`, ou null. Lecture seule. */
function nextTransition(d: RoomState, now: number): Transition | null {
  const cur = d.current;
  const end = d.phaseEndsAt;
  switch (d.phase) {
    case "create": {
      if (!cur || end === null) return null;
      if (now >= end) return { kind: "toVote", at: startAfter(d, now, end) };
      // tous les participants connectés ont validé
      let waiting = 0;
      for (const p of d.players) {
        const rp = cur.participants[p.id];
        if (p.left || !p.connected || !rp) continue;
        if (!rp.submitted) return null;
        waiting += 1;
      }
      return waiting > 0 ? { kind: "toVote", at: now } : null;
    }
    case "vote": {
      if (!cur || end === null) return null;
      const m = currentMeme(d);
      if (!m || m.removed) return { kind: "advance", at: now };
      if (now >= end) {
        if (now - end > LIMITS.disconnectAfterMs && Object.keys(m.votes).length === 0) return { kind: "restartVote", at: now };
        return { kind: "toReveal", at: startAfter(d, now, end) };
      }
      // tous les votants connectés (hors auteur) ont voté
      let voters = 0;
      for (const p of d.players) {
        if (p.left || !p.connected || p.id === m.authorId) continue;
        if (m.votes[p.id] === undefined) return null;
        voters += 1;
      }
      return voters > 0 ? { kind: "toReveal", at: now } : null;
    }
    case "reveal":
      return end !== null && now >= end ? { kind: "advance", at: startAfter(d, now, end) } : null;
    case "results":
      return end !== null && now >= end ? { kind: "afterResults", at: startAfter(d, now, end) } : null;
    default:
      return null;
  }
}

function applyTransition(d: RoomState, ctx: Ctx, t: Transition): void {
  switch (t.kind) {
    case "toVote":
      enterVote(d, ctx, t.at);
      break;
    case "toReveal":
      enterReveal(d, ctx, t.at);
      break;
    case "advance":
      advance(d, ctx, t.at);
      break;
    case "afterResults":
      afterResults(d, ctx, t.at);
      break;
    case "restartVote":
      setPhase(d, ctx, "vote", t.at, d.settings.voteSeconds * 1000);
      break;
  }
}

function tickMut(d: RoomState, ctx: Ctx): void {
  refreshPresence(d, ctx);
  // boucle jusqu'à stabilité : plusieurs transitions peuvent être dues d'un coup
  for (let i = 0; i < 500; i++) {
    const t = nextTransition(d, ctx.now);
    if (!t) break;
    applyTransition(d, ctx, t);
  }
}

/**
 * Fait avancer la salle jusqu'à `now` : statuts connecté/déconnecté, transfert
 * d'hôte, échéances de phase et transitions anticipées (tout le monde a
 * validé / voté). Boucle jusqu'à stabilité. Renvoie le même objet si rien ne
 * change (cas ultra-majoritaire : aucune copie n'est alors faite).
 */
export function tick(room: RoomState, now: number, catalog: TemplateMeta[]): RoomState {
  if (!presenceStale(room, now) && nextHost(room, now) === undefined && !nextTransition(room, now)) return room;
  return run(room, now, catalog, (d, ctx) => tickMut(d, ctx)).room;
}

/**
 * Début de toute requête : met la salle à l'heure, PUIS note la présence du
 * demandeur, puis remet à l'heure. L'ordre compte : les échéances dépassées
 * sont jugées avec les présences d'AVANT cette requête (si tout le monde
 * avait disparu, la phase suivante repart de maintenant), et le retour du
 * joueur est ensuite pris en compte (statut connecté).
 */
export function enter(room: RoomState, playerId: string | null, now: number, catalog: TemplateMeta[]): RoomState {
  const ticked = tick(room, now, catalog);
  const touched = touchPresence(ticked, playerId, now);
  return touched === ticked ? ticked : tick(touched, now, catalog);
}

// ------------------------------------------------------------------ actions

function isHost(d: RoomState, p: PlayerState): boolean {
  return d.hostId === p.id;
}

function activeCount(d: RoomState): number {
  return d.players.filter((p) => !p.left).length;
}

function pickColor(d: RoomState): string {
  const counts = PLAYER_COLORS.map((c) => d.players.filter((p) => !p.left && p.color === c).length);
  const min = Math.min(...counts);
  return PLAYER_COLORS[counts.indexOf(min)];
}

function doJoin(d: RoomState, ctx: Ctx, player: PlayerState | undefined, action: Extract<Action, { type: "join" }>, creds?: JoinCredentials): Step {
  if (player && !player.left) {
    // déjà dans la salle : re-join idempotent
    return { ok: true, result: { playerId: player.id, token: player.token } };
  }
  if (player && player.left) {
    if (activeCount(d) >= LIMITS.maxPlayers) return fail("room_full", "La salle est pleine.");
    player.left = false;
    player.lastSeen = ctx.now;
    player.connected = true;
    bump(ctx);
    return { ok: true, result: { playerId: player.id, token: player.token } };
  }
  if (creds && d.kicked.includes(creds.token)) return fail("kicked", "Tu as été retiré de cette salle.");
  const base = cleanName(action.name, LIMITS.nameMaxLength);
  if (!base) return fail("invalid", "Choisis un prénom pour entrer.");
  if (activeCount(d) >= LIMITS.maxPlayers) return fail("room_full", "La salle est pleine.");

  const seq = d.nextSeq;
  let id = creds?.playerId || `p${seq}`;
  if (d.players.some((p) => p.id === id)) id = `${id}-${seq}`;
  let token = creds?.token || `t${deterministicHex(40, d.seed, "token", seq)}`;
  if (d.players.some((p) => p.token === token)) token = `t${deterministicHex(40, d.seed, "token-bis", seq, token)}`;

  const p: PlayerState = {
    id,
    token,
    name: uniqueName(
      base,
      d.players.map((x) => x.name),
      LIMITS.nameMaxLength,
    ),
    avatar: cleanAvatar(action.avatar),
    color: pickColor(d),
    seq,
    joinedAt: ctx.now,
    lastSeen: ctx.now,
    connected: true,
    left: false,
    jokersLeft: d.settings.jokers,
    pv: 0,
    seen: {},
  };
  d.nextSeq += 1;
  d.players.push(p);
  const host = findPlayer(d, d.hostId);
  if (!host || host.left) d.hostId = p.id;
  bump(ctx);
  return { ok: true, result: { playerId: p.id, token: p.token } };
}

function doLeave(d: RoomState, ctx: Ctx, player: PlayerState): Step {
  if (d.phase === "lobby") {
    d.players = d.players.filter((p) => p.id !== player.id);
  } else {
    player.left = true;
    player.connected = false;
  }
  bump(ctx);
  return DONE;
}

function doSettings(d: RoomState, ctx: Ctx, player: PlayerState, patch: unknown): Step {
  if (!isHost(d, player)) return fail("not_host", "Seul l'hôte peut changer les réglages.");
  if (d.phase !== "lobby") return fail("bad_phase", "Les réglages se changent dans la salle d'attente.");
  const known = ctx.catalog.length > 0 ? new Set(ctx.catalog.map((t) => t.category)) : null;
  const res = applySettingsPatch(d.settings, patch, known);
  if (!res.ok) return fail("invalid", res.message);
  if (JSON.stringify(res.settings) === JSON.stringify(d.settings)) return DONE;
  d.settings = res.settings;
  for (const p of d.players) p.jokersLeft = d.settings.jokers;
  bump(ctx);
  return DONE;
}

/** Retire un mème (modération / expulsion). Passe au suivant si c'était le mème en cours. */
function removeMemeEntry(d: RoomState, ctx: Ctx, m: MemeEntry): void {
  if (m.removed) return;
  const wasCurrent = (d.phase === "vote" || d.phase === "reveal") && currentMeme(d)?.id === m.id;
  m.removed = true;
  m.closed = true;
  bump(ctx);
  if (wasCurrent) advance(d, ctx, ctx.now);
  if (d.phase === "final") d.awards = computeAwards(d);
}

function doKick(d: RoomState, ctx: Ctx, player: PlayerState, targetId: string): Step {
  if (!isHost(d, player)) return fail("not_host", "Seul l'hôte peut retirer un joueur.");
  if (targetId === player.id) return fail("invalid", "Tu ne peux pas te retirer toi-même.");
  const target = findPlayer(d, targetId);
  if (!target) return DONE; // déjà retiré : idempotent
  d.players = d.players.filter((p) => p.id !== target.id);
  if (!d.kicked.includes(target.token)) d.kicked.push(target.token);
  if (d.kicked.length > 200) d.kicked = d.kicked.slice(-200);
  if (d.current) delete d.current.participants[target.id];
  const open = currentMeme(d);
  if (open && !open.closed) delete open.votes[target.id];
  for (const m of d.memes) {
    if (m.authorId === target.id) removeMemeEntry(d, ctx, m);
  }
  if (d.phase === "final") d.awards = computeAwards(d);
  bump(ctx);
  return DONE;
}

function doStart(d: RoomState, ctx: Ctx, player: PlayerState): Step {
  if (!isHost(d, player)) return fail("not_host", "Seul l'hôte peut lancer la partie.");
  if (d.phase !== "lobby") return DONE; // déjà lancée : idempotent
  if (activeCount(d) < LIMITS.minPlayersToStart) {
    return fail("invalid", `Il faut au moins ${LIMITS.minPlayersToStart} joueurs pour lancer la partie.`);
  }
  if (ctx.catalog.length === 0 && d.images.length === 0) return fail("invalid", "Aucun gabarit de mème disponible.");
  d.memes = [];
  d.awards = [];
  d.usedThemes = [];
  d.usedForced = [];
  for (const p of d.players) p.jokersLeft = d.settings.jokers;
  startRound(d, ctx, 1, ctx.now);
  return DONE;
}

function resolveTemplate(d: RoomState, ctx: Ctx, templateId: string, grandfathered: boolean): TemplateMeta | null {
  if (templateId.startsWith(PERSO_PREFIX)) {
    const imageId = templateId.slice(PERSO_PREFIX.length);
    return grandfathered || d.images.some((i) => i.id === imageId) ? persoMeta(templateId) : null;
  }
  return catalogById(ctx.catalog).get(templateId) ?? null;
}

function doMeme(d: RoomState, ctx: Ctx, player: PlayerState, action: Extract<Action, { type: "draft" | "submit" }>): Step {
  const cur = d.current;
  if (d.phase !== "create" || !cur) return fail("bad_phase", "Ce n'est plus le moment de créer.");
  const rp = cur.participants[player.id];
  if (!rp) return fail("bad_phase", "Tu joues à partir de la prochaine manche.");
  const submit = action.type === "submit";
  if (!submit && rp.submitted) return DONE; // brouillon tardif : on garde le mème validé

  const raw: unknown = action.meme;
  const templateId = typeof raw === "object" && raw !== null ? (raw as { templateId?: unknown }).templateId : null;
  if (typeof templateId !== "string") return fail("invalid", "Mème illisible.");

  const forced = cur.forcedTemplateId;
  // même gabarit que le mème déjà accepté sans joker : il était dans la main (même si l'image a été supprimée depuis)
  const sameAsBefore = rp.meme?.templateId === templateId && !rp.usedJoker;
  const inHand = forced ? templateId === forced : sameAsBefore || rp.hands.some((h) => h.includes(templateId));
  const template = resolveTemplate(d, ctx, templateId, inHand || (rp.meme?.templateId === templateId && rp.usedJoker));
  if (!template) return fail("invalid", "Ce gabarit n'existe pas (ou plus).");

  let joker = false;
  if (!inHand) {
    if (forced) return fail("invalid", "Dans ce mode, tout le monde légende le même gabarit.");
    if (action.usedJoker !== true) return fail("invalid", "Ce gabarit n'est pas dans ta main.");
    if (!rp.usedJoker && player.jokersLeft <= 0) return fail("invalid", "Tu n'as plus de joker.");
    joker = true;
  }
  const meme = sanitizeMeme(raw, template, d.settings.stickers);
  if (!meme) return fail("invalid", "Mème illisible.");
  if (submit && !memeHasContent(meme)) return fail("invalid", "Ton mème est vide : écris au moins un texte.");

  if (joker !== rp.usedJoker) {
    // décompté une seule fois par manche ; rendu si le joueur revient à sa main
    player.jokersLeft += joker ? -1 : 1;
    rp.usedJoker = joker;
    bumpPrivate(ctx, player);
  }
  if (!sameMeme(rp.meme, meme)) {
    rp.meme = meme;
    bumpPrivate(ctx, player);
  }
  if (submit && !rp.submitted) {
    rp.submitted = true;
    bump(ctx);
  }
  return DONE;
}

function doUnsubmit(d: RoomState, ctx: Ctx, player: PlayerState): Step {
  const rp = d.current?.participants[player.id];
  if (d.phase !== "create" || !rp) return fail("bad_phase", "Trop tard pour modifier ton mème.");
  if (rp.submitted) {
    rp.submitted = false;
    bump(ctx);
  }
  return DONE;
}

function doVote(d: RoomState, ctx: Ctx, player: PlayerState, memeId: string, score: VoteScore): Step {
  const target = d.memes.find((m) => m.id === memeId);
  if (target && !target.removed && target.votes[player.id] === score) return DONE; // déjà enregistré : idempotent
  const m = currentMeme(d);
  if (d.phase !== "vote" || !m || m.id !== memeId) return fail("bad_phase", "Le vote est clos pour ce mème.");
  if (m.authorId === player.id) return fail("invalid", "On ne note pas son propre mème.");
  const previous = m.votes[player.id];
  m.votes[player.id] = score;
  if (previous === undefined) bump(ctx);
  else bumpPrivate(ctx, player);
  return DONE;
}

function doSkip(d: RoomState, ctx: Ctx, player: PlayerState): Step {
  if (!isHost(d, player)) return fail("not_host", "Seul l'hôte peut passer à la suite.");
  if (d.phase === "lobby" || d.phase === "final") return fail("bad_phase", "Rien à passer pour l'instant.");
  if (ctx.now - d.phaseStartedAt < SKIP_GUARD_MS) return DONE; // double envoi : ignoré
  switch (d.phase) {
    case "create":
      enterVote(d, ctx, ctx.now);
      break;
    case "vote":
      enterReveal(d, ctx, ctx.now);
      break;
    case "reveal":
      advance(d, ctx, ctx.now);
      break;
    case "results":
      afterResults(d, ctx, ctx.now);
      break;
  }
  return DONE;
}

function doRemoveMeme(d: RoomState, ctx: Ctx, player: PlayerState, memeId: string): Step {
  if (!isHost(d, player)) return fail("not_host", "Seul l'hôte peut retirer un mème.");
  const m = d.memes.find((x) => x.id === memeId);
  if (!m) return fail("invalid", "Mème introuvable.");
  removeMemeEntry(d, ctx, m);
  return DONE;
}

function doAgain(d: RoomState, ctx: Ctx, player: PlayerState): Step {
  if (!isHost(d, player)) return fail("not_host", "Seul l'hôte peut relancer une partie.");
  if (d.phase === "lobby") return DONE; // déjà fait : idempotent
  if (d.phase !== "final") return fail("bad_phase", "La partie n'est pas terminée.");
  d.game += 1;
  d.round = 0;
  d.memes = [];
  d.awards = [];
  d.current = null;
  d.usedThemes = [];
  d.usedForced = [];
  d.players = d.players.filter((p) => !p.left);
  for (const p of d.players) p.jokersLeft = d.settings.jokers;
  setPhase(d, ctx, "lobby", ctx.now, null);
  return DONE;
}

function dispatch(d: RoomState, ctx: Ctx, playerId: string | null, action: Action, creds?: JoinCredentials): Step {
  const player = findPlayer(d, playerId);
  if (action.type === "join") return doJoin(d, ctx, player, action, creds);
  if (!player || player.left) return fail("bad_token", "Joueur inconnu dans cette salle.");
  switch (action.type) {
    case "leave":
      return doLeave(d, ctx, player);
    case "settings":
      return doSettings(d, ctx, player, action.patch);
    case "kick":
      return doKick(d, ctx, player, action.playerId);
    case "start":
      return doStart(d, ctx, player);
    case "draft":
    case "submit":
      return doMeme(d, ctx, player, action);
    case "unsubmit":
      return doUnsubmit(d, ctx, player);
    case "vote":
      return doVote(d, ctx, player, action.memeId, action.score);
    case "skip":
      return doSkip(d, ctx, player);
    case "removeMeme":
      return doRemoveMeme(d, ctx, player, action.memeId);
    case "again":
      return doAgain(d, ctx, player);
    default:
      return fail("invalid", "Action inconnue.");
  }
}

function runAction(room: RoomState, now: number, catalog: TemplateMeta[], fn: (d: RoomState, ctx: Ctx) => Step): ActionOutcome {
  const out = run(room, now, catalog, (d, ctx): Step => {
    tickMut(d, ctx);
    const step = fn(d, ctx);
    if (!step.ok) {
      // l'état cloné est jeté : on ne garde rien d'une action refusée
      ctx.dirty = true;
      return step;
    }
    tickMut(d, ctx);
    return step;
  });
  if (!out.value.ok) return out.value;
  return { ok: true, room: out.room, result: out.value.result };
}

/**
 * Applique une action. `playerId` = joueur authentifié par la route (null pour
 * un "join" d'un nouveau venu). L'état est d'abord mis à l'heure (`tick`), puis
 * l'action est appliquée, puis les transitions qu'elle déclenche (ex. dernier
 * vote -> révélation). Toutes les actions sont idempotentes.
 * `creds` : identité aléatoire forte du nouveau joueur pour "join" (fournie par
 * la route ; en son absence, repli déterministe réservé aux tests).
 */
export function applyAction(
  room: RoomState,
  playerId: string | null,
  action: Action,
  now: number,
  catalog: TemplateMeta[],
  creds?: JoinCredentials,
): ActionOutcome {
  return runAction(room, now, catalog, (d, ctx) => dispatch(d, ctx, playerId, action, creds));
}

// ------------------------------------------------------------------ pack perso

function inGame(d: RoomState): boolean {
  return d.phase !== "lobby" && d.phase !== "final";
}

/** Ajoute une image (déjà validée et stockée par la route) au pack perso de la salle. */
export function addImage(
  room: RoomState,
  playerId: string | null,
  image: { id: string; w: number; h: number },
  now: number,
  catalog: TemplateMeta[],
): ActionOutcome {
  return runAction(room, now, catalog, (d, ctx) => {
    const player = findPlayer(d, playerId);
    if (!player || player.left) return fail("bad_token", "Joueur inconnu dans cette salle.");
    const existing = d.images.find((i) => i.id === image.id);
    if (existing) return { ok: true, result: { image: existing } };
    if (d.settings.uploads === "off") return fail("uploads_off", "L'ajout d'images est désactivé dans cette salle.");
    if (d.settings.uploads === "host" && !isHost(d, player)) return fail("not_host", "Seul l'hôte peut ajouter des images.");
    if (d.images.length >= LIMITS.maxImages) return fail("too_many_images", "Le pack perso de la salle est plein.");
    if (d.images.filter((i) => i.by === player.id).length >= LIMITS.maxImagesPerPlayer) {
      return fail("too_many_images", `Tu as déjà ajouté ${LIMITS.maxImagesPerPlayer} images, c'est le maximum.`);
    }
    const entry: CustomImage = { id: image.id, w: image.w, h: image.h, by: player.id, byName: player.name };
    d.images.push(entry);
    bump(ctx);
    return { ok: true, result: { image: entry } };
  });
}

/**
 * Supprime une image du pack perso (hôte ou auteur de l'image). Elle disparaît
 * des mains en cours ; les mèmes déjà faits avec gardent leur templateId.
 * Pendant une partie, seul l'hôte peut supprimer une image utilisée dans un
 * mème de la manche courante.
 */
export function removeImage(room: RoomState, playerId: string | null, imageId: string, now: number, catalog: TemplateMeta[]): ActionOutcome {
  return runAction(room, now, catalog, (d, ctx) => {
    const player = findPlayer(d, playerId);
    if (!player || player.left) return fail("bad_token", "Joueur inconnu dans cette salle.");
    const image = d.images.find((i) => i.id === imageId);
    if (!image) return fail("image_not_found", "Cette image n'existe pas (ou plus).");
    const host = isHost(d, player);
    if (!host && image.by !== player.id) return fail("not_host", "Seul l'hôte ou la personne qui l'a ajoutée peut supprimer cette image.");
    const templateId = persoTemplateId(imageId);
    const cur = d.current;
    if (!host && inGame(d) && cur) {
      const usedNow =
        cur.forcedTemplateId === templateId ||
        Object.values(cur.participants).some((rp) => rp.meme?.templateId === templateId) ||
        d.memes.some((m) => m.round === d.round && !m.removed && m.meme.templateId === templateId);
      if (usedNow) return fail("bad_phase", "Cette image est utilisée dans la manche en cours : réessaie après.");
    }
    d.images = d.images.filter((i) => i.id !== imageId);
    if (cur && d.phase === "create") {
      if (cur.forcedTemplateId === templateId) {
        // l'image imposée à tous est supprimée (modération) : on en tire une autre et on repart de zéro
        const pool = buildPool(
          ctx.catalog,
          d.images.map((i) => persoTemplateId(i.id)),
          d.settings.categories,
          1,
        );
        const next = pickForcedTemplate(pool, d.usedForced, rng(d, d.round, "forced", imageId));
        cur.forcedTemplateId = next;
        if (next) d.usedForced.push(next);
        for (const p of d.players) {
          const rp = cur.participants[p.id];
          if (!rp) continue;
          rp.hands = next ? [[next]] : [];
          rp.meme = null;
          rp.submitted = false;
          bumpPrivate(ctx, p);
        }
      } else {
        for (const p of d.players) {
          const rp = cur.participants[p.id];
          if (!rp || !rp.hands.some((h) => h.includes(templateId))) continue;
          rp.hands = rp.hands.map((h) => h.filter((id) => id !== templateId));
          bumpPrivate(ctx, p);
        }
      }
    }
    bump(ctx);
    return DONE;
  });
}

// ------------------------------------------------------------------ vues

/** Version de la vue d'un joueur : version publique + version privée (toutes deux croissantes). */
export function viewVersion(room: RoomState, playerId: string | null): number {
  const me = findPlayer(room, playerId);
  return room.version + (me && !me.left ? me.pv : 0);
}

function toResult(room: RoomState, m: MemeEntry): MemeResult {
  const author = findPlayer(room, m.authorId);
  const breakdown: [number, number, number, number] = [0, 0, 0, 0];
  for (const id in m.votes) breakdown[m.votes[id]] += 1;
  return {
    memeId: m.id,
    meme: m.meme,
    authorId: m.authorId,
    authorName: author?.name ?? m.authorName,
    authorAvatar: author?.avatar ?? m.authorAvatar,
    points: memePoints(m),
    breakdown,
    round: m.round,
  };
}

/** Scores : somme des points des mèmes CLOS (le mème en cours de vote ne compte pas encore). */
export function computeScores(room: RoomState): Map<string, number> {
  const scores = new Map<string, number>();
  for (const m of room.memes) {
    if (!m.closed || m.removed) continue;
    scores.set(m.authorId, (scores.get(m.authorId) ?? 0) + memePoints(m));
  }
  return scores;
}

/**
 * Pendant le vote, l'auteur ne vote pas : si son `done` restait à faux quand
 * tous les autres sont à vrai, on le démasquerait. Son `done` passe donc à
 * vrai après un nombre de votes tiré au sort (1 à 3) pour chaque mème.
 */
function authorLooksDone(room: RoomState, m: MemeEntry): boolean {
  const threshold = 1 + Math.floor(makeRng(room.seed, m.id, "author-done")() * 3);
  return Object.keys(m.votes).length >= threshold;
}

/**
 * Vue envoyée au client. `playerId` null = spectateur (écran de classe) : pas
 * de `me`, pas de mains. Ne contient jamais de jeton, ni la graine, ni
 * l'auteur du mème en cours de vote. `connected` reflète l'état calculé par le
 * dernier `tick` (appeler `tick` avant).
 */
export function buildView(room: RoomState, playerId: string | null, now: number): RoomView {
  const found = findPlayer(room, playerId);
  const me = found && !found.left ? found : undefined;
  const scores = computeScores(room);
  const cur = room.current;
  const open = room.phase === "vote" || room.phase === "reveal" ? currentMeme(room) : undefined;

  const players: PlayerView[] = room.players.map((p) => {
    let done = false;
    if (room.phase === "create" && cur) {
      done = cur.participants[p.id]?.submitted === true;
    } else if (open) {
      if (p.id === open.authorId) done = room.phase === "vote" && authorLooksDone(room, open);
      else done = open.votes[p.id] !== undefined;
    }
    return {
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      color: p.color,
      score: scores.get(p.id) ?? 0,
      connected: p.connected,
      isHost: p.id === room.hostId,
      done,
    };
  });

  const view: RoomView = {
    code: room.code,
    version: room.version + (me ? me.pv : 0),
    now,
    phase: room.phase,
    phaseEndsAt: room.phaseEndsAt,
    round: room.round,
    totalRounds: room.settings.rounds,
    settings: room.settings,
    hostId: room.hostId,
    players,
    images: room.images,
    me: me ? { id: me.id, isHost: me.id === room.hostId, jokersLeft: me.jokersLeft } : null,
  };

  if (room.phase === "create" && cur) {
    const rp = me ? cur.participants[me.id] : undefined;
    const participants = room.players.filter((p) => !p.left && cur.participants[p.id]);
    view.create = {
      hands: rp ? rp.hands : [],
      situations: rp ? rp.situations : [],
      theme: cur.theme,
      forcedTemplateId: cur.forcedTemplateId,
      submitted: rp ? rp.submitted : false,
      myMeme: rp ? rp.meme : null,
      submittedCount: participants.filter((p) => cur.participants[p.id].submitted).length,
      totalPlayers: participants.length,
    };
  }

  if (open && cur) {
    const voterIds = new Set(Object.keys(open.votes));
    for (const p of room.players) {
      if (!p.left && p.connected && p.id !== open.authorId) voterIds.add(p.id);
    }
    view.vote = {
      index: cur.index,
      count: cur.queue.length,
      memeId: open.id,
      meme: open.meme,
      isMine: me ? open.authorId === me.id : false,
      myVote: me ? (open.votes[me.id] ?? null) : null,
      votedCount: Object.keys(open.votes).length,
      votersCount: voterIds.size,
      result: room.phase === "reveal" ? toResult(room, open) : null,
    };
  }

  if (room.phase === "results") {
    const entries = room.memes
      .filter((m) => m.round === room.round && m.closed && !m.removed)
      .map((m) => toResult(room, m))
      .sort((a, b) => b.points - a.points);
    const roundPoints: Record<string, number> = {};
    for (const p of room.players) roundPoints[p.id] = 0;
    for (const e of entries) {
      if (e.authorId in roundPoints) roundPoints[e.authorId] += e.points;
    }
    view.results = { entries, roundPoints, isLastRound: room.round >= room.settings.rounds };
  }

  if (room.phase === "final") {
    const ranking = room.players
      .slice()
      .sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0) || a.seq - b.seq)
      .map((p) => p.id);
    const gallery = room.memes
      .filter((m) => m.closed && !m.removed)
      .map((m) => toResult(room, m))
      .sort((a, b) => b.points - a.points || a.round - b.round);
    view.final = { ranking, awards: room.awards, gallery };
  }

  return view;
}
