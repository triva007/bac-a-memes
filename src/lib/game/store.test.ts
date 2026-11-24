import { describe, expect, it, vi } from "vitest";
import { createRoom } from "./engine";
import type { RoomState } from "./state";
import { MemoryKV, RoomStore, VercelCacheKV, imageKey, roomKey, type KV, type StoredRoom } from "./store";
import { LIMITS } from "./types";

function makeRoom(code = "TEST", marker = 0): RoomState {
  const out = createRoom({ code, seed: "s", now: 1000 + marker, host: { id: "p1", token: "t".repeat(32), name: "Hôte", avatar: "fox" } });
  if (!out.ok) throw new Error("createRoom");
  return out.room;
}

/** KV espion : compte les appels et peut tomber en panne à la demande */
class SpyKV implements KV {
  readonly kind = "spy";
  inner = new MemoryKV({ clone: true });
  gets = 0;
  sets = 0;
  deletes = 0;
  failing = false;
  hanging = false;
  maxValueBytes = Infinity;

  private async gate(): Promise<void> {
    if (this.failing) throw new Error("cache en panne");
    if (this.hanging) await new Promise(() => undefined);
  }
  async get(key: string) {
    this.gets += 1;
    await this.gate();
    return this.inner.get(key);
  }
  async set(key: string, value: unknown, ttl: number) {
    this.sets += 1;
    await this.gate();
    if (JSON.stringify(value).length > this.maxValueBytes) throw new Error("valeur trop grosse");
    return this.inner.set(key, value, ttl);
  }
  async delete(key: string) {
    this.deletes += 1;
    await this.gate();
    return this.inner.delete(key);
  }
}

function setup(options: { sharedMaxStaleMs?: number; sharedTimeoutMs?: number } = {}) {
  const clock = { now: 1_000_000 };
  const shared = new SpyKV();
  const logs: string[] = [];
  const make = () =>
    new RoomStore({
      local: new MemoryKV({ now: () => clock.now }),
      shared,
      now: () => clock.now,
      sharedMaxStaleMs: options.sharedMaxStaleMs ?? 400,
      sharedTimeoutMs: options.sharedTimeoutMs ?? 2500,
      log: (message) => logs.push(message),
    });
  return { clock, shared, logs, a: make(), b: make() };
}

describe("MemoryKV", () => {
  it("lit, écrit, supprime, expire selon le TTL", async () => {
    let now = 0;
    const kv = new MemoryKV({ now: () => now });
    await kv.set("k", { a: 1 }, 10);
    expect(await kv.get("k")).toEqual({ a: 1 });
    now = 9_999;
    expect(await kv.get("k")).toEqual({ a: 1 });
    now = 10_000;
    expect(await kv.get("k")).toBeNull();
    await kv.set("k2", 1, 10);
    await kv.delete("k2");
    expect(await kv.get("k2")).toBeNull();
    expect(await kv.get("absent")).toBeNull();
  });

  it("balaye les entrées expirées", async () => {
    let now = 0;
    const kv = new MemoryKV({ now: () => now });
    for (let i = 0; i < 50; i++) await kv.set(`k${i}`, i, 1);
    now = 5_000;
    await kv.set("vivant", 1, 100);
    kv.sweep();
    expect(kv.size).toBe(1);
  });

  it("partage la Map fournie (survie au rechargement à chaud)", async () => {
    const map = new Map();
    await new MemoryKV({ map }).set("k", "v", 100);
    expect(await new MemoryKV({ map }).get("k")).toBe("v");
  });
});

describe("RoomStore — mémoire seule", () => {
  it("sauvegarde et relit ; la révision augmente à chaque écriture", async () => {
    const store = new RoomStore({ local: new MemoryKV() });
    expect(store.kind).toBe("memory");
    expect((await store.load("TEST")).stored).toBeNull();
    const room = makeRoom();
    const s1 = await store.save("TEST", room, null);
    expect(s1.rev).toBe(1);
    const loaded = await store.load("TEST");
    expect(loaded.fresh).toBe(true);
    expect(loaded.stored?.room).toBe(room); // même référence : pas de copie en mémoire
    const s2 = await store.save("TEST", room, loaded.stored);
    const s3 = await store.save("TEST", room, s2);
    expect([s2.rev, s3.rev]).toEqual([2, 3]);
    expect(s2.wid).not.toBe(s3.wid);
  });

  it("rafraîchit le TTL de la salle à chaque écriture", async () => {
    let now = 0;
    const store = new RoomStore({ local: new MemoryKV({ now: () => now }), now: () => now });
    let stored = await store.save("TEST", makeRoom(), null);
    now = (LIMITS.roomTtlSeconds - 10) * 1000;
    stored = await store.save("TEST", makeRoom(), stored);
    expect(stored.rev).toBe(2);
    now += 60_000; // au-delà du TTL initial, mais pas du TTL rafraîchi
    expect((await store.load("TEST")).stored?.rev).toBe(2);
    now += LIMITS.roomTtlSeconds * 1000;
    expect((await store.load("TEST")).stored).toBeNull();
  });
});

