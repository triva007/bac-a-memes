/**
 * Tests de bout en bout des handlers de route (appelés directement avec des
 * objets Request, sans serveur). Le catalogue réel est remplacé par un faux
 * (le registre de gabarits est rempli par ailleurs), l'horloge est factice.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as diagGET } from "@/app/api/diag/route";
import { DELETE as imageDELETE, GET as imageGET } from "@/app/api/rooms/[code]/images/[id]/route";
import { POST as imagesPOST } from "@/app/api/rooms/[code]/images/route";
import { GET as roomGET, POST as roomPOST } from "@/app/api/rooms/[code]/route";
import { POST as roomsPOST } from "@/app/api/rooms/route";
import { toTemplateMeta } from "./catalog";
import { fakeCatalog, memeFor } from "./testkit";
import {
  LIMITS,
  type ActionResponse,
  type AddImageResponse,
  type ApiError,
  type JoinResponse,
  type RoomView,
  type UnchangedResponse,
} from "./types";

vi.mock("@/lib/templates", () => ({ TEMPLATES: [] }));
vi.mock("./catalog", async (importOriginal) => {
  const original = await importOriginal<typeof import("./catalog")>();
  const { fakeCatalog: make } = await import("./testkit");
  const catalog = make();
  return { ...original, getCatalog: () => catalog };
});

const BASE = "http://localhost/api/rooms";
const T0 = 1_900_000_000_000;

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
});
afterAll(() => {
  vi.useRealTimers();
});
beforeEach(() => {
  vi.setSystemTime(T0 + Math.floor(Math.random() * 1000) * 1_000_000);
});

function advance(ms: number): void {
  vi.setSystemTime(Date.now() + ms);
}

function jsonRequest(url: string, payload: unknown, method = "POST"): Request {
  return new Request(url, { method, headers: { "content-type": "application/json" }, body: typeof payload === "string" ? payload : JSON.stringify(payload) });
}

const ctx = (code: string) => ({ params: Promise.resolve({ code }) });
const imgCtx = (code: string, id: string) => ({ params: Promise.resolve({ code, id }) });

async function createRoom(name = "Mme Dupont") {
  const res = await roomsPOST(jsonRequest(BASE, { name, avatar: "fox" }));
  expect(res.status).toBe(200);
  return (await res.json()) as JoinResponse;
}

async function poll(code: string, token?: string | null, v?: number) {
  const params = new URLSearchParams();
  if (token) params.set("token", token);
  if (v !== undefined) params.set("v", String(v));
  const res = await roomGET(new Request(`${BASE}/${code}?${params}`), ctx(code));
  return { status: res.status, headers: res.headers, body: (await res.json()) as RoomView & UnchangedResponse & ApiError };
}

async function act(code: string, payload: Record<string, unknown>) {
  const res = await roomPOST(jsonRequest(`${BASE}/${code}`, payload), ctx(code));
  return { status: res.status, headers: res.headers, body: (await res.json()) as ActionResponse & ApiError };
}

async function join(code: string, name: string, token?: string) {
  const res = await act(code, { type: "join", name, avatar: "cat", ...(token ? { token } : {}) });
  expect(res.status).toBe(200);
  return res.body as Required<ActionResponse>;
}

describe("POST /api/rooms", () => {
  it("crée une salle et renvoie code, playerId, token et la vue de l'hôte", async () => {
    const res = await roomsPOST(jsonRequest(BASE, { name: "  Mme   Dupont ", avatar: "fox" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    const body = (await res.json()) as JoinResponse;
    expect(body.code).toMatch(/^[A-HJ-NP-Z]{4}$/);
    expect(body.token.length).toBeGreaterThanOrEqual(32);
    expect(body.playerId).toBeTruthy();
    expect(body.token).not.toContain(body.playerId);
    expect(body.state).toMatchObject({ code: body.code, phase: "lobby", hostId: body.playerId, me: { id: body.playerId, isHost: true }, now: Date.now() });
    expect(body.state.players).toEqual([expect.objectContaining({ name: "Mme Dupont", avatar: "fox", isHost: true, connected: true })]);
    expect(JSON.stringify(body.state)).not.toContain(body.token);
  });

  it("codes et jetons différents à chaque création", async () => {
    const rooms = await Promise.all(Array.from({ length: 12 }, () => createRoom()));
    expect(new Set(rooms.map((r) => r.code)).size).toBe(12);
    expect(new Set(rooms.map((r) => r.token)).size).toBe(12);
  });

  it("JSON invalide, nom manquant ou corps trop gros : 400 invalid", async () => {
    for (const payload of ["{pas du json", "null", "[]", JSON.stringify({ avatar: "fox" }), JSON.stringify({ name: "   ", avatar: "fox" }), JSON.stringify({ name: 12 })]) {
      const res = await roomsPOST(jsonRequest(BASE, payload));
      expect(res.status).toBe(400);
      expect(((await res.json()) as ApiError).error).toBe("invalid");
      expect(res.headers.get("cache-control")).toContain("no-store");
    }
    const big = await roomsPOST(jsonRequest(BASE, { name: "x", avatar: "fox", bourrage: "a".repeat(40_000) }));
    expect(big.status).toBe(400);
    expect(((await big.json()) as ApiError).error).toBe("invalid");
    // sans en-tête content-length (corps en flux) : même refus
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(`{"name":"x","avatar":"fox","b":"${"a".repeat(40_000)}"}`));
        controller.close();
      },
    });
    const streamed = await roomsPOST(new Request(BASE, { method: "POST", body: stream, duplex: "half" } as RequestInit));
    expect(streamed.status).toBe(400);
  });
});

describe("GET /api/rooms/[code]", () => {
  it("spectateur sans token ; code insensible à la casse ; no-store", async () => {
    const room = await createRoom();
    const res = await poll(room.code.toLowerCase());
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(res.body).toMatchObject({ code: room.code, phase: "lobby", me: null });
    expect(JSON.stringify(res.body)).not.toContain(room.token);
    expect((await poll(` ${room.code} `)).status).toBe(200);
  });

  it("salle inconnue ou code mal formé : 404 room_not_found", async () => {
    for (const code of ["ZZZZ", "abc", "TROPLONG", "AB-D", "%20"]) {
      const res = await poll(code);
      expect(res.status).toBe(404);
      expect(res.body.error).toBe("room_not_found");
      expect(typeof res.body.message).toBe("string");
    }
  });

  it("avec token : vue du joueur ; mauvais token : 401 bad_token", async () => {
    const room = await createRoom();
    expect((await poll(room.code, room.token)).body.me).toMatchObject({ id: room.playerId, isHost: true });
    const bad = await poll(room.code, "x".repeat(40));
    expect(bad.status).toBe(401);
    expect(bad.body.error).toBe("bad_token");
    expect((await poll(room.code, "undefined")).status).toBe(401);
  });

  it("GET conditionnel : `v` à jour -> réponse minuscule ; sinon vue complète", async () => {
    const room = await createRoom();
    const full = await poll(room.code, room.token);
    const v = full.body.version;
    advance(1_000);
    const same = await poll(room.code, room.token, v);
    expect(same.status).toBe(200);
    expect(same.body).toEqual({ unchanged: true, version: v, now: Date.now() });
    expect(JSON.stringify(same.body).length).toBeLessThan(80);
    // version périmée ou farfelue : vue complète
    expect((await poll(room.code, room.token, v - 1)).body.phase).toBe("lobby");
    const weird = await roomGET(new Request(`${BASE}/${room.code}?v=abc`), ctx(room.code));
    expect(((await weird.json()) as RoomView).phase).toBe("lobby");
    // quelqu'un rejoint : la version change, la vue complète revient
    await join(room.code, "Léa");
    const changed = await poll(room.code, room.token, v);
    expect(changed.body.unchanged).toBeUndefined();
    expect(changed.body.version).toBeGreaterThan(v);
    expect(changed.body.players).toHaveLength(2);
    // le spectateur a sa propre version
    const tv = await poll(room.code);
    expect((await poll(room.code, null, tv.body.version)).body.unchanged).toBe(true);
  });
});

describe("POST /api/rooms/[code]", () => {
  it("join : renvoie playerId + token ; rejouer avec le même token ne crée pas de doublon", async () => {
    const room = await createRoom();
    const lea = await join(room.code, "Léa");
    expect(lea.playerId).not.toBe(room.playerId);
    expect(lea.token).not.toBe(room.token);
    expect(lea.state.me).toEqual({ id: lea.playerId, isHost: false, jokersLeft: 1 });
    const again = await join(room.code, "Léa", lea.token);
    expect(again).toMatchObject({ playerId: lea.playerId, token: lea.token });
    expect(again.state.players).toHaveLength(2);
    // sans token : c'est une autre personne (nom rendu unique)
    const other = await join(room.code, "Léa");
    expect(other.state.players.map((p) => p.name)).toEqual(["Mme Dupont", "Léa", "Léa 2"]);
  });

  it("join avec un jeton fort choisi par le client : adopté, donc rejouable même si la réponse s'est perdue", async () => {
    const room = await createRoom();
    const mine = `jeton-client-${"k".repeat(32)}`;
    const first = await join(room.code, "Tom", mine);
    expect(first.token).toBe(mine);
    const retry = await join(room.code, "Tom", mine);
    expect(retry.playerId).toBe(first.playerId);
    expect(retry.state.players).toHaveLength(2);
    expect((await poll(room.code, mine)).body.me?.id).toBe(first.playerId);
    // un jeton trop court n'est pas adopté : le serveur en génère un
    const weak = await join(room.code, "Zoé", "court-mais-valide-1234");
    expect(weak.token).not.toBe("court-mais-valide-1234");
    expect(weak.token.length).toBeGreaterThanOrEqual(32);
  });

  it("erreurs : salle inconnue 404, JSON invalide 400, action inconnue 400, corps trop gros 400, sans token 401", async () => {
    const room = await createRoom();
    expect((await act("ZZZZ", { type: "join", name: "x", avatar: "cat" })).status).toBe(404);
    const garbage = await roomPOST(jsonRequest(`${BASE}/${room.code}`, "{{{"), ctx(room.code));
    expect(garbage.status).toBe(400);
    expect(((await garbage.json()) as ApiError).error).toBe("invalid");
    for (const payload of [{ type: "danser" }, {}, { type: "vote", memeId: "m", score: 7 }, { type: "kick" }, { type: "join" }, { type: "settings", patch: "x" }, { type: "submit", meme: null }]) {
      const res = await act(room.code, { ...payload, token: room.token });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("invalid");
    }
    const big = await act(room.code, { type: "join", name: "x", avatar: "cat", bourrage: "a".repeat(33_000) });
    expect(big.status).toBe(400);
    const anonymous = await act(room.code, { type: "start" });
    expect(anonymous.status).toBe(401);
    expect(anonymous.body.error).toBe("bad_token");
    expect((await act(room.code, { type: "start", token: "y".repeat(40) })).status).toBe(401);
    expect((await act(room.code, { type: "join", name: " ", avatar: "cat" })).status).toBe(400);
  });

  it("droits et phases : not_host 403, bad_phase 409, invalid 400", async () => {
    const room = await createRoom();
    const lea = await join(room.code, "Léa");
    const notHost = await act(room.code, { type: "start", token: lea.token });
    expect(notHost.status).toBe(403);
    expect(notHost.body.error).toBe("not_host");
    const badPhase = await act(room.code, { type: "unsubmit", token: lea.token });
    expect(badPhase.status).toBe(409);
    expect(badPhase.body.error).toBe("bad_phase");
    const settings = await act(room.code, { type: "settings", token: room.token, patch: { rounds: 1, createSeconds: 30, voteSeconds: 6 } });
    expect(settings.body.state.settings).toMatchObject({ rounds: 1, createSeconds: 30, voteSeconds: 6 });
    const started = await act(room.code, { type: "start", token: room.token });
    expect(started.body.state.phase).toBe("create");
    const outside = await act(room.code, { type: "submit", token: lea.token, meme: memeFor("gabarit-inconnu") });
    expect(outside.status).toBe(400);
    expect(outside.body.error).toBe("invalid");
  });

  it("kick : 403 kicked ensuite, en GET comme en POST ; leave reste idempotent", async () => {
    const room = await createRoom();
    const lea = await join(room.code, "Léa");
    const tom = await join(room.code, "Tom");
    const kicked = await act(room.code, { type: "kick", token: room.token, playerId: lea.playerId });
    expect(kicked.body.state.players.map((p) => p.name)).toEqual(["Mme Dupont", "Tom"]);
    const get = await poll(room.code, lea.token);
    expect(get.status).toBe(403);
    expect(get.body.error).toBe("kicked");
    const post = await act(room.code, { type: "join", name: "Léa", avatar: "cat", token: lea.token });
    expect(post.status).toBe(403);
    expect(post.body.error).toBe("kicked");
    // leave : une fois, deux fois, même sans jeton connu -> toujours ok, vue spectateur
    const left = await act(room.code, { type: "leave", token: tom.token });
    expect(left.status).toBe(200);
    expect(left.body.state.me).toBeNull();
    expect(left.body.state.players).toHaveLength(1);
    expect((await act(room.code, { type: "leave", token: tom.token })).status).toBe(200);
    expect((await act(room.code, { type: "leave", token: lea.token })).status).toBe(200);
    expect((await poll(room.code, tom.token)).status).toBe(401);
  });

  it("une partie entière par les routes : minuteurs, votes, podium, rejouer", async () => {
    const room = await createRoom();
    const code = room.code;
    const players = [{ id: room.playerId, token: room.token }];
    for (const name of ["Léa", "Tom", "Inès"]) {
      const j = await join(code, name);
      players.push({ id: j.playerId, token: j.token });
    }
    await act(code, { type: "settings", token: room.token, patch: { rounds: 2, createSeconds: 30, voteSeconds: 10, mode: "theme" } });
    const started = await act(code, { type: "start", token: room.token });
    expect(started.body.state).toMatchObject({ phase: "create", round: 1, totalRounds: 2, phaseEndsAt: Date.now() + 30_000 });

    const seen = new Set<string>();
    let guard = 0;
    let view = (await poll(code)).body as RoomView;
    while (view.phase !== "final") {
      expect(guard++).toBeLessThan(600);
      advance(1_000);
      for (const p of players) {
        const mine = (await poll(code, p.token)).body as RoomView;
        seen.add(mine.phase);
        if (mine.phase === "create" && mine.create && !mine.create.submitted) {
          expect(mine.create.theme).toBeTruthy();
          expect(mine.create.hands).toHaveLength(3);
          // deux joueurs valident, un laisse un brouillon, un ne fait rien
          if (p === players[0] || p === players[1]) {
            const res = await act(code, { type: "submit", token: p.token, meme: memeFor(mine.create.hands[0][0], `mème de ${p.id}`) });
            expect(res.body.state.create?.submitted).toBe(true);
          } else if (p === players[2] && !mine.create.myMeme) {
            await act(code, { type: "draft", token: p.token, meme: memeFor(mine.create.hands[1][0], "brouillon") });
          }
        } else if (mine.phase === "vote" && mine.vote && !mine.vote.isMine && mine.vote.myVote === null) {
          expect(mine.vote.result).toBeNull();
          const res = await act(code, { type: "vote", token: p.token, memeId: mine.vote.memeId, score: 3 });
          expect(res.status).toBe(200);
        }
      }
      view = (await poll(code)).body as RoomView;
    }
    expect([...seen].sort()).toEqual(["create", "final", "results", "reveal", "vote"]);
    expect(view.final!.gallery).toHaveLength(6); // 3 mèmes (2 validés + 1 brouillon) x 2 manches
    expect(view.final!.gallery.every((m) => m.points === 9)).toBe(true);
    expect(view.players.map((p) => p.score)).toEqual([18, 18, 18, 0]);
    expect(view.final!.ranking).toHaveLength(4);
    expect(view.final!.awards.length).toBeGreaterThan(0);
    for (const p of players) expect(JSON.stringify(view)).not.toContain(p.token);

    const again = await act(code, { type: "again", token: room.token });
    expect(again.body.state).toMatchObject({ phase: "lobby", round: 0 });
    expect(again.body.state.players.every((p) => p.score === 0)).toBe(true);
  });

  it("rejoindre en cours de partie : on vote tout de suite, on crée à la manche suivante", async () => {
    const room = await createRoom();
    const lea = await join(room.code, "Léa");
    await act(room.code, { type: "start", token: room.token });
    const late = await join(room.code, "Retardataire");
    expect(late.state.phase).toBe("create");
    expect(late.state.me?.id).toBe(late.playerId);
    expect(late.state.create).toMatchObject({ hands: [], situations: [], submitted: false, myMeme: null, totalPlayers: 2 });
    for (const p of [room, lea]) {
      const mine = (await poll(room.code, p.token)).body as RoomView;
      await act(room.code, { type: "submit", token: p.token, meme: memeFor(mine.create!.hands[0][0]) });
    }
    const voting = (await poll(room.code, late.token)).body as RoomView;
    expect(voting.phase).toBe("vote");
    expect(voting.vote).toMatchObject({ isMine: false, myVote: null });
    const voted = await act(room.code, { type: "vote", token: late.token, memeId: voting.vote!.memeId, score: 2 });
    expect(voted.body.state.vote?.myVote).toBe(2);
  });
});

// ---------------------------------------------------------------- pack perso

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from("contenu de test png".repeat(20))]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from("contenu de test jpeg".repeat(20))]);
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.from([9, 9, 9, 9]), Buffer.from("WEBP"), Buffer.from("contenu webp".repeat(20))]);
const dataUrl = (mime: string, buf: Buffer) => `data:${mime};base64,${buf.toString("base64")}`;

async function upload(code: string, payload: Record<string, unknown>) {
  const res = await imagesPOST(jsonRequest(`${BASE}/${code}/images`, payload), ctx(code));
  return { status: res.status, headers: res.headers, body: (await res.json()) as AddImageResponse & ApiError };
}

async function fetchImage(code: string, id: string) {
  return imageGET(new Request(`${BASE}/${code}/images/${id}`), imgCtx(code, id));
}

async function deleteImage(code: string, id: string, token?: string) {
  const res = await imageDELETE(new Request(`${BASE}/${code}/images/${id}${token ? `?token=${token}` : ""}`, { method: "DELETE" }), imgCtx(code, id));
  return { status: res.status, body: (await res.json()) as ActionResponse & ApiError };
}

describe("pack perso : routes images", () => {
  it("POST : ajoute l'image, la liste dans la vue, sans jamais y mettre les octets", async () => {
    const room = await createRoom();
    const lea = await join(room.code, "Léa");
    const before = (await poll(room.code)).body.version;
    const res = await upload(room.code, { token: lea.token, dataUrl: dataUrl("image/png", PNG), w: 800, h: 600 });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(res.body.ok).toBe(true);
    expect(res.body.image).toEqual({ id: expect.stringMatching(/^[a-f0-9]{24}$/), w: 800, h: 600, by: lea.playerId, byName: "Léa" });
    expect(res.body.state.images).toEqual([res.body.image]);
    expect(res.body.state.me?.id).toBe(lea.playerId);
    const view = (await poll(room.code)).body;
    expect(view.version).toBeGreaterThan(before);
    expect(view.images).toEqual([res.body.image]);
    expect(JSON.stringify(view)).not.toContain(PNG.toString("base64").slice(0, 40));
    // ids non devinables : tous différents
    const second = await upload(room.code, { token: lea.token, dataUrl: dataUrl("image/png", PNG), w: 800, h: 600 });
    expect(second.body.image.id).not.toBe(res.body.image.id);
  });

  it("GET : renvoie les octets exacts, le bon type, nosniff et un cache immuable d'un an — sans token", async () => {
    const room = await createRoom();
    for (const [mime, buf] of [
      ["image/png", PNG],
      ["image/jpeg", JPEG],
      ["image/webp", WEBP],
    ] as const) {
      const added = await upload(room.code, { token: room.token, dataUrl: dataUrl(mime, buf), w: 1000, h: 750 });
      expect(added.status).toBe(200);
      const res = await fetchImage(room.code.toLowerCase(), added.body.image.id);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe(mime);
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
      expect(res.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
      expect(res.headers.get("content-length")).toBe(String(buf.length));
      expect(Buffer.from(await res.arrayBuffer()).equals(buf)).toBe(true);
    }
  });

  it("GET : 404 image_not_found si l'image, la salle ou l'id n'existent pas", async () => {
    const room = await createRoom();
    for (const [code, id] of [
      [room.code, "0123456789abcdef01234567"],
      ["ZZZZ", "0123456789abcdef01234567"],
      [room.code, "../../etc/passwd"],
      [room.code, "ABCDEF0123456789"],
    ]) {
      const res = await fetchImage(code, id);
      expect(res.status).toBe(404);
      expect(((await res.json()) as ApiError).error).toBe("image_not_found");
      expect(res.headers.get("cache-control")).toContain("no-store");
    }
  });

  it("POST : data URL, dimensions et jeton validés", async () => {
    const room = await createRoom();
    const ok = { token: room.token, dataUrl: dataUrl("image/jpeg", JPEG), w: 640, h: 480 };
    const cases: [Record<string, unknown>, number, string][] = [
      [{ ...ok, dataUrl: dataUrl("image/gif", JPEG) }, 400, "invalid"],
      [{ ...ok, dataUrl: dataUrl("image/png", JPEG) }, 400, "invalid"],
      [{ ...ok, dataUrl: "data:image/jpeg;base64,@@@@" }, 400, "invalid"],
      [{ ...ok, dataUrl: undefined }, 400, "invalid"],
      [{ ...ok, w: 49 }, 400, "invalid"],
      [{ ...ok, h: 4001 }, 400, "invalid"],
      [{ ...ok, w: 640.5 }, 400, "invalid"],
      [{ ...ok, w: "640" }, 400, "invalid"],
      [{ ...ok, h: undefined }, 400, "invalid"],
      [{ ...ok, token: undefined }, 401, "bad_token"],
      [{ ...ok, token: "z".repeat(40) }, 401, "bad_token"],
    ];
    for (const [payload, status, error] of cases) {
      const res = await upload(room.code, payload);
      expect([res.status, res.body.error]).toEqual([status, error]);
    }
    expect((await upload("ZZZZ", ok)).status).toBe(404);
    const garbage = await imagesPOST(jsonRequest(`${BASE}/${room.code}/images`, "pas du json"), ctx(room.code));
    expect(garbage.status).toBe(400);
    expect((await poll(room.code)).body.images).toEqual([]);
    expect((await upload(room.code, ok)).status).toBe(200);
  });

  it("POST : image trop lourde -> 413 image_too_big ; la limite de corps (~520 Ko) ne vaut que pour cette route", async () => {
    const room = await createRoom();
    const justOk = Buffer.concat([JPEG.subarray(0, 4), Buffer.alloc(LIMITS.maxImageBytes - 4, 65)]);
    const accepted = await upload(room.code, { token: room.token, dataUrl: dataUrl("image/jpeg", justOk), w: 1000, h: 1000 });
    expect(accepted.status).toBe(200);
    const stored = await fetchImage(room.code, accepted.body.image.id);
    expect(Buffer.from(await stored.arrayBuffer()).length).toBe(LIMITS.maxImageBytes);

    const tooBig = Buffer.concat([justOk, Buffer.alloc(10, 65)]);
    const refused = await upload(room.code, { token: room.token, dataUrl: dataUrl("image/jpeg", tooBig), w: 1000, h: 1000 });
    expect([refused.status, refused.body.error]).toEqual([413, "image_too_big"]);
    const enormous = await upload(room.code, { token: room.token, dataUrl: dataUrl("image/jpeg", Buffer.alloc(900_000, 65)), w: 1000, h: 1000 });
    expect([enormous.status, enormous.body.error]).toEqual([413, "image_too_big"]);
    // la route d'actions, elle, reste limitée à 32 Ko
    const action = await act(room.code, { type: "leave", token: room.token, bourrage: "a".repeat(100_000) });
    expect(action.status).toBe(400);
    expect((await poll(room.code)).body.images).toHaveLength(1);
  });

  it("droits : uploads off / host ; limite par joueur", async () => {
    const room = await createRoom();
    const lea = await join(room.code, "Léa");
    const img = { dataUrl: dataUrl("image/webp", WEBP), w: 500, h: 500 };
    await act(room.code, { type: "settings", token: room.token, patch: { uploads: "host" } });
    const notHost = await upload(room.code, { ...img, token: lea.token });
    expect([notHost.status, notHost.body.error]).toEqual([403, "not_host"]);
    expect((await upload(room.code, { ...img, token: room.token })).status).toBe(200);
    await act(room.code, { type: "settings", token: room.token, patch: { uploads: "off" } });
    for (const token of [lea.token, room.token]) {
      const res = await upload(room.code, { ...img, token });
      expect([res.status, res.body.error]).toEqual([403, "uploads_off"]);
    }
    await act(room.code, { type: "settings", token: room.token, patch: { uploads: "all" } });
    for (let i = 0; i < LIMITS.maxImagesPerPlayer; i++) expect((await upload(room.code, { ...img, token: lea.token })).status).toBe(200);
    const tooMany = await upload(room.code, { ...img, token: lea.token });
    expect([tooMany.status, tooMany.body.error]).toEqual([409, "too_many_images"]);
    expect((await poll(room.code)).body.images).toHaveLength(1 + LIMITS.maxImagesPerPlayer);
    // un joueur expulsé ne peut plus rien ajouter
    await act(room.code, { type: "kick", token: room.token, playerId: lea.playerId });
    const kicked = await upload(room.code, { ...img, token: lea.token });
    expect([kicked.status, kicked.body.error]).toEqual([403, "kicked"]);
    // ... mais ses images restent
    expect((await poll(room.code)).body.images).toHaveLength(1 + LIMITS.maxImagesPerPlayer);
  });

  it("DELETE : hôte ou auteur ; l'image n'est plus servie ensuite", async () => {
    const room = await createRoom();
    const lea = await join(room.code, "Léa");
    const tom = await join(room.code, "Tom");
    const img = { dataUrl: dataUrl("image/png", PNG), w: 500, h: 500 };
    const a = (await upload(room.code, { ...img, token: lea.token })).body.image.id;
    const b = (await upload(room.code, { ...img, token: lea.token })).body.image.id;

    const stranger = await deleteImage(room.code, a, tom.token);
    expect([stranger.status, stranger.body.error]).toEqual([403, "not_host"]);
    const anonymous = await deleteImage(room.code, a);
    expect([anonymous.status, anonymous.body.error]).toEqual([401, "bad_token"]);
    expect((await fetchImage(room.code, a)).status).toBe(200);

    const byAuthor = await deleteImage(room.code, a, lea.token);
    expect(byAuthor.status).toBe(200);
    expect(byAuthor.body).toMatchObject({ ok: true, state: { me: { id: lea.playerId } } });
    expect(byAuthor.body.state.images.map((i) => i.id)).toEqual([b]);
    expect((await fetchImage(room.code, a)).status).toBe(404);

    const byHost = await deleteImage(room.code, b, room.token);
    expect(byHost.status).toBe(200);
    expect(byHost.body.state.images).toEqual([]);
    const gone = await deleteImage(room.code, b, room.token);
    expect([gone.status, gone.body.error]).toEqual([404, "image_not_found"]);
    expect((await deleteImage("ZZZZ", b, room.token)).status).toBe(404);
    expect((await deleteImage(room.code, "pas-un-id", room.token)).status).toBe(404);
  });

  it("une image perso se joue comme un gabarit : distribuée, légendée, votée", async () => {
    const room = await createRoom();
    const lea = await join(room.code, "Léa");
    const img = { dataUrl: dataUrl("image/jpeg", JPEG), w: 900, h: 700 };
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) ids.push((await upload(room.code, { ...img, token: lea.token })).body.image.id);
    await act(room.code, { type: "settings", token: room.token, patch: { categories: ["perso"], handSize: 3, rerolls: 0, rounds: 1 } });
    await act(room.code, { type: "start", token: room.token });
    for (const p of [room, lea]) {
      const mine = (await poll(room.code, p.token)).body as RoomView;
      expect([...mine.create!.hands[0]].sort()).toEqual(ids.map((id) => `perso:${id}`).sort());
      const res = await act(room.code, { type: "submit", token: p.token, meme: { templateId: mine.create!.hands[0][0], values: { haut: "en haut", bas: "en bas" }, stickers: [] } });
      expect(res.status).toBe(200);
    }
    const voting = (await poll(room.code)).body as RoomView;
    expect(voting.phase).toBe("vote");
    expect(voting.vote!.meme.templateId).toMatch(/^perso:[a-f0-9]{24}$/);
    expect(voting.vote!.meme.values).toEqual({ haut: "en haut", bas: "en bas" });
  });
});

describe("robots par les routes", () => {
  it("addBots / removeBots : vue avec isBot, lancement possible à 1 humain + robots, formes invalides refusées", async () => {
    const room = await createRoom();
    const alone = await act(room.code, { type: "start", token: room.token });
    expect(alone.status).toBe(400);
    const added = await act(room.code, { type: "addBots", token: room.token, count: 3 });
    expect(added.status).toBe(200);
    expect(added.body.state.players.map((p) => p.isBot)).toEqual([false, true, true, true]);
    expect((await act(room.code, { type: "addBots", token: room.token })).status).toBe(400);
    expect((await act(room.code, { type: "addBots", token: room.token, count: "3" })).status).toBe(400);
    const lea = await join(room.code, "Léa");
    expect((await act(room.code, { type: "addBots", token: lea.token, count: 1 })).status).toBe(403);
    const removed = await act(room.code, { type: "removeBots", token: room.token });
    expect(removed.body.state.players.every((p) => !p.isBot)).toBe(true);
    await act(room.code, { type: "leave", token: lea.token });
    await act(room.code, { type: "addBots", token: room.token, count: 2 });
    const started = await act(room.code, { type: "start", token: room.token });
    expect(started.body.state).toMatchObject({ phase: "create", create: { totalPlayers: 3 } });
    // les robots jouent pendant que l'humain interroge le serveur
    for (let i = 0; i < 45; i++) {
      advance(1_000);
      await poll(room.code, room.token);
    }
    const view = (await poll(room.code, room.token)).body as RoomView;
    expect(view.players.filter((p) => p.isBot && p.done)).toHaveLength(2);
    expect(view.phase).toBe("create");
  });
});

describe("GET /api/diag", () => {
  it("renvoie un rapport JSON 200 avec l'aller-retour de stockage", async () => {
    const res = await diagGET();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toMatchObject({ ok: true, kv: "memory", vercel: false, region: null, shared: null, templates: 30 });
    expect(body.instanceId).toMatch(/^[a-f0-9]{12}$/);
    expect(typeof body.instanceAgeMs).toBe("number");
    expect(body.local).toMatchObject({ ok: true, match: true });
    expect(typeof body.situations).toBe("number");
    const again = (await (await diagGET()).json()) as Record<string, unknown>;
    expect(again.instanceId).toBe(body.instanceId);
  });
});

describe("catalogue", () => {
  it("toTemplateMeta ne garde que id, catégorie et champs (id + maxLength), sans doublon", () => {
    const meta = toTemplateMeta([
      { id: "a", category: "ecole", fields: [{ id: "haut", label: "Haut", placeholder: "…", maxLength: 40, multiline: true }] },
      { id: "b", category: "cases", fields: [] },
      { id: "a", category: "ecole", fields: [] },
    ]);
    expect(meta).toEqual([
      { id: "a", category: "ecole", fields: [{ id: "haut", maxLength: 40 }] },
      { id: "b", category: "cases", fields: [] },
    ]);
    expect(fakeCatalog()).toHaveLength(30);
  });
});
