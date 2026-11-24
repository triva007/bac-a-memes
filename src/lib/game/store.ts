/**
 * PERSISTANCE SANS BASE DE DONNÉES
 * ------------------------------------------------------------------
 * Deux couches clé-valeur :
 *   - `local`  : mémoire de l'instance (Map accrochée à globalThis) ;
 *   - `shared` : cache partagé entre instances (Vercel Runtime Cache), régional
 *                et éphémère. Absent en local / dans les tests.
 *
 * Lecture  : on garde la copie de plus grande révision (`rev`) entre les deux ;
 *            si le cache partagé a perdu la salle (ou est en retard), on la lui
 *            réécrit. À révision égale mais écritures différentes (deux
 *            instances ont écrit en même temps), le cache partagé fait foi.
 * Écriture : mémoire + cache partagé, `rev` incrémenté à CHAQUE écriture.
 *
 * Il n'y a pas de verrou entre instances : en cas d'écritures concurrentes, la
 * dernière gagne et une action peut être perdue. C'est acceptable parce que
 * toutes les actions sont idempotentes et que les clients les renvoient tant
 * que la vue ne les reflète pas : l'état converge.
 *
 * Une panne du cache partagé ne fait jamais échouer une requête : on continue
 * en mémoire (et on le signale une seule fois dans les logs).
 */
import { createHash, randomUUID } from "node:crypto";
import type { RoomState } from "./state";
import { LIMITS } from "./types";

export interface KV {
  readonly kind: string;
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
}

// ------------------------------------------------------------------ mémoire

interface MemoryEntry {
  value: unknown;
  expiresAt: number;
}

export interface MemoryKVOptions {
  /** Map de stockage (par défaut : une Map neuve) */
  map?: Map<string, MemoryEntry>;
  now?: () => number;
  /** copie profonde à l'entrée et à la sortie, comme le ferait un vrai cache distant (tests) */
  clone?: boolean;
}

export class MemoryKV implements KV {
  readonly kind = "memory";
  private readonly map: Map<string, MemoryEntry>;
  private readonly now: () => number;
  private readonly clone: boolean;
  private writes = 0;

  constructor(options: MemoryKVOptions = {}) {
    this.map = options.map ?? new Map();
    this.now = options.now ?? Date.now;
    this.clone = options.clone ?? false;
  }

  get size(): number {
    return this.map.size;
  }

  async get(key: string): Promise<unknown | null> {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= this.now()) {
      this.map.delete(key);
      return null;
    }
    return this.clone ? structuredClone(entry.value) : entry.value;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    this.map.set(key, {
      value: this.clone ? structuredClone(value) : value,
      expiresAt: this.now() + ttlSeconds * 1000,
    });
    this.writes += 1;
    if (this.writes % 500 === 0) this.sweep();
  }

  async delete(key: string): Promise<void> {
    this.map.delete(key);
  }

  /** supprime les entrées expirées */
  sweep(): void {
    const now = this.now();
    for (const [key, entry] of this.map) {
      if (entry.expiresAt <= now) this.map.delete(key);
    }
  }
}

// ------------------------------------------------------------------ Vercel Runtime Cache

function hashKey(key: string): string {
  // la clé part dans une URL : on la hache (le hachage 32 bits par défaut du SDK est trop court)
  return createHash("sha256").update(key).digest("hex").slice(0, 40);
}

/**
 * Vercel Runtime Cache. `@vercel/functions` n'est chargé qu'au premier appel
 * (import dynamique) : les tests et le dev local n'en dépendent pas.
 * Note : le SDK avale certaines erreurs d'écriture (valeur trop grosse, délai
 * dépassé) ; c'est sans gravité car la mémoire de l'instance garde la valeur.
 */
export class VercelCacheKV implements KV {
  readonly kind = "vercel-runtime-cache";

  private async cache() {
    const mod = await import("@vercel/functions");
    return mod.getCache({ namespace: "bac-a-memes", keyHashFunction: hashKey });
  }

  async get(key: string): Promise<unknown | null> {
    const value = await (await this.cache()).get(key);
    return value ?? null;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await (await this.cache()).set(key, value, { ttl: ttlSeconds, name: key.split(":")[0] });
  }

  async delete(key: string): Promise<void> {
    await (await this.cache()).delete(key);
  }
}

// ------------------------------------------------------------------ store en couches

export interface StoredRoom {
  /** révision interne : +1 à chaque écriture (distincte de la `version` des vues) */
  rev: number;
  /** identifiant unique de l'écriture (départage deux écritures de même révision) */
  wid: string;
  room: RoomState;
}