describe("RoomStore — mémoire + cache partagé", () => {
  it("écrit dans les deux couches ; une autre instance relit depuis le cache partagé", async () => {
    const { a, b, shared } = setup();
    expect(a.kind).toBe("spy+memory");
    const room = makeRoom();
    const stored = await a.save("TEST", room, null);
    expect(shared.sets).toBe(1);
    expect(((await shared.inner.get(roomKey("TEST"))) as StoredRoom).rev).toBe(1);
    const fromB = await b.load("TEST");
    expect(fromB.stored).toEqual(stored);
    expect(fromB.stored?.room).not.toBe(room); // passé par le cache : c'est une copie
    expect(b.stats.adopted).toBe(1);
  });

  it("prend la copie de plus grande révision ; le cache en avance est adopté", async () => {
    const { a, b } = setup();
    let sa = await a.save("TEST", makeRoom("TEST", 1), null);
    await b.load("TEST");
    sa = await a.save("TEST", makeRoom("TEST", 2), sa);
    sa = await a.save("TEST", makeRoom("TEST", 3), sa);
    expect(sa.rev).toBe(3);
    const fromB = await b.load("TEST");
    expect(fromB.stored?.rev).toBe(3);
    expect(fromB.stored?.room.createdAt).toBe(1003);
  });

  it("si le cache a perdu la salle, la mémoire la lui réécrit", async () => {
    const { a, b, shared } = setup();
    const stored = await a.save("TEST", makeRoom(), null);
    await shared.inner.delete(roomKey("TEST")); // éviction
    const loaded = await a.load("TEST");
    expect(loaded.stored).toEqual(stored);
    expect(a.stats.repairs).toBe(1);
    expect(await shared.inner.get(roomKey("TEST"))).toEqual(stored);
    expect((await b.load("TEST")).stored).toEqual(stored);
  });

  it("si la mémoire est en avance sur le cache (écriture perdue), elle le répare", async () => {
    const { a, shared, clock } = setup();
    const s1 = await a.save("TEST", makeRoom("TEST", 1), null);
    shared.failing = true;
    const s2 = await a.save("TEST", makeRoom("TEST", 2), s1); // n'atteint pas le cache
    shared.failing = false;
    expect(((await shared.inner.get(roomKey("TEST"))) as StoredRoom).rev).toBe(1);
    clock.now += 6_000; // fin de la mise à l'écart du cache
    const loaded = await a.load("TEST");
    expect(loaded.stored).toEqual(s2);
    expect(a.stats.repairs).toBe(1);
    expect(((await shared.inner.get(roomKey("TEST"))) as StoredRoom).rev).toBe(2);
  });

  it("à révision égale mais écritures différentes, le cache partagé fait foi", async () => {
    const { a, b } = setup();
    const base = await a.save("TEST", makeRoom("TEST", 0), null);
    await b.load("TEST");
    // les deux instances écrivent « en même temps » la révision 2 ; B écrit en dernier
    const sa = await a.save("TEST", makeRoom("TEST", 10), base);
    const sb = await b.save("TEST", makeRoom("TEST", 20), base);
    expect(sa.rev).toBe(sb.rev);
    const seenByA = await a.load("TEST");
    expect(seenByA.stored).toEqual(sb);
    expect((await b.load("TEST")).stored).toEqual(sb);
  });

  it("une valeur étrangère ou corrompue dans le cache est ignorée", async () => {
    const { a, shared } = setup();
    await shared.inner.set(roomKey("TEST"), { rev: 99, wid: "x", room: { code: "AUTRE" } }, 100);
    expect((await a.load("TEST")).stored).toBeNull();
    await shared.inner.set(roomKey("TEST"), "n'importe quoi", 100);
    expect((await a.load("TEST")).stored).toBeNull();
    const stored = await a.save("TEST", makeRoom(), null);
    await shared.inner.set(roomKey("TEST"), { rev: "12" }, 100);
    expect((await a.load("TEST")).stored).toEqual(stored);
  });

  it("lecture non fraîche : ne réinterroge pas le cache pendant la fenêtre, puis si", async () => {
    const { a, shared, clock } = setup({ sharedMaxStaleMs: 400 });
    await a.save("TEST", makeRoom(), null);
    const before = shared.gets;
    for (let i = 0; i < 5; i++) {
      const r = await a.load("TEST", { fresh: false });
      expect(r.fresh).toBe(false);
      expect(r.stored?.rev).toBe(1);
    }
    expect(shared.gets).toBe(before);
    expect((await a.load("TEST", { fresh: true })).fresh).toBe(true);
    expect(shared.gets).toBe(before + 1);
    clock.now += 401;
    expect((await a.load("TEST", { fresh: false })).fresh).toBe(true);
    expect(shared.gets).toBe(before + 2);
    // salle absente de la mémoire : on interroge toujours le cache (deux fois avant de conclure à l'absence)
    await a.load("NOPE", { fresh: false });
    expect(shared.gets).toBe(before + 4);
  });

  it("une panne du cache ne fait jamais échouer : on continue en mémoire, un seul log, puis on réessaie", async () => {
    const { a, shared, logs, clock } = setup();
    let stored = await a.save("TEST", makeRoom("TEST", 1), null);
    shared.failing = true;
    stored = await a.save("TEST", makeRoom("TEST", 2), stored);
    expect((await a.load("TEST")).stored).toEqual(stored);
    stored = await a.save("TEST", makeRoom("TEST", 3), stored);
    expect((await a.load("TEST")).stored?.rev).toBe(3);
    expect(logs).toHaveLength(1);
    expect(a.stats.sharedErrors).toBe(1); // mis à l'écart : pas d'appel pendant le délai
    // création d'une salle pendant la panne
    await a.save("NEUF", makeRoom("NEUF"), null);
    expect((await a.load("NEUF")).stored?.rev).toBe(1);
    // le cache revient
    shared.failing = false;
    clock.now += 6_000;
    expect((await a.load("TEST")).stored?.rev).toBe(3);
    expect(((await shared.inner.get(roomKey("TEST"))) as StoredRoom).rev).toBe(3);
    expect(logs).toHaveLength(1);
  });

  it("un cache qui ne répond pas est abandonné après le délai", async () => {
    const { a, shared, logs } = setup({ sharedTimeoutMs: 30 });
    const stored = await a.save("TEST", makeRoom(), null);
    shared.hanging = true;
    const t0 = Date.now();
    const loaded = await a.load("TEST");
    expect(Date.now() - t0).toBeLessThan(1500);
    expect(loaded.stored).toEqual(stored);
    expect(logs[0]).toContain("cache partagé indisponible");
  });
});

