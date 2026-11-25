/**
 * CONTRAT PARTAGÉ — Bac à Mèmes
 * ------------------------------------------------------------------
 * Ce fichier est la source de vérité entre le serveur (moteur de jeu +
 * routes API) et le client (écrans). Ne pas le modifier sans prévenir :
 * tout le monde code contre ces types.
 *
 * Modèle : serveur autoritaire, clients en "polling" (GET toutes les ~1s).
 * Le serveur n'a pas de boucle : les changements de phase liés au temps
 * sont calculés paresseusement à chaque requête (fonction `tick`).
 */

// ---------------------------------------------------------------- Mèmes

/** Sticker posé par-dessus le mème. Coordonnées relatives au canevas. */
export interface Sticker {
  /** id d'emoji (nom de fichier sans extension dans /public/emoji, ex. "skull" -> /emoji/skull.webp) */
  e: string;
  /** centre, 0..1 (fraction de la largeur / hauteur du canevas) */
  x: number;
  y: number;
  /** taille : fraction de la largeur du canevas, 0.06..0.6 */
  s: number;
  /** rotation en degrés, -180..180 */
  r: number;
}

/** Un mème = un gabarit + les textes saisis + des stickers. Jamais d'image envoyée. */
export interface Meme {
  templateId: string;
  /** fieldId -> texte saisi */
  values: Record<string, string>;
  stickers: Sticker[];
}

export const MAX_STICKERS = 6;

// ---------------------------------------------------------------- Pack perso
//
// Les joueurs peuvent ajouter des images depuis leur téléphone (captures d'écran
// des mèmes du moment). Elles deviennent des gabarits "perso" :
//   templateId = "perso:<imageId>"   champs fixes : PERSO_FIELDS (haut / bas)
// Catégorie de gabarit associée : "perso" (utilisable dans settings.categories).

export interface CustomImage {
  id: string;
  /** dimensions en px de l'image stockée */
  w: number;
  h: number;
  /** joueur qui l'a ajoutée */
  by: string;
  byName: string;
}

export const PERSO_PREFIX = "perso:";
export const PERSO_CATEGORY = "perso";
export const PERSO_FIELDS: { id: string; maxLength: number }[] = [
  { id: "haut", maxLength: 90 },
  { id: "bas", maxLength: 90 },
];

// ---------------------------------------------------------------- Réglages

export type GameMode =
  /** chacun choisit son gabarit dans sa main */
  | "classique"
  /** tout le monde légende le même gabarit */
  | "meme-image"
  /** une situation imposée à tous, gabarit libre dans sa main */
  | "theme";

export interface Settings {
  mode: GameMode;
  /** nombre de manches, 1..8 */
  rounds: number;
  /** durée de création en secondes, 30..240 */
  createSeconds: number;
  /** durée de vote par mème en secondes, 6..40 */
  voteSeconds: number;
  /** nombre de gabarits proposés par main, 3..10 */
  handSize: number;
  /** nombre de relances de main par manche, 0..4 */
  rerolls: number;
  /** jokers par joueur et par partie (choisir dans toute la bibliothèque), 0..5 */
  jokers: number;
  /** catégories de gabarits activées ; [] = toutes */
  categories: string[];
  /** noms de profs saisis par l'hôte (pour les cartes situation + insertion rapide) */
  profs: string[];
  /** autres noms à charrier (CPE, surveillants, élèves absents...) */
  extraNames: string[];
  /** stickers autorisés */
  stickers: boolean;
  /** qui peut ajouter des images au "pack perso" de la salle */
  uploads: "all" | "host" | "off";
}

export const DEFAULT_SETTINGS: Settings = {
  mode: "classique",
  rounds: 3,
  createSeconds: 90,
  voteSeconds: 15,
  handSize: 8,
  rerolls: 2,
  jokers: 1,
  categories: [],
  profs: [],
  extraNames: [],
  stickers: true,
  uploads: "all",
};

export const LIMITS = {
  maxPlayers: 40,
  minPlayersToStart: 2,
  nameMaxLength: 16,
  maxNames: 40,
  nameListItemMaxLength: 24,
  /** durée de l'écran "révélation" après le vote de chaque mème */
  revealSeconds: 5,
  /** durée de l'écran de classement de manche avant passage auto */
  resultsSeconds: 20,
  /** un joueur est "déconnecté" s'il n'a pas pollé depuis ce délai */
  disconnectAfterMs: 12_000,
  /** pack perso : images ajoutées par les joueurs */
  maxImages: 60,
  maxImagesPerPlayer: 30,
  /** taille max d'une image une fois décodée (le client compresse avant envoi) */
  maxImageBytes: 350_000,
  /** une salle inactive est supprimée après ce délai */
  roomTtlSeconds: 6 * 3600,
} as const;

