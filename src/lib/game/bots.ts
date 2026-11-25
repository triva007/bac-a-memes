/**
 * ROBOTS : faux joueurs pilotés par le moteur, pour tester une partie tout
 * seul. Tout est déterministe : pseudo, délais, mème et notes sortent du PRNG
 * à graine (salle + manche + robot). Aucun nom réel, ton lycéen bon enfant.
 */
import { pickOne } from "./rng";
import { PERSO_PREFIX, type Meme, type Sticker, type TemplateMeta, type VoteScore } from "./types";

/** pseudos de robots (≤ 16 caractères) */
export const BOT_NAMES = [
  "Robot Kevin",
  "Bot du fond",
  "Robot Bavard",
  "Bot en retard",
  "Robot Délégué",
  "Bot sans stylo",
  "Robot Dodo",
  "Bot Cantine",
  "Robot Fayot",
  "Bot Flemme",
  "Robot 4 couleurs",
  "Bot du CDI",
  "Robot Tipp-Ex",
  "Bot Radiateur",
  "Robot Antisèche",
  "Bot Wifi",
  "Robot Compas",
  "Bot Casquette",
  "Robot Trousse",
  "Bot Récré",
  "Robot Sonnerie",
  "Bot Colle",
  "Robot Cartable",
  "Bot Goûter",
  "Robot Agenda",
  "Bot 2 de tension",
  "Robot Préau",
  "Bot Calculette",
  "Robot Surligneur",
  "Bot Permanence",
  "Robot Carnet",
  "Bot Gomme",
  "Robot Équerre",
  "Bot Casier",
  "Robot Buvard",
  "Bot Self",
  "Robot Brouillon",
  "Bot Interro",
  "Robot Rattrapage",
  "Bot Option latin",
];

export const BOT_AVATARS = ["robot", "alien-monster", "alien", "ghost", "nerd-face", "clown-face", "joystick", "video-game", "floppy-disk", "light-bulb", "gear", "magnet"];

const BOT_STICKERS = ["skull", "fire", "face-with-tears-of-joy", "sparkles", "hundred-points", "clown-face", "moai"];

/** répliques des robots : courtes, drôles, vocabulaire de lycée */
export const BOT_LINES = [
  "Moi à 8 h le lundi",
  "0 révision, 100 % confiance",
  "Le wifi du lycée",
  "Perte d'aura immédiate",
  "+1000 aura",
  "Il a cuisiné",
  "C'est une dinguerie",
  "T'es cuit",
  "Masterclass",
  "Le self à 12 h 01",
  "J'ai oublié mon sac",
  "Encore en retard",
  "Le PNJ du fond de la classe",
  "Contrôle surprise",
  "« Sortez une feuille »",
  "J'ai révisé (c'est faux)",
  "Mon réveil : absent",
  "Le bus : parti sans moi",
  "La sonnerie, enfin",
  "Exposé commencé à 7 h 40",
  "Storytime : j'ai eu 2",
  "Parcoursup : en attente",
  "Le conseil de classe",
  "Ma moyenne en chute libre",
  "Peut mieux faire",
  "Bavarde trop",
  "Ça passe crème",
  "J'ai le seum",
  "Trop la flemme",
  "En PLS totale",
  "Le chargeur à 1 %",
  "DS de 4 h un samedi",
  "La photocopieuse en panne",
  "Le prof a oublié le DM",
  "« C'est pour vous que je dis ça »",
  "« La cloche, c'est pour moi »",
  "Heure de perm' surprise",
  "Le groupe de classe à 23 h",
  "Vu à 21 h 04",
  "Mon stylo a rendu l'âme",
  "Qui a un double ?",
  "La calculette en mode examen",
  "Ma copie : blanche et fière",
  "Tout le monde a compris sauf moi",
  "J'ai appris le mauvais chapitre",
  "Le délégué a parlé",
  "Sortie scolaire annulée",
  "Le radiateur du fond, mon ami",
  "Les frites du jeudi",
  "Oral dans 5 minutes",
  "J'improvise",
  "Aucune pression",
  "Mes notes : un mystère",
  "Le carnet de correspondance",
  "Retard justifié (pas du tout)",
  "Mode avion pendant le cours",
  "Le tableau numérique bugue",
  "Vacances dans 3 jours",
  "Lundi : déjà fatigué",
  "Le silence pendant l'appel",
  "Ratio",
  "En vrai, ça va",
  "Grosse masterclass du fond",
  "Quand ça sonne en plein contrôle",
];