describe("RoomStore — verrou par salle", () => {
  it("sérialise les lectures-modifications-écritures concurrentes d'une même salle", async () => {
    const store = new RoomStore({ local: new MemoryKV() });
    await store.save("TEST", makeRoom(), null);
    const order: string[] = [];
    let counter = 0;
    const job = (name: string, delay: number) =>
      store.withRoom("TEST", async () => {
        order.push(`début ${name}`);
        const read = counter;
        await new Promise((r) => setTimeout(r, delay));
        counter = read + 1;
        order.push(`fin ${name}`);
        return name;
      });
    const results = await Promise.all([job("a", 20), job("b", 1), job("c", 5)]);
    expect(results).toEqual(["a", "b", "c"]);
    expect(counter).toBe(3);
    expect(order).toEqual(["début a", "fin a", "début b", "fin b", "début c", "fin c"]);
  });

  it("des salles différentes ne se bloquent pas ; une erreur ne bloque pas la suite", async () => {
    const store = new RoomStore({ local: new MemoryKV() });
    const order: string[] = [];
    const slow = store.withRoom("AAAA", async () => {
      await new Promise((r) => setTimeout(r, 30));
      order.push("lente");
    });
    const fast = store.withRoom("BBBB", async () => {
      order.push("rapide");
    });
    await Promise.all([slow, fast]);
    expect(order).toEqual(["rapide", "lente"]);

    const failing = store.withRoom("AAAA", async () => {
      throw new Error("boum");
    });
    const next = store.withRoom("AAAA", async () => "ok");
    await expect(failing).rejects.toThrow("boum");
    await expect(next).resolves.toBe("ok");
    expect((store as unknown as { locks: Map<string, unknown> }).locks.size).toBe(0);
  });
});

