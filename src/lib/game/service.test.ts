import { describe, expect, it } from "vitest";
import { mulberry32 } from "./rng";
import {
  actionRequest,
  createRoomRequest,
  getRoomRequest,
  normalizeCode,
  parseImageDataUrl,
  randomCode,
  CODE_ALPHABET,
  type HttpResult,
  type ServiceDeps,
} from "./service";
import { MemoryKV, RoomStore, type KV } from "./store";
import { fakeCatalog, memeFor } from "./testkit";
import { LIMITS, type ActionRequest, type ActionResponse, type JoinResponse, type RoomView, type UnchangedResponse } from "./types";

const catalog = fakeCatalog();

/** Faux cache partagé « distant » : copie les valeurs et répond après un délai aléatoire (entrelacements). */
class SlowSharedKV implements KV {
  readonly kind = "faux-cache";
  private inner = new MemoryKV({ clone: true });
  sets = 0;
  constructor(private rand: () => number) {}
  private async lag(): Promise<void> {
    const hops = Math.floor(this.rand() * 4);
    for (let i = 0; i < hops; i++) await new Promise<void>((r) => setImmediate(r));
  }
  async get(key: string) {
    await this.lag();
    const value = await this.inner.get(key);
    await this.lag();
    return value;
  }
  async set(key: string, value: unknown, ttl: number) {
    this.sets += 1;
    await this.lag();
    await this.inner.set(key, value, ttl);
    await this.lag();
  }
  async delete(key: string) {
    await this.lag();
    await this.inner.delete(key);
  }
}

function body<T>(res: HttpResult): T {
  return res.body as T;
}

describe("codes de salle", () => {
  it("4 lettres majuscules sans ambiguïté (ni I ni O), normalisation insensible à la casse", () => {
    expect(CODE_ALPHABET).not.toMatch(/[IO]/);
    for (let i = 0; i < 300; i++) {
      const code = randomCode();
      expect(code).toMatch(/^[A-Z]{4}$/);
      expect([...code].every((c) => CODE_ALPHABET.includes(c))).toBe(true);
    }
    expect(normalizeCode(" bcdf ")).toBe("BCDF");
    expect(normalizeCode("BcDf")).toBe("BCDF");
    expect(normalizeCode("ABC")).toBeNull();
    expect(normalizeCode("ABCDE")).toBeNull();
    expect(normalizeCode("AB1D")).toBeNull();
    expect(normalizeCode(undefined)).toBeNull();
  });
});

describe("création de salle", () => {
  it("retire un code en cas de collision, sans écraser la salle existante", async () => {
    const deps: ServiceDeps = { store: new RoomStore({ local: new MemoryKV() }), catalog, now: () => 1_800_000_000_000 };
    const first = body<JoinResponse>(await createRoomRequest(deps, { name: "Première", avatar: "fox" }, () => "BCDF"));
    expect(first.code).toBe("BCDF");
    const codes = ["BCDF", "BCDF", "GHJK"];
    let draws = 0;
    const second = body<JoinResponse>(await createRoomRequest(deps, { name: "Seconde", avatar: "cat" }, () => codes[draws++]));
    expect(draws).toBe(3);
    expect(second.code).toBe("GHJK");
    expect(second.token).not.toBe(first.token);
    // la première salle est intacte
    const still = body<RoomView>(await getRoomRequest(deps, "BCDF", first.token, null));
    expect(still.players.map((p) => p.name)).toEqual(["Première"]);
    // générateur bloqué sur un code pris : on abandonne proprement (pas de boucle infinie, pas d'exception)
    const stuck = await createRoomRequest(deps, { name: "Bloquée", avatar: "cat" }, () => "BCDF");
    expect(stuck.status).toBe(503);
  });

  it("créations simultanées : chacune obtient sa salle", async () => {
    const deps: ServiceDeps = { store: new RoomStore({ local: new MemoryKV() }), catalog, now: () => 1_800_000_000_000 };
    const queue = ["BCDF", "BCDF", "BCDF", "GHJK", "GHJK", "LMNP"];
    const results = await Promise.all(Array.from({ length: 3 }, (_, i) => createRoomRequest(deps, { name: `Hôte ${i}`, avatar: "fox" }, () => queue.shift() ?? "QRST")));
    const rooms = results.map((r) => body<JoinResponse>(r));
    expect(new Set(rooms.map((r) => r.code)).size).toBe(3);
    for (const r of rooms) {
      const view = body<RoomView>(await getRoomRequest(deps, r.code, r.token, null));
      expect(view.me?.id).toBe(r.playerId);
      expect(view.players).toHaveLength(1);
    }
  });
});

