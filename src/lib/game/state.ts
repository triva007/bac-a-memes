/**
 * État INTERNE d'une salle (jamais envoyé tel quel au client : il contient les
 * jetons secrets). Tout est du JSON simple : pas de Map/Set/Date, pour pouvoir
 * être stocké tel quel dans un cache clé-valeur.
 */
import type { Award, CustomImage, Meme, Phase, Settings, VoteScore } from "./types";

export interface PlayerState {
  id: string;
  /** secret du joueur — ne doit JAMAIS apparaître dans une vue */
  token: string;
  name: string;
  avatar: string;
  color: string;
  /** ordre d'arrivée (ancienneté) */
  seq: number;
  joinedAt: number;
  /** dernière requête authentifiée connue (écrite avec parcimonie, voir touchPresence) */
  lastSeen: number;
  /** statut calculé au dernier `tick` (c'est lui qui est envoyé dans les vues) */
  connected: boolean;
  /** a quitté en cours de partie (ses mèmes restent) */
  left: boolean;
  jokersLeft: number;
  /** version privée : changements visibles par ce joueur seulement (brouillon, joker, note) */
  pv: number;
  /** gabarits déjà proposés : templateId -> numéro de distribution */
  seen: Record<string, number>;
  /** robot piloté par le moteur (jeton inutilisable, toujours « connecté », jamais hôte) */
  bot?: boolean;
}

export interface RoundPlayer {
  hands: string[][];
  situations: string[];
  meme: Meme | null;
  submitted: boolean;
  usedJoker: boolean;
}

export interface MemeEntry {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  meme: Meme;
  round: number;
  /** playerId -> note */
  votes: Record<string, VoteScore>;
  /** votes clos (révélé) */
  closed: boolean;
  /** retiré par modération : 0 point, absent des résultats et de la galerie */
  removed: boolean;
}

export interface RoundState {
  /** playerId -> état de création, pour les joueurs présents au début de la manche */
  participants: Record<string, RoundPlayer>;
  theme: string | null;
  forcedTemplateId: string | null;
  /** ids des mèmes de la manche, dans l'ordre de vote */
  queue: string[];
  index: number;
}

export interface RoomState {
  code: string;
  /** graine de tous les tirages de la salle (secret) */
  seed: string;
  /** numéro de partie dans la salle (incrémenté par "again") */
  game: number;
  createdAt: number;
  /** version publique : changements visibles par tout le monde */
  version: number;
  phase: Phase;
  phaseStartedAt: number;
  phaseEndsAt: number | null;
  round: number;
  settings: Settings;
  hostId: string;
  /** créateur de la salle : il récupère le rôle d'hôte dès qu'il revient */
  ownerId?: string;
  players: PlayerState[];
  /** jetons des joueurs expulsés */
  kicked: string[];
  nextSeq: number;
  current: RoundState | null;
  /** tous les mèmes de la partie en cours (file de la manche courante comprise) */
  memes: MemeEntry[];
  awards: Award[];
  images: CustomImage[];
  usedThemes: string[];
  usedForced: string[];
}

export type ErrorCode =
  | "room_not_found"
  | "bad_token"
  | "room_full"
  | "game_started"
  | "not_host"
  | "bad_phase"
  | "invalid"
  | "kicked"
  | "uploads_off"
  | "too_many_images"
  | "image_too_big"
  | "image_not_found";

export interface EngineError {
  ok: false;
  error: ErrorCode;
  message: string;
}

export interface ActionResult {
  /** présents pour "join" */
  playerId?: string;
  token?: string;
  /** présent pour addImage */
  image?: CustomImage;
}

export interface EngineOk {
  ok: true;
  room: RoomState;
  result: ActionResult;
}

export type ActionOutcome = EngineOk | EngineError;

/** Identité fournie par la route pour un nouveau joueur (aléatoire fort). */
export interface JoinCredentials {
  playerId: string;
  token: string;
}