export interface StoredImage {
  mime: string;
  /** octets de l'image en base64 */
  b64: string;
}

export interface RoomStoreOptions {
  local: KV;
  shared?: KV | null;
  now?: () => number;
  /**
   * Pour une lecture non « fraîche », durée pendant laquelle on fait confiance
   * à la copie mémoire sans réinterroger le cache partagé.
   */
  sharedMaxStaleMs?: number;
  /** délai maximal d'une opération sur le cache partagé */
  sharedTimeoutMs?: number;
  /** après une erreur du cache partagé, durée pendant laquelle on s'en passe */
  sharedCooldownMs?: number;
  ttlSeconds?: number;
  log?: (message: string, error: unknown) => void;
}

export interface LoadResult {
  stored: StoredRoom | null;
  /** vrai si la copie vient d'être confrontée au cache partagé (ou s'il n'y en a pas) */
  fresh: boolean;
}

function isStoredRoom(v: unknown, code: string): v is StoredRoom {
  if (typeof v !== "object" || v === null) return false;
  const s = v as Partial<StoredRoom>;
  return typeof s.rev === "number" && typeof s.wid === "string" && typeof s.room === "object" && s.room !== null && s.room.code === code;
}

function isStoredImage(v: unknown): v is StoredImage {
  if (typeof v !== "object" || v === null) return false;
  const s = v as Partial<StoredImage>;
  return typeof s.mime === "string" && typeof s.b64 === "string";
}

export function roomKey(code: string): string {
  return `room:${code}`;
}

export function imageKey(code: string, imageId: string): string {
  return `img:${code}:${imageId}`;
}

export class RoomStore {
  readonly local: KV;
  readonly shared: KV | null;
  private readonly now: () => number;
  private readonly sharedMaxStaleMs: number;
  private readonly sharedTimeoutMs: number;
  private readonly sharedCooldownMs: number;
  private readonly ttlSeconds: number;
  private readonly log: (message: string, error: unknown) => void;
  private readonly locks = new Map<string, Promise<unknown>>();
  private readonly lastSync = new Map<string, number>();
  private sharedDownUntil = 0;
  private logged = false;
  /** compteurs de diagnostic */
  readonly stats = { sharedReads: 0, sharedWrites: 0, sharedErrors: 0, repairs: 0, adopted: 0 };

  constructor(options: RoomStoreOptions) {
    this.local = options.local;
    this.shared = options.shared ?? null;
    this.now = options.now ?? Date.now;
    this.sharedMaxStaleMs = options.sharedMaxStaleMs ?? 400;
    this.sharedTimeoutMs = options.sharedTimeoutMs ?? 2500;
    this.sharedCooldownMs = options.sharedCooldownMs ?? 5000;
    this.ttlSeconds = options.ttlSeconds ?? LIMITS.roomTtlSeconds;
    this.log =
      options.log ??
      ((message, error) => {
        console.error(`[bac-a-memes/store] ${message}`, error);
      });
  }

  get kind(): string {
    return this.shared ? `${this.shared.kind}+${this.local.kind}` : this.local.kind;
  }

  /**
   * Mutex asynchrone par salle (dans ce processus) : les lectures-modifications-
   * écritures d'une même salle ne s'entrelacent jamais dans une instance.
   */
  async withRoom<T>(code: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(code) ?? Promise.resolve();
    const run = previous.then(fn, fn);
    const tail = run.then(
      () => undefined,
      () => undefined,
    );
    this.locks.set(code, tail);
    try {
      return await run;
    } finally {
      if (this.locks.get(code) === tail) this.locks.delete(code);
    }
  }

