import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SfxName } from "../sfx";

/**
 * Faux WebAudio STRICT : il lève une exception pour tout ce qu'un vrai
 * navigateur refuserait (rampe exponentielle vers 0, valeur non finie, départ
 * dans le passé…), afin de vérifier que chaque son programme des valeurs valides.
 */
class FakeParam {
  value = 0;
  private check(v: number, t: number) {
    if (!Number.isFinite(v) || !Number.isFinite(t) || t < 0) throw new RangeError(`paramètre invalide ${v} @ ${t}`);
  }
  setValueAtTime(v: number, t: number) {
    this.check(v, t);
    return this;
  }
  exponentialRampToValueAtTime(v: number, t: number) {
    this.check(v, t);
    if (v <= 0) throw new RangeError("rampe exponentielle vers une valeur ≤ 0");
    return this;
  }
  linearRampToValueAtTime(v: number, t: number) {
    this.check(v, t);
    return this;
  }
}

class FakeNode {
  connected: unknown[] = [];
  connect(target: unknown) {
    if (!target) throw new TypeError("connect() sans destination");
    this.connected.push(target);
    return target;
  }
  disconnect() {}
}

interface Stats {
  contexts: number;
  oscillators: number;
  sources: number;
  starts: number;
  resumes: number;
  maxGain: number;
  lastEnd: number;
}

function installBrowser(opts: { state?: string; audio?: boolean; storage?: "ok" | "throws"; activated?: boolean } = {}) {
  const stats: Stats = { contexts: 0, oscillators: 0, sources: 0, starts: 0, resumes: 0, maxGain: 0, lastEnd: 0 };
  const store = new Map<string, string>();
  const handlers = new Map<string, Set<() => void>>();

  class FakeGain extends FakeNode {
    gain = new (class extends FakeParam {
      exponentialRampToValueAtTime(v: number, t: number) {
        stats.maxGain = Math.max(stats.maxGain, v);
        return super.exponentialRampToValueAtTime(v, t);
      }
    })();
  }
  class FakeSource extends FakeNode {
    frequency = new FakeParam();
    type = "sine";
    buffer: unknown = null;
    private started = false;
    start(t = 0) {
      if (!Number.isFinite(t) || t < 0) throw new RangeError("start invalide");
      if (this.started) throw new Error("start appelé deux fois");
      this.started = true;
      stats.starts++;
    }
    stop(t = 0) {
      if (!this.started) throw new Error("stop avant start");
      if (!Number.isFinite(t) || t < 0) throw new RangeError("stop invalide");
      stats.lastEnd = Math.max(stats.lastEnd, t);
    }
  }
  class FakeAudioContext {
    state = opts.state ?? "running";
    currentTime = 1;
    sampleRate = 44100;
    destination = new FakeNode();
    constructor() {
      stats.contexts++;
    }
    createGain() {
      return new FakeGain();
    }
    createOscillator() {
      stats.oscillators++;
      return new FakeSource();
    }
    createBufferSource() {
      stats.sources++;
      return new FakeSource();
    }
    createBiquadFilter() {
      return Object.assign(new FakeNode(), { type: "lowpass", frequency: new FakeParam(), Q: new FakeParam() });
    }
    createDynamicsCompressor() {
      return Object.assign(new FakeNode(), {
        threshold: new FakeParam(),
        knee: new FakeParam(),
        ratio: new FakeParam(),
        attack: new FakeParam(),
        release: new FakeParam(),
      });
    }
    createBuffer(_channels: number, length: number) {
      if (length < 1) throw new RangeError("tampon vide");
      return { getChannelData: () => new Float32Array(length) };
    }
    resume() {
      stats.resumes++;
      this.state = "running";
      return Promise.resolve();
    }
  }

  const localStorage =
    opts.storage === "throws"
      ? {
          getItem() {
            throw new Error("interdit");
          },
          setItem() {
            throw new Error("interdit");
          },
        }
      : { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };

  const win: Record<string, unknown> = {
    localStorage,
    addEventListener: (ev: string, fn: () => void) => {
      if (!handlers.has(ev)) handlers.set(ev, new Set());
      handlers.get(ev)!.add(fn);
    },
    removeEventListener: (ev: string, fn: () => void) => handlers.get(ev)?.delete(fn),
  };
  if (opts.audio !== false) win.AudioContext = FakeAudioContext;
  const vibrate = vi.fn(() => true);
  vi.stubGlobal("window", win);
  vi.stubGlobal("navigator", { vibrate, userActivation: { hasBeenActive: opts.activated ?? false } });
  return {
    stats,
    store,
    vibrate,
    gesture: (ev = "pointerup") => [...(handlers.get(ev) ?? [])].forEach((fn) => fn()),
    listenerCount: () => [...handlers.values()].reduce((n, s) => n + s.size, 0),
  };
}