describe("écritures de présence limitées", () => {
  it("un joueur qui interroge chaque seconde ne provoque qu'une écriture toutes les ~4 s, sans changer la version", async () => {
    const clock = { now: 1_800_000_000_000 };
    const shared = new SlowSharedKV(() => 0);
    const deps: ServiceDeps = {
      store: new RoomStore({ local: new MemoryKV({ now: () => clock.now }), shared, now: () => clock.now }),
      catalog,
      now: () => clock.now,
    };
    const created = body<JoinResponse>(await createRoomRequest(deps, { name: "Hôte", avatar: "fox" }));
    const joined = body<ActionResponse>(await actionRequest(deps, created.code, { type: "join", name: "Léa", avatar: "cat" }));
    const version = joined.state.version;
    const writesBefore = shared.sets;
    let unchanged = 0;
    for (let i = 0; i < 60; i++) {
      clock.now += 1_000;
      for (const token of [created.token, joined.token!]) {
        const res = await getRoomRequest(deps, created.code, token, String(version));
        expect(res.status).toBe(200);
        if (body<UnchangedResponse>(res).unchanged) unchanged += 1;
      }
    }
    expect(unchanged).toBe(120); // jamais de vue complète renvoyée : la version n'a pas bougé
    const writes = shared.sets - writesBefore;
    // 2 joueurs x 60 s / 4 s = 30 écritures au plus (au lieu de 120)
    expect(writes).toBeLessThanOrEqual(32);
    expect(writes).toBeGreaterThanOrEqual(20);
    // un spectateur n'écrit jamais
    const before = shared.sets;
    for (let i = 0; i < 20; i++) {
      await getRoomRequest(deps, created.code, null, null);
      await getRoomRequest(deps, created.code, null, String(version));
    }
    expect(shared.sets).toBe(before);
  });

  it("la déconnexion (12 s sans sondage) change la version et provoque une écriture", async () => {
    const clock = { now: 1_800_000_000_000 };
    const deps: ServiceDeps = { store: new RoomStore({ local: new MemoryKV({ now: () => clock.now }), now: () => clock.now }), catalog, now: () => clock.now };
    const created = body<JoinResponse>(await createRoomRequest(deps, { name: "Hôte", avatar: "fox" }));
    const joined = body<ActionResponse>(await actionRequest(deps, created.code, { type: "join", name: "Léa", avatar: "cat" }));
    const v = joined.state.version;
    clock.now += LIMITS.disconnectAfterMs + 500;
    // seul l'hôte continue d'interroger
    const view = body<RoomView>(await getRoomRequest(deps, created.code, created.token, String(v)));
    expect(view.version).toBeGreaterThan(v);
    expect(view.players.map((p) => p.connected)).toEqual([true, false]);
  });
});

