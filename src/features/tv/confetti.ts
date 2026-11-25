import confetti from "canvas-confetti";

const COLORS = ["#ffe94a", "#ff5fa2", "#5df2a0", "#5cc8ff", "#ff9a3d", "#fbf7ec"];
const BASE = { colors: COLORS, disableForReducedMotion: true, zIndex: 40 } as const;

function fire(options: confetti.Options) {
  try {
    void confetti({ ...BASE, ...options });
  } catch {
    /* canvas indisponible : pas de confettis, pas de drame */
  }
}

/** Petite gerbe depuis un point (x, y en fraction de la fenêtre). */
export function confettiPop(x = 0.5, y = 0.5, power = 1) {
  fire({ particleCount: Math.round(70 * power), spread: 75, startVelocity: 38 * Math.min(1.5, 0.7 + power * 0.4), origin: { x, y }, scalar: 1.25 });
}

/** Deux canons depuis les bords : pour les cartons. */
export function confettiCannons(power = 1) {
  const count = Math.round(90 * power);
  fire({ particleCount: count, angle: 58, spread: 62, startVelocity: 62, origin: { x: 0, y: 0.82 }, scalar: 1.35 });
  fire({ particleCount: count, angle: 122, spread: 62, startVelocity: 62, origin: { x: 1, y: 0.82 }, scalar: 1.35 });
}

/** Pluie de confettis pendant `ms` (victoire finale). Renvoie une fonction d'arrêt. */
export function confettiRain(ms = 3500): () => void {
  let stopped = false;
  const end = Date.now() + ms;
  const tick = () => {
    if (stopped || Date.now() > end) return;
    fire({ particleCount: 9, angle: 60, spread: 70, startVelocity: 55, origin: { x: 0, y: 0.7 }, scalar: 1.3 });
    fire({ particleCount: 9, angle: 120, spread: 70, startVelocity: 55, origin: { x: 1, y: 0.7 }, scalar: 1.3 });
    fire({ particleCount: 6, spread: 160, startVelocity: 28, origin: { x: Math.random(), y: -0.05 }, gravity: 0.9, scalar: 1.2 });
    setTimeout(tick, 170);
  };
  tick();
  return () => {
    stopped = true;
  };
}

export function confettiClear() {
  try {
    confetti.reset();
  } catch {
    /* rien */
  }
}
