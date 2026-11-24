/**
 * Effets sonores synthétisés (WebAudio) — aucun fichier audio.
 *
 *   import { sfx } from "@/lib/sfx";
 *   sfx.unlock();            // au premier geste utilisateur (fait aussi tout seul)
 *   sfx.play("pop");
 *   sfx.play("points", 0.8); // intensité 0..1
 *   sfx.setMuted(true);      // préférence conservée en localStorage
 *
 * Tout est protégé : rendu serveur, contexte audio indisponible, lecture
 * automatique bloquée, localStorage interdit… aucune fonction ne lève d'exception.
 * Tant qu'aucun geste utilisateur n'a eu lieu, `play` ne fait rien (pas
 * d'avertissement du navigateur).
 */

export type SfxName =
  | "tap"
  | "pop"
  | "join"
  | "start"
  | "tick"
  | "timeUp"
  | "submit"
  | "vote"
  | "reveal"
  | "points"
  | "fanfare"
  | "error";

export const SFX_NAMES: readonly SfxName[] = [
  "tap",
  "pop",
  "join",
  "start",
  "tick",
  "timeUp",
  "submit",
  "vote",
  "reveal",
  "points",
  "fanfare",
  "error",
];

const MUTED_KEY = "bam:sfx-muted";
const HAPTICS_KEY = "bam:sfx-haptics";
/** Volume général, volontairement modéré (30 téléphones dans une salle). */
const MASTER_GAIN = 0.5;
/** Deux déclenchements du même son à moins de ça (ms) : le second est ignoré. */
const MIN_GAP_MS = 35;

interface Engine {
  ctx: AudioContext;
  out: AudioNode;
  noise: AudioBuffer | null;
}

let engine: Engine | null = null;
let engineFailed = false;
let unlocked = false;
let muted: boolean | null = null;
let haptics: boolean | null = null;
const lastPlayed: Partial<Record<SfxName, number>> = {};
const listeners = new Set<() => void>();

const isClient = (): boolean => typeof window !== "undefined";

// ---------------------------------------------------------------- préférences

function readFlag(key: string, fallback: boolean): boolean {
  try {
    if (!isClient()) return fallback;
    const v = window.localStorage.getItem(key);
    return v === null ? fallback : v === "1";
  } catch {
    return fallback;
  }
}

function writeFlag(key: string, value: boolean): void {
  try {
    if (isClient()) window.localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // stockage indisponible (navigation privée, quota…) : la préférence vit en mémoire
  }
}

function notify(): void {
  for (const fn of [...listeners]) {
    try {
      fn();
    } catch {
      // un abonné fautif ne doit pas casser les autres
    }
  }
}

function isMuted(): boolean {
  if (muted === null) muted = readFlag(MUTED_KEY, false);
  return muted;
}

function setMuted(value: boolean): void {
  const next = Boolean(value);
  const changed = isMuted() !== next;
  muted = next;
  writeFlag(MUTED_KEY, next);
  if (changed) notify();
}

function hapticsEnabled(): boolean {
  if (haptics === null) haptics = readFlag(HAPTICS_KEY, true);
  return haptics;
}

function setHaptics(value: boolean): void {
  const next = Boolean(value);
  const changed = hapticsEnabled() !== next;
  haptics = next;
  writeFlag(HAPTICS_KEY, next);
  if (changed) notify();
}

// ---------------------------------------------------------------- moteur audio

function userHasInteracted(): boolean {
  if (unlocked) return true;
  try {
    const ua = (navigator as Navigator & { userActivation?: { hasBeenActive?: boolean } }).userActivation;
    return Boolean(ua?.hasBeenActive);
  } catch {
    return false;
  }
}

function getEngine(): Engine | null {
  if (engine) return engine;
  if (engineFailed || !isClient()) return null;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) {
      engineFailed = true;
      return null;
    }
    const ctx = new Ctor();
    const master = ctx.createGain();
    master.gain.value = MASTER_GAIN;
    let tail: AudioNode = master;
    try {
      // limiteur doux : évite la saturation quand plusieurs sons se chevauchent
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.knee.value = 12;
      comp.ratio.value = 6;
      comp.attack.value = 0.003;
      comp.release.value = 0.15;
      master.connect(comp);
      tail = comp;
    } catch {
      tail = master;
    }
    tail.connect(ctx.destination);
    engine = { ctx, out: master, noise: null };
    return engine;
  } catch {
    engineFailed = true;
    return null;
  }
}