// ---------------------------------------------------------------- Vote

/** Note donnée à un mème : 0 = Bof, 1 = Pas mal, 2 = Drôle, 3 = Mort de rire */
export type VoteScore = 0 | 1 | 2 | 3;

export const VOTE_OPTIONS: { score: VoteScore; label: string; emoji: string }[] = [
  { score: 0, label: "Bof", emoji: "neutral-face" },
  { score: 1, label: "Pas mal", emoji: "slightly-smiling-face" },
  { score: 2, label: "Drôle", emoji: "face-with-tears-of-joy" },
  { score: 3, label: "Mort de rire", emoji: "skull" },
];

// ---------------------------------------------------------------- Vue envoyée au client

export type Phase =
  | "lobby" // salle d'attente
  | "create" // tout le monde crée son mème
  | "vote" // on note le mème courant
  | "reveal" // on révèle l'auteur + les points du mème courant
  | "results" // classement de la manche
  | "final"; // podium + récompenses + galerie

export interface PlayerView {
  id: string;
  name: string;
  /** id d'emoji servant d'avatar */
  avatar: string;
  /** couleur d'accent (hex) attribuée par le serveur */
  color: string;
  score: number;
  connected: boolean;
  isHost: boolean;
  /** robot ajouté par l'hôte pour tester (toujours « connecté », joue tout seul) */
  isBot: boolean;
  /** phase create : a validé son mème ; phase vote : a voté pour le mème courant */
  done: boolean;
}

/** Résultat d'un mème une fois les votes clos. */
export interface MemeResult {
  memeId: string;
  meme: Meme;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  /** total des points reçus */
  points: number;
  /** nombre de votes par note : [bof, pasMal, drole, mort] */
  breakdown: [number, number, number, number];
  /** manche (1-based) */
  round: number;
}

export interface Award {
  id: string;
  /** ex. "Roi du mème", "Humour incompris" */
  title: string;
  /** phrase d'explication courte */
  description: string;
  emoji: string;
  playerId: string;
  playerName: string;
  /** mème associé si pertinent */
  memeId?: string;
}

export interface RoomView {
  code: string;
  /** s'incrémente à chaque changement visible ; sert au polling conditionnel */
  version: number;
  /** horloge serveur (ms epoch) au moment de la réponse — pour corriger le décalage client */
  now: number;
  phase: Phase;
  /** fin de la phase courante (ms epoch serveur) ou null s'il n'y a pas de minuteur */
  phaseEndsAt: number | null;
  /** manche courante, 1-based (0 dans le lobby) */
  round: number;
  totalRounds: number;
  settings: Settings;
  hostId: string;
  players: PlayerView[];
  /** pack perso de la salle */
  images: CustomImage[];

  /** null pour un spectateur (écran de classe / TV) */
  me: null | {
    id: string;
    isHost: boolean;
    jokersLeft: number;
  };

  /** présent en phase "create" */
  create?: {
    /** mains de gabarits : hands[0] = main initiale, hands[1..] = relances. Vide pour un spectateur. */
    hands: string[][];
    /** cartes "situation" d'inspiration pour ce joueur (textes déjà résolus) */
    situations: string[];
    /** mode "theme" : situation imposée à tous */
    theme: string | null;
    /** mode "meme-image" : gabarit imposé à tous */
    forcedTemplateId: string | null;
    /** j'ai validé */
    submitted: boolean;
    /** mon dernier brouillon / mème validé connu du serveur */
    myMeme: Meme | null;
    submittedCount: number;
    totalPlayers: number;
  };

  /** présent en phases "vote" et "reveal" */
  vote?: {
    /** index du mème courant, 0-based */
    index: number;
    count: number;
    memeId: string;
    meme: Meme;
    /** vrai si c'est mon mème (je ne peux pas voter) */
    isMine: boolean;
    /** ma note pour ce mème, ou null */
    myVote: VoteScore | null;
    votedCount: number;
    /** nombre de votants attendus (joueurs connectés hors auteur) */
    votersCount: number;
    /** présent uniquement en phase "reveal" */
    result: MemeResult | null;
  };