async function load() {
  vi.resetModules();
  return import("../sfx");
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(100_000);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Avance l'horloge pour passer l'anti-doublon entre deux sons identiques. */
const wait = (ms = 100) => vi.advanceTimersByTime(ms);

describe("sfx côté serveur (aucun window)", () => {
  it("ne lève jamais d'exception", async () => {
    const { sfx, SFX_NAMES } = await load();
    expect(() => {
      sfx.unlock();
      for (const name of SFX_NAMES) sfx.play(name, 0.7);
      sfx.setMuted(true);
      sfx.toggleMuted();
      sfx.setHaptics(false);
      sfx.subscribe(() => {})();
    }).not.toThrow();
    expect(typeof sfx.isMuted()).toBe("boolean");
  });
});

describe("sfx dans un navigateur", () => {
  it("ne crée aucun contexte audio avant un geste utilisateur", async () => {
    const env = installBrowser();
    const { sfx } = await load();
    sfx.play("pop");
    expect(env.stats.contexts).toBe(0);
    expect(env.stats.starts).toBe(0);
  });

  it("se débloque tout seul au premier geste, puis retire ses écouteurs", async () => {
    const env = installBrowser();
    const { sfx } = await load();
    expect(env.listenerCount()).toBeGreaterThan(0);
    env.gesture("pointerup");
    expect(env.stats.contexts).toBe(1);
    expect(env.listenerCount()).toBe(0);
    const before = env.stats.oscillators;
    sfx.play("pop");
    expect(env.stats.oscillators).toBeGreaterThan(before);
  });

  it("joue chaque son avec des paramètres valides, à volume modéré, et court", async () => {
    const env = installBrowser();
    const { sfx, SFX_NAMES } = await load();
    sfx.unlock();
    expect(SFX_NAMES).toHaveLength(12);
    for (const name of SFX_NAMES) {
      for (const intensity of [0, 0.1, 0.5, 0.9, 1]) {
        wait();
        const before = env.stats.starts;
        env.stats.lastEnd = 0;
        sfx.play(name, intensity);
        expect(env.stats.starts, `${name} @ ${intensity} n'a rien joué (exception avalée ?)`).toBeGreaterThan(before);
        // currentTime du faux contexte = 1 s ; aucun son ne dépasse 2,5 s
        expect(env.stats.lastEnd - 1, `${name} trop long`).toBeLessThanOrEqual(2.5);
        if (name !== "fanfare" && name !== "reveal") expect(env.stats.lastEnd - 1, `${name} trop long`).toBeLessThanOrEqual(1);
      }
    }
    expect(env.stats.maxGain).toBeLessThanOrEqual(0.3);
    expect(env.stats.contexts).toBe(1);
  });

  it("`points` joue plus de notes quand l'intensité monte", async () => {
    const env = installBrowser();
    const { sfx } = await load();
    sfx.unlock();
    const count = (k: number) => {
      wait();
      const before = env.stats.oscillators;
      sfx.play("points", k);
      return env.stats.oscillators - before;
    };
    const low = count(0);
    const mid = count(0.5);
    const high = count(1);
    expect(low).toBe(1);
    expect(mid).toBeGreaterThan(low);
    expect(high).toBeGreaterThan(mid);
  });

  it("intensité hors bornes ou invalide : pas d'exception, son joué", async () => {
    const env = installBrowser();
    const { sfx } = await load();
    sfx.unlock();
    for (const k of [-5, 12, NaN, Infinity, undefined as unknown as number]) {
      for (const name of ["points", "vote", "tick"] as SfxName[]) {
        wait();
        const before = env.stats.starts;
        expect(() => sfx.play(name, k)).not.toThrow();
        expect(env.stats.starts).toBeGreaterThan(before);
      }
    }
    expect(() => sfx.play("inconnu" as SfxName)).not.toThrow();
  });

  it("anti-doublon : le même son deux fois de suite n'est joué qu'une fois", async () => {
    const env = installBrowser();
    const { sfx } = await load();
    sfx.unlock();
    sfx.play("tap");
    const after = env.stats.oscillators;
    sfx.play("tap");
    expect(env.stats.oscillators).toBe(after);
    sfx.play("pop"); // un autre son passe
    expect(env.stats.oscillators).toBeGreaterThan(after);
    wait();
    sfx.play("tap");
    expect(env.stats.oscillators).toBeGreaterThan(after + 1);
  });

  it("muet : aucun son, préférence conservée et relue", async () => {
    const env = installBrowser();
    const first = await load();
    first.sfx.unlock();
    expect(first.sfx.isMuted()).toBe(false);
    const seen: boolean[] = [];
    const off = first.sfx.subscribe(() => seen.push(first.sfx.isMuted()));
    first.sfx.setMuted(true);
    first.sfx.setMuted(true); // sans changement : pas de notification
    expect(seen).toEqual([true]);
    expect(env.store.get("bam:sfx-muted")).toBe("1");
    const before = env.stats.oscillators;
    first.sfx.play("fanfare");
    expect(env.stats.oscillators).toBe(before);
    expect(first.sfx.toggleMuted()).toBe(false);
    expect(seen).toEqual([true, false]);
    off();
    first.sfx.setMuted(true);
    expect(seen).toEqual([true, false]);

    // nouvelle page : la préférence est relue depuis le stockage
    const second = await load();
    expect(second.sfx.isMuted()).toBe(true);
  });

  it("vibreur léger sur timeUp et submit seulement, désactivable", async () => {
    const env = installBrowser();
    const { sfx } = await load();
    sfx.unlock();
    sfx.play("tap");
    sfx.play("vote");
    expect(env.vibrate).not.toHaveBeenCalled();
    sfx.play("submit");
    sfx.play("timeUp");
    expect(env.vibrate).toHaveBeenCalledTimes(2);
    sfx.setHaptics(false);
    expect(sfx.hapticsEnabled()).toBe(false);
    wait();
    sfx.play("submit");
    expect(env.vibrate).toHaveBeenCalledTimes(2);
  });

  it("contexte suspendu : tente de le réveiller puis joue", async () => {
    const env = installBrowser({ state: "suspended", activated: true });
    const { sfx } = await load();
    sfx.play("pop");
    expect(env.stats.resumes).toBe(1);
    await Promise.resolve();
    await Promise.resolve();
    expect(env.stats.oscillators).toBeGreaterThan(0);
  });

  it("sans WebAudio, sans vibreur, stockage interdit : toujours aucune exception", async () => {
    installBrowser({ audio: false, storage: "throws" });
    vi.stubGlobal("navigator", {});
    const { sfx, SFX_NAMES } = await load();
    expect(() => {
      sfx.unlock();
      for (const name of SFX_NAMES) sfx.play(name);
      sfx.setMuted(true);
      sfx.setHaptics(false);
    }).not.toThrow();
    // la préférence vit au moins en mémoire
    expect(sfx.isMuted()).toBe(true);
  });

  it("un constructeur AudioContext qui plante est neutralisé une fois pour toutes", async () => {
    const env = installBrowser();
    let attempts = 0;
    (window as unknown as Record<string, unknown>).AudioContext = class {
      constructor() {
        attempts++;
        throw new Error("NotSupportedError");
      }
    };
    const { sfx } = await load();
    expect(() => {
      sfx.unlock();
      sfx.play("pop");
      wait();
      sfx.play("pop");
    }).not.toThrow();
    expect(attempts).toBe(1);
    expect(env.stats.starts).toBe(0);
  });
});