describe("lecture rapide et versions", () => {
  it("si le client connaît une version plus récente que la copie mémoire, l'instance relit le cache partagé", async () => {
    const clock = { now: 1_800_000_000_000 };
    const shared = new SlowSharedKV(() => 0);
    const mk = (): ServiceDeps => ({
      store: new RoomStore({ local: new MemoryKV({ now: () => clock.now }), shared, now: () => clock.now, sharedMaxStaleMs: 60_000 }),
      catalog,
      now: () => clock.now,
    });
    const [a, b] = [mk(), mk()];
    const created = body<JoinResponse>(await createRoomRequest(a, { name: "Hôte", avatar: "fox" }));
    // B charge la salle, puis A la modifie
    const seenByB = body<RoomView>(await getRoomRequest(b, created.code, created.token, null));
    const joined = body<ActionResponse>(await actionRequest(a, created.code, { type: "join", name: "Léa", avatar: "cat" }));
    expect(joined.state.version).toBeGreaterThan(seenByB.version);
    // sans indication, B sert sa copie mémoire (fenêtre de 60 s ici) : vue en retard
    expect(body<RoomView>(await getRoomRequest(b, created.code, null, null)).players).toHaveLength(1);
    // le client qui a vu la version de A la présente à B : B se met à jour au lieu de régresser
    const fresh = body<UnchangedResponse>(await getRoomRequest(b, created.code, created.token, String(joined.state.version)));
    expect(fresh).toMatchObject({ unchanged: true, version: joined.state.version });
    expect(body<RoomView>(await getRoomRequest(b, created.code, null, null)).players).toHaveLength(2);
    // même chose avec une version encore plus grande (ex. vue d'une autre instance en avance)
    const ahead = body<RoomView>(await getRoomRequest(b, created.code, created.token, String(joined.state.version + 5)));
    expect(ahead.players).toHaveLength(2);
  });
});