  /** présent en phase "results" : mèmes de la manche triés du meilleur au moins bon */
  results?: {
    entries: MemeResult[];
    /** points gagnés pendant cette manche par joueur */
    roundPoints: Record<string, number>;
    isLastRound: boolean;
  };

  /** présent en phase "final" */
  final?: {
    /** joueurs triés par score décroissant (ids) */
    ranking: string[];
    awards: Award[];
    /** tous les mèmes de la partie, triés par points décroissants */
    gallery: MemeResult[];
  };
}

// ---------------------------------------------------------------- API
//
// POST /api/rooms                       body: CreateRoomRequest      -> JoinResponse
// GET  /api/rooms/[code]?token=T&v=N    -> RoomView | UnchangedResponse   (token optionnel = spectateur)
// POST /api/rooms/[code]                body: ActionRequest          -> ActionResponse
//
//
// Pack perso (toutes phases ; droits selon settings.uploads ; suppression : hôte ou auteur) :
// POST   /api/rooms/[code]/images            body: AddImageRequest   -> AddImageResponse
// DELETE /api/rooms/[code]/images/[id]?token=T                       -> ActionResponse
// GET    /api/rooms/[code]/images/[id]       -> l'image (binaire, cache immuable 1 an)
//
// Erreurs : HTTP 4xx + ApiError. Codes : "room_not_found" (404), "bad_token" (401),
// "room_full", "game_started", "not_host", "bad_phase", "invalid" (400), "kicked" (403),
// "uploads_off", "too_many_images", "image_too_big" (413), "image_not_found" (404).

export interface CreateRoomRequest {
  name: string;
  avatar: string;
}

export interface JoinResponse {
  code: string;
  playerId: string;
  /** secret du joueur, à conserver en localStorage et à renvoyer à chaque appel */
  token: string;
  state: RoomView;
}

export interface AddImageRequest {
  token: string;
  /** data URL image/jpeg, image/webp ou image/png, compressée côté client (≈1000 px de large max) */
  dataUrl: string;
  w: number;
  h: number;
}

export interface AddImageResponse {
  ok: true;
  image: CustomImage;
  state: RoomView;
}

export interface UnchangedResponse {
  unchanged: true;
  version: number;
  now: number;
}

export interface ApiError {
  error: string;
  message: string;
}

export type Action =
  /** rejoindre la salle (pas de token requis). En cours de partie : rejoint et jouera à la manche suivante. */
  | { type: "join"; name: string; avatar: string }
  | { type: "leave" }
  /** hôte, lobby uniquement */
  | { type: "settings"; patch: Partial<Settings> }
  /** hôte */
  | { type: "kick"; playerId: string }
  /** hôte, lobby -> create */
  | { type: "start" }
  /** sauvegarde silencieuse du brouillon (pris en compte si le temps s'écoule) */
  | { type: "draft"; meme: Meme; usedJoker?: boolean }
  /** valider son mème */
  | { type: "submit"; meme: Meme; usedJoker?: boolean }
  /** revenir sur sa validation pour modifier */
  | { type: "unsubmit" }
  | { type: "vote"; memeId: string; score: VoteScore }
  /** hôte : passer à la suite immédiatement (toutes phases sauf lobby/final) */
  | { type: "skip" }
  /** hôte, modération : retirer le mème en cours de vote (0 point, on passe au suivant) */
  | { type: "removeMeme"; memeId: string }
  /** hôte, final -> lobby (on garde joueurs, robots et réglages, scores remis à zéro) */
  | { type: "again" }
  /** hôte, lobby uniquement : ajoute `count` robots (1..12 par appel, dans la limite de LIMITS.maxPlayers). Non idempotent. */
  | { type: "addBots"; count: number }
  /** hôte, lobby uniquement : retire tous les robots */
  | { type: "removeBots" };

export type ActionRequest = Action & { token?: string };

export interface ActionResponse {
  ok: true;
  state: RoomView;
  /** présent pour "join" */
  playerId?: string;
  token?: string;
}

/** Métadonnées de gabarit dont le moteur a besoin (injectées, pour rester testable sans React). */
export interface TemplateMeta {
  id: string;
  category: string;
  fields: { id: string; maxLength: number }[];
}