  /** Exécute une opération sur le cache partagé sans jamais lever d'erreur. */
  private async sharedOp<T>(what: string, op: (kv: KV) => Promise<T>): Promise<{ ok: true; value: T } | { ok: false }> {
    const kv = this.shared;
    if (!kv || this.now() < this.sharedDownUntil) return { ok: false };
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const value = await Promise.race([
        op(kv),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error(`délai dépassé (${this.sharedTimeoutMs} ms)`)), this.sharedTimeoutMs);
        }),
      ]);
      return { ok: true, value };
    } catch (error) {
      this.stats.sharedErrors += 1;
      this.sharedDownUntil = this.now() + this.sharedCooldownMs;
      if (!this.logged) {
        this.logged = true;
        this.log(`cache partagé indisponible (${what}) : on continue en mémoire`, error);
      }
      return { ok: false };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /**
   * Lit une salle. `fresh: false` autorise à renvoyer la copie mémoire si elle
   * a été confrontée au cache partagé il y a moins de `sharedMaxStaleMs` — à
   * réserver aux lectures seules : avant d'écrire, toujours relire en `fresh`.
   */
  async load(code: string, options: { fresh?: boolean } = {}): Promise<LoadResult> {
    const key = roomKey(code);
    const localRaw = await this.local.get(key);
    const local = isStoredRoom(localRaw, code) ? localRaw : null;
    if (!this.shared) return { stored: local, fresh: true };

    const fresh = options.fresh ?? true;
    const synced = this.lastSync.get(code);
    if (!fresh && local && synced !== undefined && this.now() - synced < this.sharedMaxStaleMs) {
      return { stored: local, fresh: false };
    }

    this.stats.sharedReads += 1;
    let res = await this.sharedOp("lecture", (kv) => kv.get(key));
    if (res.ok && !local && !isStoredRoom(res.value, code)) {
      // Rien en mémoire et rien dans le cache : avant de conclure que la salle n'existe pas,
      // on redemande une fois (le SDK renvoie aussi « rien » sur une erreur passagère).
      this.stats.sharedReads += 1;
      res = await this.sharedOp("lecture", (kv) => kv.get(key));
    }
    if (!res.ok) return { stored: local, fresh: true };
    const remote = isStoredRoom(res.value, code) ? res.value : null;

    if (remote && (!local || remote.rev > local.rev || (remote.rev === local.rev && remote.wid !== local.wid))) {
      // le cache partagé est en avance (ou fait foi à révision égale) : on l'adopte
      this.stats.adopted += 1;
      await this.local.set(key, remote, this.ttlSeconds);
      this.lastSync.set(code, this.now());
      return { stored: remote, fresh: true };
    }
    if (local && (!remote || local.rev > remote.rev)) {
      // le cache partagé a perdu la salle ou est en retard : on la lui réécrit
      this.stats.repairs += 1;
      await this.sharedOp("réparation", (kv) => kv.set(key, local, this.ttlSeconds));
    }
    if (local) this.lastSync.set(code, this.now());
    return { stored: local, fresh: true };
  }

  /** Écrit une salle (mémoire + cache partagé), TTL rafraîchi, révision incrémentée. */
  async save(code: string, room: RoomState, previous: StoredRoom | null): Promise<StoredRoom> {
    const key = roomKey(code);
    const stored: StoredRoom = { rev: (previous?.rev ?? 0) + 1, wid: randomUUID(), room };
    await this.local.set(key, stored, this.ttlSeconds);
    if (this.shared) {
      this.stats.sharedWrites += 1;
      const res = await this.sharedOp("écriture", (kv) => kv.set(key, stored, this.ttlSeconds));
      if (res.ok) this.lastSync.set(code, this.now());
    }
    return stored;
  }

  // ---- images du pack perso : octets immuables, dans des clés séparées

  async putImage(code: string, imageId: string, image: StoredImage): Promise<void> {
    const key = imageKey(code, imageId);
    await this.local.set(key, image, this.ttlSeconds);
    // si le cache partagé refuse la valeur (taille) ou est en panne, la mémoire suffit
    await this.sharedOp("écriture image", (kv) => kv.set(key, image, this.ttlSeconds));
  }

  async getImage(code: string, imageId: string): Promise<StoredImage | null> {
    const key = imageKey(code, imageId);
    const local = await this.local.get(key);
    if (isStoredImage(local)) return local;
    const res = await this.sharedOp("lecture image", (kv) => kv.get(key));
    if (res.ok && isStoredImage(res.value)) {
      await this.local.set(key, res.value, this.ttlSeconds);
      return res.value;
    }
    return null;
  }

  async deleteImage(code: string, imageId: string): Promise<void> {
    const key = imageKey(code, imageId);
    await this.local.delete(key);
    await this.sharedOp("suppression image", (kv) => kv.delete(key));
  }
}

// ------------------------------------------------------------------ instance par défaut

interface GlobalStore {
  __bacAMemesMemory?: Map<string, MemoryEntry>;
  __bacAMemesStore?: RoomStore;
}

/** Store du processus : mémoire seule en local, mémoire + Runtime Cache sur Vercel. */
export function getStore(): RoomStore {
  const g = globalThis as GlobalStore;
  if (!g.__bacAMemesStore) {
    // la Map vit sur globalThis pour survivre au rechargement à chaud des modules
    g.__bacAMemesMemory ??= new Map();
    g.__bacAMemesStore = new RoomStore({
      local: new MemoryKV({ map: g.__bacAMemesMemory }),
      shared: process.env.VERCEL ? new VercelCacheKV() : null,
    });
  }
  return g.__bacAMemesStore;
}