describe("RoomStore — images", () => {
  it("stocke les octets dans une clé séparée, lisible depuis une autre instance", async () => {
    const { a, b, shared } = setup();
    await a.putImage("TEST", "abc", { mime: "image/png", b64: "AAAA" });
    expect(await shared.inner.get(imageKey("TEST", "abc"))).toEqual({ mime: "image/png", b64: "AAAA" });
    expect(await b.getImage("TEST", "abc")).toEqual({ mime: "image/png", b64: "AAAA" });
    // la deuxième lecture de B ne repasse pas par le cache
    const gets = shared.gets;
    await b.getImage("TEST", "abc");
    expect(shared.gets).toBe(gets);
    expect(await a.getImage("TEST", "absente")).toBeNull();
    await a.deleteImage("TEST", "abc");
    expect(await a.getImage("TEST", "abc")).toBeNull();
    expect(await shared.inner.get(imageKey("TEST", "abc"))).toBeNull();
  });

  it("si le cache partagé refuse la valeur (taille), repli en mémoire sans planter", async () => {
    const { a, b, shared, logs } = setup();
    shared.maxValueBytes = 100;
    const big = { mime: "image/jpeg", b64: "A".repeat(5000) };
    await expect(a.putImage("TEST", "grosse", big)).resolves.toBeUndefined();
    expect(await a.getImage("TEST", "grosse")).toEqual(big);
    expect(logs).toHaveLength(1);
    // l'autre instance ne l'a pas : null, pas d'erreur
    expect(await b.getImage("TEST", "grosse")).toBeNull();
  });

  it("fonctionne sans cache partagé", async () => {
    const store = new RoomStore({ local: new MemoryKV() });
    await store.putImage("TEST", "x", { mime: "image/webp", b64: "BBBB" });
    expect(await store.getImage("TEST", "x")).toEqual({ mime: "image/webp", b64: "BBBB" });
    await store.deleteImage("TEST", "x");
    expect(await store.getImage("TEST", "x")).toBeNull();
  });
});

describe("VercelCacheKV (SDK réel, cache de repli en mémoire hors Vercel)", () => {
  it("aller-retour set / get / delete à travers @vercel/functions", async () => {
    const kv = new VercelCacheKV();
    expect(kv.kind).toBe("vercel-runtime-cache");
    const key = `test:${Math.random().toString(36).slice(2)}`;
    expect(await kv.get(key)).toBeNull();
    await kv.set(key, { rev: 1, liste: [1, 2, 3], texte: "é" }, 60);
    expect(await kv.get(key)).toEqual({ rev: 1, liste: [1, 2, 3], texte: "é" });
    // des clés différentes ne se marchent pas dessus (clés hachées)
    await kv.set(`${key}:autre`, "autre", 60);
    expect(await kv.get(key)).toEqual({ rev: 1, liste: [1, 2, 3], texte: "é" });
    await kv.delete(key);
    expect(await kv.get(key)).toBeNull();
    expect(await kv.get(`${key}:autre`)).toBe("autre");
  });

  it("sert de couche partagée à deux stores", async () => {
    const a = new RoomStore({ local: new MemoryKV(), shared: new VercelCacheKV() });
    const b = new RoomStore({ local: new MemoryKV(), shared: new VercelCacheKV() });
    const code = "VRCL";
    const stored = await a.save(code, makeRoom(code), null);
    expect((await b.load(code)).stored).toEqual(stored);
    await a.putImage(code, "abcdef", { mime: "image/png", b64: "QUJD" });
    expect(await b.getImage(code, "abcdef")).toEqual({ mime: "image/png", b64: "QUJD" });
    expect(a.kind).toBe("vercel-runtime-cache+memory");
    expect(a.stats.sharedErrors + b.stats.sharedErrors).toBe(0);
  });
});

describe("store par défaut", () => {
  it("getStore renvoie toujours la même instance, en mémoire hors Vercel", async () => {
    vi.stubEnv("VERCEL", "");
    const { getStore } = await import("./store");
    const s1 = getStore();
    expect(getStore()).toBe(s1);
    expect(s1.kind).toBe("memory");
    vi.unstubAllEnvs();
  });
});