describe("validation des data URL d'image", () => {
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 7)]);
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 7)]);
  const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.from([1, 2, 3, 4]), Buffer.from("WEBP"), Buffer.alloc(64, 7)]);
  const url = (mime: string, buf: Buffer) => `data:${mime};base64,${buf.toString("base64")}`;

  it("accepte JPEG, PNG et WebP bien formés", () => {
    expect(parseImageDataUrl(url("image/png", png))).toMatchObject({ ok: true, image: { mime: "image/png", bytes: png.length } });
    expect(parseImageDataUrl(url("image/jpeg", jpeg))).toMatchObject({ ok: true, image: { mime: "image/jpeg" } });
    expect(parseImageDataUrl(url("image/webp", webp))).toMatchObject({ ok: true, image: { mime: "image/webp" } });
  });

  it("refuse les préfixes, types et encodages non conformes", () => {
    const bad = [
      undefined,
      42,
      "",
      "https://exemple.fr/image.png",
      url("image/gif", png),
      url("image/svg+xml", Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>".padEnd(80))),
      url("text/html", png),
      url("image/PNG", png),
      `data:image/png;charset=utf-8;base64,${png.toString("base64")}`,
      `data:image/png,${png.toString("base64")}`,
      ` ${url("image/png", png)}`,
      `${url("image/png", png)}\n`,
      `${url("image/png", png)}#fragment`,
      `data:image/png;base64,${png.toString("base64").slice(0, 20)}*${png.toString("base64").slice(21)}`,
      `data:image/png;base64,${png.toString("base64").slice(0, 20)} ${png.toString("base64").slice(21)}`,
      `data:image/png;base64,${png.toString("base64url").replace(/=+$/, "")}x`,
      `data:image/png;base64,`,
      `data:image/png;base64,AAA`, // longueur non multiple de 4
    ];
    for (const value of bad) expect(parseImageDataUrl(value), String(value).slice(0, 60)).toMatchObject({ ok: false, error: "invalid" });
  });

  it("vérifie les octets magiques : le contenu doit correspondre au type annoncé", () => {
    expect(parseImageDataUrl(url("image/png", jpeg))).toMatchObject({ ok: false, error: "invalid" });
    expect(parseImageDataUrl(url("image/jpeg", png))).toMatchObject({ ok: false, error: "invalid" });
    expect(parseImageDataUrl(url("image/webp", png))).toMatchObject({ ok: false, error: "invalid" });
    expect(parseImageDataUrl(url("image/png", Buffer.from("<html><script>alert(1)</script></html>".padEnd(80))))).toMatchObject({ ok: false, error: "invalid" });
    expect(parseImageDataUrl(url("image/webp", Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WAVE"), Buffer.alloc(40)])))).toMatchObject({ ok: false });
    expect(parseImageDataUrl(url("image/png", png.subarray(0, 8)))).toMatchObject({ ok: false, error: "invalid" });
  });

  it("borne la taille décodée", () => {
    const max = Buffer.concat([jpeg.subarray(0, 4), Buffer.alloc(LIMITS.maxImageBytes - 4, 1)]);
    expect(parseImageDataUrl(url("image/jpeg", max))).toMatchObject({ ok: true, image: { bytes: LIMITS.maxImageBytes } });
    const over = Buffer.concat([max, Buffer.from([1])]);
    expect(parseImageDataUrl(url("image/jpeg", over))).toMatchObject({ ok: false, error: "image_too_big" });
    const huge = Buffer.concat([jpeg.subarray(0, 4), Buffer.alloc(2_000_000, 1)]);
    expect(parseImageDataUrl(url("image/jpeg", huge))).toMatchObject({ ok: false, error: "image_too_big" });
  });
});

describe("deux instances serveur, un cache partagé, écritures entrelacées", () => {
  /**
   * Chaque client se comporte comme le front : il interroge une instance au
   * hasard chaque « seconde » et renvoie son action tant que la vue ne la
   * reflète pas. Les deux instances lisent/écrivent le même faux cache avec
   * des délais aléatoires : des écritures se perdent, et pourtant tout converge.
   */
  async function simulate(seed: number, players: number, sharedMaxStaleMs: number) {
    const rand = mulberry32(seed);
    const clock = { now: 1_800_000_000_000 };
    const shared = new SlowSharedKV(rand);
    const mk = (): ServiceDeps => ({
      store: new RoomStore({ local: new MemoryKV({ now: () => clock.now }), shared, now: () => clock.now, sharedMaxStaleMs }),
      catalog,
      now: () => clock.now,
    });
    const instances = [mk(), mk()];
    const pick = () => instances[Math.floor(rand() * instances.length)];
    const statuses = new Map<string, number>();
    const count = (res: HttpResult) => {
      const key = res.status === 200 ? "200" : `${res.status}:${(res.body as { error: string }).error}`;
      statuses.set(key, (statuses.get(key) ?? 0) + 1);
      return res;
    };

    const created = body<JoinResponse>(await createRoomRequest(instances[0], { name: "Hôte", avatar: "fox" }));
    const code = created.code;
    interface Client {
      name: string;
      token: string;
      host: boolean;
      view: RoomView | null;
      rejoins: number;
    }
    const clients: Client[] = [{ name: "Hôte", token: created.token, host: true, view: created.state, rejoins: 0 }];
    for (let i = 1; i < players; i++) {
      // le client choisit lui-même son jeton (fort) : "join" est alors rejouable sans créer de doublon
      clients.push({ name: `Élève ${i}`, token: `client-${i}-${"x".repeat(40)}`, host: false, view: null, rejoins: 0 });
    }

    const post = (c: Client, action: ActionRequest) => actionRequest(pick(), code, { ...action, token: c.token }).then(count);

    async function step(c: Client): Promise<void> {
      const res = count(await getRoomRequest(pick(), code, c.token, c.view ? String(c.view.version) : null));
      if (res.status === 401) {
        // jeton inconnu de cette instance (join pas encore fait, ou perdu dans une course) : on (re)joint
        c.rejoins += 1;
        const joined = await post(c, { type: "join", name: c.name, avatar: "cat" });
        if (joined.status === 200) expect(body<ActionResponse>(joined).token).toBe(c.token);
        return;
      }
      expect(res.status).toBe(200);
      if (!body<UnchangedResponse>(res).unchanged) c.view = body<RoomView>(res);
      const view = c.view;
      if (!view || !view.me) return;
      if (view.phase === "lobby") {
        if (view.me.isHost && view.players.length === players) await post(c, { type: "start" });
      } else if (view.phase === "create" && view.create) {
        const tpl = view.create.forcedTemplateId ?? view.create.hands[0]?.[0];
        if (tpl && !view.create.submitted) await post(c, { type: "submit", meme: memeFor(tpl, `mème de ${c.name}`) });
      } else if (view.phase === "vote" && view.vote) {
        if (!view.vote.isMine && view.vote.myVote === null) await post(c, { type: "vote", memeId: view.vote.memeId, score: 2 });
      }
    }

    // réglages par l'hôte (rejoués jusqu'à ce que la vue les reflète)
    for (let i = 0; i < 20; i++) {
      const res = await post(clients[0], { type: "settings", patch: { rounds: 2, createSeconds: 60, voteSeconds: 10 } });
      if (res.status === 200 && body<ActionResponse>(res).state.settings.rounds === 2) break;
    }

    let seconds = 0;
    const phaseOf = async (deps: ServiceDeps) => body<RoomView>(await getRoomRequest(deps, code, null, null));
    for (; seconds < 1500; seconds++) {
      clock.now += 1_000;
      // tous les clients agissent EN MÊME TEMPS, sur des instances tirées au hasard
      await Promise.all(clients.map((c) => step(c)));
      if (clients.every((c) => c.view?.phase === "final")) break;
    }

    // quelques sondages calmes pour laisser les deux instances se resynchroniser
    for (let i = 0; i < 3; i++) {
      clock.now += 1_000;
      for (const deps of instances) await phaseOf(deps);
    }
    clock.now += 1_000;
    const [viewA, viewB] = [await phaseOf(instances[0]), await phaseOf(instances[1])];
    return { viewA, viewB, clients, statuses, seconds, instances, players };
  }

  for (const [seed, players, stale] of [
    [1, 6, 0],
    [2, 10, 400],
    [3, 12, 400],
    [4, 4, 5_000],
  ] as const) {
    it(`graine ${seed}, ${players} joueurs, fenêtre de lecture ${stale} ms : l'état converge jusqu'au podium`, async () => {
      const { viewA, viewB, clients, statuses, seconds, instances } = await simulate(seed, players, stale);
      expect(seconds).toBeLessThan(1500);
      expect(viewA.phase).toBe("final");
      // les deux instances racontent exactement la même histoire
      expect({ ...viewA, now: 0 }).toEqual({ ...viewB, now: 0 });
      // tout le monde est là, une seule fois, malgré les joins rejoués
      expect(viewA.players).toHaveLength(players);
      expect(new Set(viewA.players.map((p) => p.name)).size).toBe(players);
      expect(viewA.players.map((p) => p.name).sort()).toEqual(clients.map((c) => c.name).sort());
      // la partie est cohérente : scores = somme des points des mèmes de la galerie
      const gallery = viewA.final!.gallery;
      expect(gallery.length).toBeGreaterThanOrEqual(players); // au moins une manche complète de mèmes
      expect(gallery.length).toBeLessThanOrEqual(players * 2);
      for (const p of viewA.players) {
        expect(p.score).toBe(gallery.filter((m) => m.authorId === p.id).reduce((a, m) => a + m.points, 0));
      }
      for (const m of gallery) {
        expect(m.breakdown.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(players - 1);
        expect(m.points).toBe(2 * m.breakdown[2]);
      }
      // aucune erreur serveur, uniquement des refus attendus
      for (const key of statuses.keys()) expect(["200", "401:bad_token", "409:bad_phase"]).toContain(key);
      // le scénario a bien provoqué des entrelacements entre instances
      expect(instances[0].store.stats.adopted + instances[1].store.stats.adopted).toBeGreaterThan(10);
    });
  }
});