function getNoise(e: Engine): AudioBuffer {
  if (e.noise) return e.noise;
  const length = Math.floor(e.ctx.sampleRate * 0.6);
  const buffer = e.ctx.createBuffer(1, length, e.ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  e.noise = buffer;
  return buffer;
}

interface ToneOptions {
  freq: number;
  /** fréquence d'arrivée (glissando) */
  to?: number;
  /** départ, en secondes après maintenant */
  at?: number;
  dur: number;
  gain?: number;
  type?: OscillatorType;
  attack?: number;
  /** sortie alternative (ex. un filtre) */
  dest?: AudioNode;
}

const SILENCE = 0.0001;

function tone(e: Engine, o: ToneOptions): void {
  const t0 = e.ctx.currentTime + (o.at ?? 0) + 0.005;
  const dur = Math.max(0.02, o.dur);
  const attack = Math.min(o.attack ?? 0.006, dur / 2);
  const peak = Math.max(SILENCE * 2, o.gain ?? 0.2);
  const osc = e.ctx.createOscillator();
  const g = e.ctx.createGain();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(Math.max(20, o.freq), t0);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t0 + dur);
  g.gain.setValueAtTime(SILENCE, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(SILENCE, t0 + dur);
  osc.connect(g);
  g.connect(o.dest ?? e.out);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

interface NoiseOptions {
  at?: number;
  dur: number;
  gain?: number;
  filter?: BiquadFilterType;
  freq?: number;
  q?: number;
}

function noise(e: Engine, o: NoiseOptions): void {
  const t0 = e.ctx.currentTime + (o.at ?? 0) + 0.005;
  const dur = Math.min(0.55, Math.max(0.02, o.dur));
  const peak = Math.max(SILENCE * 2, o.gain ?? 0.1);
  const src = e.ctx.createBufferSource();
  src.buffer = getNoise(e);
  const filter = e.ctx.createBiquadFilter();
  filter.type = o.filter ?? "bandpass";
  filter.frequency.value = o.freq ?? 2000;
  filter.Q.value = o.q ?? 1;
  const g = e.ctx.createGain();
  g.gain.setValueAtTime(SILENCE, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + Math.min(0.004, dur / 2));
  g.gain.exponentialRampToValueAtTime(SILENCE, t0 + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(e.out);
  src.start(t0);
  src.stop(t0 + dur + 0.03);
}

/** Filtre passe-bas branché sur la sortie (adoucit carrés et dents de scie). */
function lowpass(e: Engine, freq: number): AudioNode {
  const f = e.ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = freq;
  f.Q.value = 0.7;
  f.connect(e.out);
  return f;
}

// notes (Hz)
const C4 = 261.63;
const G4 = 392.0;
const C5 = 523.25;
const D5 = 587.33;
const E5 = 659.25;
const G5 = 783.99;
const A5 = 880.0;
const C6 = 1046.5;
const E6 = 1318.5;
const G6 = 1567.98;
const PENTATONIC = [C5, D5, E5, G5, A5, C6, E6];

type Synth = (e: Engine, intensity: number) => void;

const SOUNDS: Record<SfxName, Synth> = {
  // petit clic feutré
  tap: (e) => {
    tone(e, { freq: 720, to: 480, dur: 0.045, gain: 0.14, type: "triangle", attack: 0.002 });
  },
  // bulle qui éclate
  pop: (e) => {
    tone(e, { freq: 320, to: 900, dur: 0.07, gain: 0.22, attack: 0.003 });
    noise(e, { dur: 0.03, gain: 0.04, filter: "highpass", freq: 3000 });
  },
  // deux notes montantes : quelqu'un arrive
  join: (e) => {
    tone(e, { freq: E5, dur: 0.11, gain: 0.16, type: "triangle" });
    tone(e, { freq: A5, at: 0.09, dur: 0.18, gain: 0.16, type: "triangle" });
  },
  // arpège montant : la partie démarre
  start: (e) => {
    [C5, E5, G5, C6].forEach((f, i) => {
      tone(e, { freq: f, at: i * 0.085, dur: i === 3 ? 0.4 : 0.12, gain: 0.17, type: "triangle" });
      tone(e, { freq: f * 2, at: i * 0.085, dur: i === 3 ? 0.3 : 0.08, gain: 0.04 });
    });
    noise(e, { at: 0.255, dur: 0.25, gain: 0.03, filter: "highpass", freq: 6000 });
  },
  // tic d'horloge des dernières secondes (plus aigu si intensité > 0.5)
  tick: (e, k) => {
    const f = k > 0.75 ? 1320 : 990;
    tone(e, { freq: f, dur: 0.035, gain: 0.12, type: "square", attack: 0.001, dest: lowpass(e, 2600) });
    noise(e, { dur: 0.015, gain: 0.03, filter: "bandpass", freq: 3200, q: 2 });
  },
  // fin du temps : deux notes descendantes, fermes mais pas agressives
  timeUp: (e) => {
    const lp = lowpass(e, 1500);
    tone(e, { freq: G4, dur: 0.16, gain: 0.2, type: "sawtooth", dest: lp });
    tone(e, { freq: G4 * 2, dur: 0.16, gain: 0.05, dest: lp });
    tone(e, { freq: C4, at: 0.17, dur: 0.42, gain: 0.22, type: "sawtooth", dest: lp });
    tone(e, { freq: C4 / 2, at: 0.17, dur: 0.42, gain: 0.12 });
  },
  // copie rendue : petit souffle + ding
  submit: (e) => {
    noise(e, { dur: 0.12, gain: 0.05, filter: "bandpass", freq: 1800, q: 0.8 });
    tone(e, { freq: G5, at: 0.05, dur: 0.1, gain: 0.15, type: "triangle" });
    tone(e, { freq: C6, at: 0.14, dur: 0.32, gain: 0.17, type: "triangle" });
    tone(e, { freq: C6 * 2, at: 0.14, dur: 0.22, gain: 0.04 });
  },
  // vote : pincement dont la hauteur suit la note donnée (0 = Bof … 1 = Mort de rire)
  vote: (e, k) => {
    const f = 392 * Math.pow(2, k);
    tone(e, { freq: f, to: f * 1.12, dur: 0.09, gain: 0.17, type: "triangle", attack: 0.003 });
    tone(e, { freq: f * 2, dur: 0.05, gain: 0.04 });
  },
  // roulement de tambour court puis coup de cymbale
  reveal: (e) => {
    const hits = 14;
    const length = 0.62;
    for (let i = 0; i < hits; i++) {
      const p = i / (hits - 1);
      noise(e, {
        at: length * Math.pow(p, 0.85),
        dur: 0.045,
        gain: 0.05 + 0.1 * p,
        filter: "bandpass",
        freq: 1500 + 500 * p,
        q: 1.2,
      });
      if (i % 2 === 0) tone(e, { freq: 190, at: length * Math.pow(p, 0.85), dur: 0.05, gain: 0.05 + 0.05 * p });
    }
    noise(e, { at: length + 0.06, dur: 0.4, gain: 0.1, filter: "highpass", freq: 5200 });
    tone(e, { freq: 150, to: 70, at: length + 0.06, dur: 0.2, gain: 0.25 });
    tone(e, { freq: C5, at: length + 0.06, dur: 0.3, gain: 0.1, type: "triangle" });
    tone(e, { freq: G5, at: length + 0.06, dur: 0.3, gain: 0.08, type: "triangle" });
  },
  // points gagnés : du petit « womp » tendre (0) à la cascade de pièces (1)
  points: (e, k) => {
    if (k < 0.12) {
      tone(e, { freq: 240, to: 160, dur: 0.3, gain: 0.15, type: "triangle", attack: 0.02 });
      return;
    }
    const count = 2 + Math.round(k * 5);
    const step = 0.075 - 0.02 * k;
    for (let i = 0; i < count; i++) {
      const last = i === count - 1;
      const f = PENTATONIC[Math.min(PENTATONIC.length - 1, i)];
      tone(e, { freq: f, at: i * step, dur: last ? 0.35 : 0.09, gain: 0.15, type: "triangle" });
      tone(e, { freq: f * 2, at: i * step, dur: last ? 0.25 : 0.06, gain: 0.035 });
    }
    if (k > 0.85) {
      const end = count * step;
      tone(e, { freq: G6, at: end, dur: 0.35, gain: 0.07 });
      tone(e, { freq: G6 * 1.5, at: end + 0.06, dur: 0.4, gain: 0.05 });
      noise(e, { at: end, dur: 0.3, gain: 0.03, filter: "highpass", freq: 7000 });
    }
  },
  // podium : petite fanfare de cuivres
  fanfare: (e) => {
    const lp = lowpass(e, 2200);
    const brass = (freq: number, at: number, dur: number, gain = 0.13) => {
      tone(e, { freq, at, dur, gain, type: "sawtooth", attack: 0.015, dest: lp });
      tone(e, { freq: freq * 1.005, at, dur, gain: gain * 0.6, type: "sawtooth", attack: 0.015, dest: lp });
    };
    brass(G4, 0, 0.13);
    brass(C5, 0.14, 0.13);
    brass(E5, 0.28, 0.13);
    brass(G5, 0.42, 0.34);
    brass(E5, 0.78, 0.13);
    brass(G5, 0.92, 0.2);
    // accord final tenu
    brass(C5, 1.14, 0.9, 0.09);
    brass(E5, 1.14, 0.9, 0.09);
    brass(G5, 1.14, 0.9, 0.09);
    brass(C6, 1.14, 0.9, 0.12);
    tone(e, { freq: C4 / 2, at: 1.14, dur: 0.8, gain: 0.14 });
    noise(e, { at: 1.14, dur: 0.5, gain: 0.07, filter: "highpass", freq: 5500 });
    [E6, G6, C6 * 2].forEach((f, i) => tone(e, { freq: f, at: 1.3 + i * 0.09, dur: 0.3, gain: 0.04 }));
  },
  // erreur : deux notes graves, brèves, sans agressivité
  error: (e) => {
    const lp = lowpass(e, 900);
    tone(e, { freq: 196, dur: 0.1, gain: 0.2, type: "square", dest: lp });
    tone(e, { freq: 147, at: 0.12, dur: 0.18, gain: 0.2, type: "square", dest: lp });
  },
};

/** Vibrations légères associées à certains sons (si l'appareil sait vibrer). */
const VIBRATIONS: Partial<Record<SfxName, number | number[]>> = {
  timeUp: [70, 50, 140],
  submit: 25,
};

function vibrate(name: SfxName): void {
  const pattern = VIBRATIONS[name];
  if (pattern === undefined || !hapticsEnabled()) return;
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(pattern);
  } catch {
    // vibreur refusé : sans importance
  }
}

function now(): number {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

function play(name: SfxName, intensity = 0.5): void {
  try {
    if (!isClient() || !(name in SOUNDS)) return;
    const t = now();
    const previous = lastPlayed[name];
    if (previous !== undefined && t - previous < MIN_GAP_MS) return;
    lastPlayed[name] = t;

    vibrate(name);
    if (isMuted() || !userHasInteracted()) return;
    const e = getEngine();
    if (!e) return;
    const k = Number.isFinite(intensity) ? Math.min(1, Math.max(0, intensity)) : 0.5;
    const run = () => {
      try {
        SOUNDS[name](e, k);
      } catch {
        // un son raté ne doit jamais remonter jusqu'à l'interface
      }
    };
    if (e.ctx.state === "running") {
      run();
      return;
    }
    // contexte suspendu (onglet revenu au premier plan, iOS…) : on tente de le
    // réveiller et on ne joue que si ça revient vite, pour éviter un son en retard.
    const resumed = e.ctx.resume();
    if (resumed && typeof resumed.then === "function") {
      resumed.then(() => {
        if (e.ctx.state === "running" && now() - t < 400) run();
      }).catch(() => {});
    }
  } catch {
    // jamais d'exception
  }
}

/**
 * À appeler dans un gestionnaire de geste utilisateur (clic, toucher, touche) :
 * crée et réveille le contexte audio. Sans danger si on l'appelle plusieurs fois.
 */
function unlock(): void {
  try {
    if (!isClient()) return;
    unlocked = true;
    const e = getEngine();
    if (!e) return;
    if (e.ctx.state !== "running") {
      const resumed = e.ctx.resume();
      if (resumed && typeof resumed.catch === "function") resumed.catch(() => {});
    }
    // iOS : jouer un tampon silencieux pendant le geste débloque la sortie
    const src = e.ctx.createBufferSource();
    src.buffer = e.ctx.createBuffer(1, 1, e.ctx.sampleRate);
    src.connect(e.ctx.destination);
    src.start(0);
  } catch {
    // jamais d'exception
  }
}

/** Abonnement aux changements de préférences (compatible `useSyncExternalStore`). */
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const sfx = {
  /** Joue un son. `intensity` (0..1) : utilisé par `points`, `vote` et `tick`. */
  play,
  setMuted,
  isMuted,
  /** Inverse la préférence et renvoie le nouvel état (vrai = muet). */
  toggleMuted(): boolean {
    setMuted(!isMuted());
    return isMuted();
  },
  unlock,
  /** Vibreur sur `timeUp` / `submit` (activé par défaut, indépendant du son). */
  setHaptics,
  hapticsEnabled,
  subscribe,
};

// Filet de sécurité : déblocage automatique au tout premier geste, même si
// l'interface oublie d'appeler `sfx.unlock()`.
if (isClient()) {
  try {
    const events = ["pointerup", "touchend", "click", "keydown"] as const;
    const onGesture = () => {
      unlock();
      if (engineFailed || engine?.ctx.state === "running") {
        for (const ev of events) window.removeEventListener(ev, onGesture, true);
      }
    };
    for (const ev of events) window.addEventListener(ev, onGesture, { capture: true, passive: true });
  } catch {
    // environnement exotique : tant pis pour le déblocage automatique
  }
}