/** textes très courts, pour les champs étroits (notes, étiquettes) */
const BOT_SHORTS = ["4/20", "2/20", "19/20", "0", "Aïe", "Non", "Oui", "Cuit", "Ratio", "Wesh", "Zéro", "Bof", "Lol", "Mdr", "Help", "Flop", "GG", "Bis", "A+", "?!"];

/** gabarits « image + légende » : un seul des deux champs suffit */
function isCaptionTemplate(template: TemplateMeta): boolean {
  if (!template.id.startsWith(PERSO_PREFIX) && !template.id.startsWith("pack-")) return false;
  return template.fields.length === 2;
}

function fit(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd();
}

function lineFor(max: number, situations: string[], rand: () => number): string {
  if (max < 14) {
    const shorts = BOT_SHORTS.filter((s) => s.length <= max);
    return shorts.length ? pickOne(shorts, rand) : fit(pickOne(BOT_SHORTS, rand), max);
  }
  // parfois, le robot recopie une de ses cartes situation
  if (situations.length > 0 && rand() < 0.2) {
    const s = pickOne(situations, rand);
    if (s.length <= max) return s;
  }
  const fitting = BOT_LINES.filter((l) => l.length <= max);
  return fitting.length ? pickOne(fitting, rand) : fit(pickOne(BOT_LINES, rand), max);
}

/** Mème d'un robot pour le gabarit donné (toujours au moins un champ rempli). */
export function buildBotMeme(template: TemplateMeta, situations: string[], allowStickers: boolean, rand: () => number): Meme {
  const values: Record<string, string> = {};
  for (const f of template.fields) values[f.id] = "";
  if (isCaptionTemplate(template)) {
    const roll = rand();
    const both = roll < 0.35;
    const first = roll < 0.7 ? 0 : 1;
    template.fields.forEach((f, i) => {
      if (both || i === first) values[f.id] = lineFor(f.maxLength, situations, rand);
    });
  } else {
    const used = new Set<string>();
    for (const f of template.fields) {
      let text = lineFor(f.maxLength, situations, rand);
      if (used.has(text)) text = lineFor(f.maxLength, situations, rand);
      used.add(text);
      values[f.id] = text;
    }
  }
  const stickers: Sticker[] = [];
  const wantSticker = rand() < 0.3 || template.fields.length === 0;
  if (allowStickers && wantSticker) {
    stickers.push({
      e: pickOne(BOT_STICKERS, rand),
      x: Math.round((0.15 + rand() * 0.7) * 1000) / 1000,
      y: Math.round((0.15 + rand() * 0.7) * 1000) / 1000,
      s: Math.round((0.14 + rand() * 0.14) * 1000) / 1000,
      r: Math.round(rand() * 40 - 20),
    });
  }
  return { templateId: template.id, values, stickers };
}

/** Délai (ms après le début de la création) au bout duquel un robot valide : ~6 s à ~45 % de la durée. */
export function botCreateDelay(createMs: number, rand: () => number): number {
  const min = Math.min(6_000, createMs * 0.2);
  const max = Math.max(min + 1_000, createMs * 0.45);
  return Math.round(min + rand() * (max - min));
}

/** Délai (ms après l'ouverture du vote) au bout duquel un robot note : ~1,5 s à ~5 s, borné par la durée du vote. */
export function botVoteDelay(voteMs: number, rand: () => number): number {
  return Math.round(Math.min(1_500 + rand() * 3_500, voteMs * 0.8));
}

/** Note d'un robot : 10 % bof, 30 % pas mal, 40 % drôle, 20 % mort de rire. */
export function botScore(rand: () => number): VoteScore {
  const r = rand();
  if (r < 0.1) return 0;
  if (r < 0.4) return 1;
  if (r < 0.8) return 2;
  return 3;
}
