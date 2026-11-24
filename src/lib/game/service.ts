/**
 * Couche « requêtes » : relie les routes HTTP, le store et le moteur.
 * Chaque requête suit le même chemin :
 *   verrou de salle -> lecture -> tick + présence (`enter`) -> (action) -> écriture si changé -> vue
 * Tout ce qui est aléatoire (codes, jetons, ids) est généré ici avec `crypto`,
 * jamais dans le moteur.
 */
import { randomBytes, randomInt } from "node:crypto";
import {
  addImage,
  applyAction,
  authenticate,
  buildView,
  createRoom,
  enter,
  removeImage,
  viewVersion,
} from "./engine";
import { cleanName, parseAction } from "./sanitize";
import type { EngineError, ErrorCode, JoinCredentials, RoomState } from "./state";
import type { RoomStore } from "./store";
import {
  LIMITS,
  type ActionResponse,
  type AddImageResponse,
  type ApiError,
  type JoinResponse,
  type TemplateMeta,
  type UnchangedResponse,
} from "./types";

export interface ServiceDeps {
  store: RoomStore;
  catalog: TemplateMeta[];
  now: () => number;
}

export interface HttpResult {
  status: number;
  body: unknown;
}

/** taille maximale du corps des requêtes JSON ordinaires */
export const MAX_BODY_BYTES = 32 * 1024;
/** taille maximale du corps pour l'ajout d'image (data URL base64 d'une image de 350 Ko + marge) */
export const MAX_IMAGE_BODY_BYTES = 520 * 1024;

/** lettres des codes de salle : pas de I/O (ambigus) ni de voyelles (pas de vrais mots) */
export const CODE_ALPHABET = "BCDFGHJKLMNPQRSTVWXZ";
const CODE_BLOCKLIST = ["FDP", "NTM", "PTN", "KKK", "PD", "TG", "SS", "NQ"];
const CODE_RE = /^[A-Z]{4}$/;
/** jeton accepté tel quel en entrée */
const TOKEN_RE = /^[A-Za-z0-9_-]{16,128}$/;
/** jeton assez long pour être adopté comme secret d'un nouveau joueur */
const STRONG_TOKEN_RE = /^[A-Za-z0-9_-]{32,128}$/;
const IMAGE_ID_RE = /^[a-f0-9]{16,40}$/;

const STATUS: Record<ErrorCode, number> = {
  room_not_found: 404,
  bad_token: 401,
  room_full: 409,
  game_started: 409,
  not_host: 403,
  bad_phase: 409,
  invalid: 400,
  kicked: 403,
  uploads_off: 403,
  too_many_images: 409,
  image_too_big: 413,
  image_not_found: 404,
};

const DEFAULT_MESSAGES: Partial<Record<ErrorCode, string>> = {
  room_not_found: "Cette salle n'existe pas (ou plus). Vérifie le code.",
  bad_token: "Tu n'es pas (ou plus) dans cette salle.",
  kicked: "Tu as été retiré de cette salle.",
  invalid: "Requête invalide.",
  image_not_found: "Cette image n'existe pas (ou plus).",
  image_too_big: "Image trop lourde.",
};

export function errorResult(error: ErrorCode, message?: string): HttpResult {
  const body: ApiError = { error, message: message ?? DEFAULT_MESSAGES[error] ?? "Erreur." };
  return { status: STATUS[error], body };
}

function fromEngine(e: EngineError): HttpResult {
  return errorResult(e.error, e.message);
}

function ok(body: unknown): HttpResult {
  return { status: 200, body };
}

export function normalizeCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase();
  return CODE_RE.test(code) ? code : null;
}

