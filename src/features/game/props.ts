/**
 * CONTRAT côté client entre la couche de données (`useRoom`) et les écrans de phase.
 * Chaque écran de phase est un composant pur : il reçoit la vue serveur et l'API.
 */
import type { Action, RoomView } from "@/lib/game/types";

export interface ApiFailure {
  /** code d'erreur du contrat ("bad_phase", "not_host", ...) ou "network" */
  error: string;
  message: string;
}

export interface GameApi {
  /**
   * Envoie une action. Toutes les actions sont idempotentes côté serveur :
   * `send` réessaie tout seul en cas de coupure réseau. Résout avec la nouvelle vue,
   * rejette avec un `ApiFailure`. La vue de `useRoom` est mise à jour automatiquement.
   */
  send(action: Action): Promise<RoomView>;
  /** Pack perso : compresse l'image côté client puis l'envoie. Rejette avec un `ApiFailure`. */
  addImage(file: Blob): Promise<void>;
  removeImage(imageId: string): Promise<void>;
  /** Date.now() corrigé du décalage avec l'horloge serveur — à comparer à `view.phaseEndsAt`. */
  serverNow(): number;
  /** Quitte la salle et oublie la session locale. */
  leave(): Promise<void>;
}

export interface PhaseProps {
  view: RoomView;
  api: GameApi;
}