export function randomCode(): string {
  for (;;) {
    let code = "";
    for (let i = 0; i < 4; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
    if (!CODE_BLOCKLIST.some((bad) => code.includes(bad))) return code;
  }
}

function newToken(): string {
  return randomBytes(24).toString("base64url");
}

function newPlayerId(): string {
  return `p${randomBytes(5).toString("hex")}`;
}

function cleanToken(raw: unknown): string | null {
  return typeof raw === "string" && TOKEN_RE.test(raw) ? raw : null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Lecture -> calcul pur -> écriture si l'état a changé, sous le verrou de la
 * salle. Une lecture « non fraîche » peut servir la copie mémoire récente ;
 * si le calcul veut écrire (ou demande `needFresh`), on relit le cache partagé
 * et on recalcule (sans risque : `fn` est pure). Renvoie null si la salle
 * n'existe pas.
 */
async function transact<T>(
  deps: ServiceDeps,
  code: string,
  fresh: boolean,
  fn: (room: RoomState) => { room: RoomState; out: T; needFresh?: boolean },
): Promise<T | null> {
  return deps.store.withRoom(code, async () => {
    let loaded = await deps.store.load(code, { fresh });
    if (!loaded.stored) return null;
    let res = fn(loaded.stored.room);
    if ((res.room !== loaded.stored.room || res.needFresh) && !loaded.fresh) {
      loaded = await deps.store.load(code, { fresh: true });
      if (!loaded.stored) return null;
      res = fn(loaded.stored.room);
    }
    if (res.room !== loaded.stored.room) await deps.store.save(code, res.room, loaded.stored);
    return res.out;
  });
}

// ------------------------------------------------------------------ POST /api/rooms

export async function createRoomRequest(deps: ServiceDeps, body: unknown, nextCode: () => string = randomCode): Promise<HttpResult> {
  if (!isRecord(body) || typeof body.name !== "string") return errorResult("invalid");
  if (!cleanName(body.name, LIMITS.nameMaxLength)) return errorResult("invalid", "Choisis un prénom pour entrer.");
  const avatar = typeof body.avatar === "string" ? body.avatar : "";
  const name = body.name;
  const now = deps.now();

  for (let attempt = 0; attempt < 50; attempt++) {
    const code = nextCode();
    const result = await deps.store.withRoom(code, async (): Promise<HttpResult | null> => {
      const existing = await deps.store.load(code, { fresh: true });
      if (existing.stored) return null; // collision : on tire un autre code
      const out = createRoom({
        code,
        seed: randomBytes(16).toString("hex"),
        now,
        host: { id: newPlayerId(), token: newToken(), name, avatar },
      });
      if (!out.ok) return fromEngine(out);
      await deps.store.save(code, out.room, null);
      const playerId = out.result.playerId ?? "";
      const response: JoinResponse = {
        code,
        playerId,
        token: out.result.token ?? "",
        state: buildView(out.room, playerId, now),
      };
      return ok(response);
    });
    if (result) return result;
  }
  return { status: 503, body: { error: "invalid", message: "Impossible de créer une salle pour le moment, réessaie." } satisfies ApiError };
}

// ------------------------------------------------------------------ GET /api/rooms/[code]

export async function getRoomRequest(deps: ServiceDeps, rawCode: unknown, rawToken: string | null, rawVersion: string | null): Promise<HttpResult> {
  const code = normalizeCode(rawCode);
  if (!code) return errorResult("room_not_found");
  const now = deps.now();
  const known = rawVersion !== null && /^\d{1,15}$/.test(rawVersion) ? Number(rawVersion) : null;

  const result = await transact<HttpResult>(deps, code, false, (room) => {
    let playerId: string | null = null;
    let denied: HttpResult | null = null;
    if (rawToken) {
      const auth = authenticate(room, cleanToken(rawToken));
      if (auth.kind === "player") playerId = auth.playerId;
      else denied = errorResult(auth.kind === "kicked" ? "kicked" : "bad_token");
    }
    const next = enter(room, playerId, now, deps.catalog);
    if (denied) return { room: next, out: denied };
    const version = viewVersion(next, playerId);
    // le client connaît une version plus récente que notre copie : une autre instance a écrit, on relit
    const needFresh = known !== null && known > version;
    if (known !== null && known === version) {
      const unchanged: UnchangedResponse = { unchanged: true, version, now };
      return { room: next, out: ok(unchanged) };
    }
    return { room: next, out: ok(buildView(next, playerId, now)), needFresh };
  });
  return result ?? errorResult("room_not_found");
}

// ------------------------------------------------------------------ POST /api/rooms/[code]

export async function actionRequest(deps: ServiceDeps, rawCode: unknown, body: unknown): Promise<HttpResult> {
  const code = normalizeCode(rawCode);
  if (!code) return errorResult("room_not_found");
  const action = parseAction(body);
  if (!action) return errorResult("invalid", "Action invalide.");
  const token = isRecord(body) ? cleanToken(body.token) : null;
  const now = deps.now();
  // identité d'un éventuel nouveau joueur, tirée AVANT le calcul (qui peut être rejoué)
  const creds: JoinCredentials | undefined =
    action.type === "join"
      ? { playerId: newPlayerId(), token: token && STRONG_TOKEN_RE.test(token) ? token : newToken() }
      : undefined;

  const result = await transact<HttpResult>(deps, code, true, (room) => {
    const auth = authenticate(room, token);
    const current = enter(room, auth.kind === "player" ? auth.playerId : null, now, deps.catalog);

    if (action.type === "leave" && auth.kind !== "player") {
      // déjà parti (ou jamais entré) : "leave" reste idempotent
      const response: ActionResponse = { ok: true, state: buildView(current, null, now) };
      return { room: current, out: ok(response) };
    }
    if (auth.kind === "kicked") return { room: current, out: errorResult("kicked") };

    let playerId: string | null = null;
    if (auth.kind === "player") playerId = auth.playerId;
    else if (auth.kind === "left" && action.type === "join") playerId = auth.playerId;
    if (action.type !== "join" && !playerId) return { room: current, out: errorResult("bad_token") };

    const outcome = applyAction(current, playerId, action, now, deps.catalog, creds);
    if (!outcome.ok) return { room: current, out: fromEngine(outcome) };

    const response: ActionResponse = { ok: true, state: buildView(outcome.room, null, now) };
    if (action.type === "join") {
      response.playerId = outcome.result.playerId;
      response.token = outcome.result.token;
      response.state = buildView(outcome.room, outcome.result.playerId ?? null, now);
    } else if (action.type !== "leave") {
      response.state = buildView(outcome.room, playerId, now);
    }
    return { room: outcome.room, out: ok(response) };
  });
  return result ?? errorResult("room_not_found");
}

// ------------------------------------------------------------------ pack perso

const DATA_URL_RE = /^data:image\/(jpeg|webp|png);base64,([A-Za-z0-9+/]+={0,2})$/;

export interface ParsedImage {
  mime: "image/jpeg" | "image/webp" | "image/png";
  b64: string;
  bytes: number;
}

function hasMagic(buf: Buffer, format: string): boolean {
  if (format === "jpeg") return buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (format === "png") {
    const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return buf.length > 8 && sig.every((b, i) => buf[i] === b);
  }
  if (format === "webp") {
    return buf.length > 12 && buf.toString("latin1", 0, 4) === "RIFF" && buf.toString("latin1", 8, 12) === "WEBP";
  }
  return false;
}

/**
 * Valide strictement une data URL d'image : préfixe exact, base64 canonique,
 * octets magiques conformes au type annoncé, taille décodée bornée.
 */
export function parseImageDataUrl(dataUrl: unknown): { ok: true; image: ParsedImage } | { ok: false; error: "invalid" | "image_too_big"; message: string } {
  if (typeof dataUrl !== "string") return { ok: false, error: "invalid", message: "Image manquante." };
  // borne large avant toute regex : 4/3 de la taille max + préfixe
  if (dataUrl.length > Math.ceil(LIMITS.maxImageBytes / 3) * 4 + 64) {
    return { ok: false, error: "image_too_big", message: "Image trop lourde." };
  }
  const match = DATA_URL_RE.exec(dataUrl);
  if (!match) return { ok: false, error: "invalid", message: "Format d'image non accepté (JPEG, WebP ou PNG uniquement)." };
  const format = match[1];
  const b64 = match[2];
  if (b64.length % 4 !== 0) return { ok: false, error: "invalid", message: "Image illisible." };
  const buf = Buffer.from(b64, "base64");
  if (buf.length < 16 || buf.toString("base64") !== b64) return { ok: false, error: "invalid", message: "Image illisible." };
  if (buf.length > LIMITS.maxImageBytes) return { ok: false, error: "image_too_big", message: "Image trop lourde." };
  if (!hasMagic(buf, format)) return { ok: false, error: "invalid", message: "Le contenu ne correspond pas au type d'image annoncé." };
  return { ok: true, image: { mime: `image/${format}` as ParsedImage["mime"], b64, bytes: buf.length } };
}

function validDimension(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 50 && v <= 4000;
}

/** POST /api/rooms/[code]/images */
export async function addImageRequest(deps: ServiceDeps, rawCode: unknown, body: unknown): Promise<HttpResult> {
  const code = normalizeCode(rawCode);
  if (!code) return errorResult("room_not_found");
  if (!isRecord(body)) return errorResult("invalid");
  const token = cleanToken(body.token);
  if (!validDimension(body.w) || !validDimension(body.h)) return errorResult("invalid", "Dimensions d'image invalides.");
  const parsed = parseImageDataUrl(body.dataUrl);
  if (!parsed.ok) return errorResult(parsed.error, parsed.message);
  const { w, h } = body;
  const now = deps.now();
  const imageId = randomBytes(12).toString("hex");

  const result = await deps.store.withRoom(code, async (): Promise<HttpResult | null> => {
    const loaded = await deps.store.load(code, { fresh: true });
    if (!loaded.stored) return null;
    const room = loaded.stored.room;
    const auth = authenticate(room, token);
    const current = enter(room, auth.kind === "player" ? auth.playerId : null, now, deps.catalog);
    const finish = async (next: RoomState, out: HttpResult) => {
      if (next !== room) await deps.store.save(code, next, loaded.stored);
      return out;
    };
    if (auth.kind !== "player") return finish(current, errorResult(auth.kind === "kicked" ? "kicked" : "bad_token"));
    const outcome = addImage(current, auth.playerId, { id: imageId, w, h }, now, deps.catalog);
    if (!outcome.ok || !outcome.result.image) return finish(current, outcome.ok ? errorResult("invalid") : fromEngine(outcome));
    // les octets d'abord (clé séparée), la liste de la salle ensuite : jamais d'entrée sans image
    await deps.store.putImage(code, imageId, { mime: parsed.image.mime, b64: parsed.image.b64 });
    const response: AddImageResponse = {
      ok: true,
      image: outcome.result.image,
      state: buildView(outcome.room, auth.playerId, now),
    };
    return finish(outcome.room, ok(response));
  });
  return result ?? errorResult("room_not_found");
}

/** DELETE /api/rooms/[code]/images/[id]?token=T */
export async function deleteImageRequest(deps: ServiceDeps, rawCode: unknown, rawId: unknown, rawToken: string | null): Promise<HttpResult> {
  const code = normalizeCode(rawCode);
  if (!code) return errorResult("room_not_found");
  if (typeof rawId !== "string" || !IMAGE_ID_RE.test(rawId)) return errorResult("image_not_found");
  const imageId = rawId;
  const token = cleanToken(rawToken);
  const now = deps.now();

  const result = await transact<HttpResult>(deps, code, true, (room) => {
    const auth = authenticate(room, token);
    const current = enter(room, auth.kind === "player" ? auth.playerId : null, now, deps.catalog);
    if (auth.kind !== "player") return { room: current, out: errorResult(auth.kind === "kicked" ? "kicked" : "bad_token") };
    const outcome = removeImage(current, auth.playerId, imageId, now, deps.catalog);
    if (!outcome.ok) return { room: current, out: fromEngine(outcome) };
    const response: ActionResponse = { ok: true, state: buildView(outcome.room, auth.playerId, now) };
    return { room: outcome.room, out: ok(response) };
  });
  if (result && result.status === 200) await deps.store.deleteImage(code, imageId);
  return result ?? errorResult("room_not_found");
}

export type ImageResult = { found: true; mime: string; bytes: Buffer } | { found: false; result: HttpResult };

/** GET /api/rooms/[code]/images/[id] — pas de jeton : l'id (aléatoire, 96 bits) fait office de secret. */
export async function getImageRequest(deps: ServiceDeps, rawCode: unknown, rawId: unknown): Promise<ImageResult> {
  const missing: ImageResult = { found: false, result: errorResult("image_not_found") };
  const code = normalizeCode(rawCode);
  if (!code || typeof rawId !== "string" || !IMAGE_ID_RE.test(rawId)) return missing;
  // l'image doit encore figurer dans le pack de la salle (une image supprimée n'est plus servie)
  let loaded = await deps.store.load(code, { fresh: false });
  if (!loaded.fresh && !loaded.stored?.room.images.some((i) => i.id === rawId)) {
    loaded = await deps.store.load(code, { fresh: true });
  }
  if (!loaded.stored || !loaded.stored.room.images.some((i) => i.id === rawId)) return missing;
  const stored = await deps.store.getImage(code, rawId);
  if (!stored || !/^image\/(jpeg|webp|png)$/.test(stored.mime)) return missing;
  return { found: true, mime: stored.mime, bytes: Buffer.from(stored.b64, "base64") };
}

// ------------------------------------------------------------------ HTTP

export type BodyResult = { ok: true; value: unknown } | { ok: false; reason: "too_big" | "invalid" };

/** Lit un corps JSON en refusant tout ce qui dépasse `maxBytes` (sans tout charger en mémoire). */
export async function readJsonBody(request: Request, maxBytes: number): Promise<BodyResult> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return { ok: false, reason: "too_big" };
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    const reader = request.body?.getReader();
    if (!reader) return { ok: false, reason: "invalid" };
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, reason: "too_big" };
      }
      chunks.push(value);
    }
    const text = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

export const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0" };

export function toResponse(result: HttpResult): Response {
  return Response.json(result.body, { status: result.status, headers: NO_STORE_HEADERS });
}
