"use client";

/**
 * Couche de données du client : interroge le serveur en boucle (polling
 * conditionnel), corrige le décalage d'horloge, gère la session locale,
 * les reconnexions et le renvoi automatique des actions.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Action,
  ActionResponse,
  AddImageResponse,
  ApiError,
  JoinResponse,
  RoomView,
  UnchangedResponse,
} from "@/lib/game/types";
import { LIMITS } from "@/lib/game/types";
import type { ApiFailure, GameApi } from "./props";
import { clearSession, loadSession, newToken, saveSession, type StoredSession } from "./session";

export type RoomStatus =
  /** première réponse pas encore reçue */
  | "loading"
  /** tout va bien (joueur ou spectateur) */
  | "ok"
  /** la salle existe mais ce navigateur n'y a pas de joueur : afficher l'écran "rejoindre" */
  | "need-join"
  /** salle introuvable ou expirée */
  | "not-found"
  /** expulsé par l'hôte */
  | "kicked";

export interface UseRoom {
  status: RoomStatus;
  /** dernière vue connue (reste affichable pendant une coupure réseau) */
  view: RoomView | null;
  /** vrai si les dernières requêtes ont échoué (afficher un bandeau "connexion perdue…") */
  offline: boolean;
  api: GameApi;
  /** rejoindre la salle (écran "need-join"). Rejette avec un ApiFailure. */
  join(name: string, avatar: string): Promise<void>;
}

const POLL_MS = 1000;
const POLL_FAST_MS = 650;
const POLL_HIDDEN_MS = 4000;
const NOT_FOUND_STRIKES = 3;

class HttpFailure extends Error implements ApiFailure {
  error: string;
  status: number;
  constructor(status: number, error: string, message: string) {
    super(message);
    this.status = status;
    this.error = error;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store", ...init });
  } catch {
    throw new HttpFailure(0, "network", "Connexion perdue. On réessaie…");
  }
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* corps vide ou non JSON */
  }
  if (!res.ok) {
    const e = body as Partial<ApiError> | null;
    throw new HttpFailure(res.status, e?.error ?? "server", e?.message ?? "Le serveur a eu un souci. Réessaie.");
  }
  return body as T;
}

const postJson = <T,>(url: string, payload: unknown) =>
  request<T>(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Crée une salle et enregistre la session. Utilisé par l'écran d'accueil. */
export async function createRoom(name: string, avatar: string): Promise<JoinResponse> {
  const res = await postJson<JoinResponse>("/api/rooms", { name, avatar });
  saveSession(res.code, { token: res.token, playerId: res.playerId, name, avatar });
  return res;
}

/** Vérifie qu'une salle existe (écran d'accueil, avant de naviguer). */
export async function roomExists(code: string): Promise<boolean> {
  try {
    await request(`/api/rooms/${encodeURIComponent(code.toUpperCase())}`);
    return true;
  } catch (e) {
    if (e instanceof HttpFailure && e.status === 404) return false;
    throw e;
  }
}

/** Réduit une image à ~1000 px de large et la compresse en JPEG sous la limite serveur. */
async function compressImage(file: Blob): Promise<{ dataUrl: string; w: number; h: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1000 / bitmap.width, 1400 / bitmap.height);
  const w = Math.max(50, Math.round(bitmap.width * scale));
  const h = Math.max(50, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new HttpFailure(0, "invalid", "Impossible de lire cette image.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  for (const quality of [0.84, 0.74, 0.62, 0.5, 0.38]) {
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    const bytes = Math.floor(((dataUrl.length - dataUrl.indexOf(",") - 1) * 3) / 4);
    if (bytes <= LIMITS.maxImageBytes - 10_000) return { dataUrl, w, h };
  }
  throw new HttpFailure(413, "image_too_big", "Image trop lourde, essaie une capture d'écran plus petite.");
}

export function useRoom(codeInput: string, options: { spectator?: boolean } = {}): UseRoom {
  const code = codeInput.toUpperCase();
  const spectator = options.spectator ?? false;

  const [view, setView] = useState<RoomView | null>(null);
  const [status, setStatus] = useState<RoomStatus>("loading");
  const [offline, setOffline] = useState(false);

  const sessionRef = useRef<StoredSession | null>(null);
  const viewRef = useRef<RoomView | null>(null);
  /** décalage horloge serveur - horloge locale (ms) et meilleur aller-retour observé */
  const clockRef = useRef({ offset: 0, rtt: Infinity });
  /** heure de départ de la requête dont la réponse a été appliquée en dernier */
  const appliedAtRef = useRef(0);
  const strikesRef = useRef({ notFound: 0, network: 0 });
  const rejoiningRef = useRef<Promise<void> | null>(null);
  const pokeRef = useRef<() => void>(() => {});
  const aliveRef = useRef(true);

  const applyView = useCallback((next: RoomView, startedAt: number, receivedAt: number) => {
    const rtt = receivedAt - startedAt;
    const clock = clockRef.current;
    // on garde le décalage mesuré avec le meilleur aller-retour (le plus précis)
    if (rtt <= clock.rtt + 40) {
      clock.rtt = Math.min(clock.rtt, rtt);
      clock.offset = next.now - (startedAt + rtt / 2);
    }
    if (startedAt < appliedAtRef.current) return; // réponse plus ancienne qu'une déjà appliquée
    appliedAtRef.current = startedAt;
    viewRef.current = next;
    setView(next);
    setStatus(next.me || spectator ? "ok" : "need-join");
  }, [spectator]);

  const urlFor = useCallback(
    (withVersion: boolean) => {
      const params = new URLSearchParams();
      const token = sessionRef.current?.token;
      if (token && !spectator) params.set("token", token);
      if (withVersion && viewRef.current) params.set("v", String(viewRef.current.version));
      const qs = params.toString();
      return `/api/rooms/${code}${qs ? `?${qs}` : ""}`;
    },
    [code, spectator],
  );

  /** Re-join silencieux avec le même jeton (serveur redémarré, joueur revenu après être parti). */
  const rejoin = useCallback(async () => {
    const s = sessionRef.current;
    if (!s) return;
    if (!rejoiningRef.current) {
      rejoiningRef.current = (async () => {
        const startedAt = Date.now();
        const res = await postJson<ActionResponse>(`/api/rooms/${code}`, {
          type: "join",
          name: s.name,
          avatar: s.avatar,
          token: s.token,
        });
        if (res.playerId) {
          sessionRef.current = { ...s, playerId: res.playerId, token: res.token ?? s.token };
          saveSession(code, sessionRef.current);
        }
        applyView(res.state, startedAt, Date.now());
      })().finally(() => {
        rejoiningRef.current = null;
      });
    }
    return rejoiningRef.current;
  }, [applyView, code]);

  /** Traite une erreur HTTP commune. Renvoie vrai si l'appelant peut réessayer. */
  const handleFailure = useCallback(
    async (e: unknown): Promise<boolean> => {
      if (!(e instanceof HttpFailure)) return false;
      if (e.error === "network" || e.status >= 500) {
        strikesRef.current.network += 1;
        if (strikesRef.current.network >= 2) setOffline(true);
        return true;
      }
      if (e.error === "room_not_found") {
        strikesRef.current.notFound += 1;
        if (strikesRef.current.notFound >= NOT_FOUND_STRIKES) setStatus("not-found");
        return strikesRef.current.notFound < NOT_FOUND_STRIKES;
      }
      if (e.error === "kicked") {
        clearSession(code);
        sessionRef.current = null;
        setStatus("kicked");
        return false;
      }
      if (e.error === "bad_token") {
        if (sessionRef.current) {
          try {
            await rejoin();
            return true;
          } catch (err) {
            if (err instanceof HttpFailure && (err.error === "network" || err.status >= 500)) return true;
            clearSession(code);
            sessionRef.current = null;
          }
        }
        // session inutilisable : on repasse en simple visiteur
        viewRef.current = null;
        return true;
      }
      return false;
    },
    [code, rejoin],
  );

  // ------------------------------------------------------------ boucle de polling
  useEffect(() => {
    aliveRef.current = true;
    sessionRef.current = spectator ? null : loadSession(code);
    viewRef.current = null;
    appliedAtRef.current = 0;
    strikesRef.current = { notFound: 0, network: 0 };

    let timer: ReturnType<typeof setTimeout> | null = null;
    let running = false;
    let stopped = false;

    const schedule = (ms: number) => {
      if (stopped) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(pollOnce, ms);
    };

    const nextDelay = () => {
      if (typeof document !== "undefined" && document.hidden) return POLL_HIDDEN_MS;
      const phase = viewRef.current?.phase;
      return phase === "vote" || phase === "reveal" ? POLL_FAST_MS : POLL_MS;
    };

    async function pollOnce() {
      if (stopped || running) return;
      running = true;
      const startedAt = Date.now();
      try {
        const res = await request<RoomView | UnchangedResponse>(urlFor(true));
        const receivedAt = Date.now();
        strikesRef.current = { notFound: 0, network: 0 };
        setOffline(false);
        if ("unchanged" in res) {
          const rtt = receivedAt - startedAt;
          const clock = clockRef.current;
          if (rtt <= clock.rtt + 40) {
            clock.rtt = Math.min(clock.rtt, rtt);
            clock.offset = res.now - (startedAt + rtt / 2);
          }
          if (viewRef.current) setStatus(viewRef.current.me || spectator ? "ok" : "need-join");
        } else {
          applyView(res, startedAt, receivedAt);
        }
      } catch (e) {
        await handleFailure(e);
      } finally {
        running = false;
        // en cas de coupure réseau on espace un peu les essais
        const backoff = Math.min(strikesRef.current.network, 5) * 600;
        schedule(nextDelay() + backoff);
      }
    }

    pokeRef.current = () => schedule(0);
    const onVisible = () => {
      if (!document.hidden) schedule(0);
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    schedule(0);

    return () => {
      stopped = true;
      aliveRef.current = false;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [applyView, code, handleFailure, spectator, urlFor]);

  // ------------------------------------------------------------ API pour les écrans
  const api = useMemo<GameApi>(() => {
    const send = async (action: Action): Promise<RoomView> => {
      let lastError: unknown = null;
      for (let attempt = 0; attempt < 6; attempt++) {
        const startedAt = Date.now();
        try {
          const res = await postJson<ActionResponse>(`/api/rooms/${code}`, {
            ...action,
            token: sessionRef.current?.token,
          });
          strikesRef.current = { notFound: 0, network: 0 };
          setOffline(false);
          applyView(res.state, startedAt, Date.now());
          return res.state;
        } catch (e) {
          lastError = e;
          const retry = await handleFailure(e);
          if (!retry || !aliveRef.current) break;
          await sleep(350 + attempt * 450);
        }
      }
      const f = lastError as Partial<ApiFailure> | null;
      throw { error: f?.error ?? "network", message: f?.message ?? "Connexion perdue." } satisfies ApiFailure;
    };

    return {
      send,
      async addImage(file: Blob) {
        const token = sessionRef.current?.token;
        if (!token) throw { error: "bad_token", message: "Rejoins d'abord la salle." } satisfies ApiFailure;
        const img = await compressImage(file).catch((e: unknown) => {
          if (e instanceof HttpFailure) throw { error: e.error, message: e.message } satisfies ApiFailure;
          throw { error: "invalid", message: "Impossible de lire cette image." } satisfies ApiFailure;
        });
        const startedAt = Date.now();
        try {
          const res = await postJson<AddImageResponse>(`/api/rooms/${code}/images`, { token, ...img });
          applyView(res.state, startedAt, Date.now());
        } catch (e) {
          const f = e as Partial<ApiFailure>;
          throw { error: f.error ?? "network", message: f.message ?? "Envoi impossible." } satisfies ApiFailure;
        }
      },
      async removeImage(imageId: string) {
        const token = sessionRef.current?.token ?? "";
        const startedAt = Date.now();
        try {
          const res = await request<ActionResponse>(
            `/api/rooms/${code}/images/${encodeURIComponent(imageId)}?token=${encodeURIComponent(token)}`,
            { method: "DELETE" },
          );
          applyView(res.state, startedAt, Date.now());
        } catch (e) {
          const f = e as Partial<ApiFailure>;
          throw { error: f.error ?? "network", message: f.message ?? "Suppression impossible." } satisfies ApiFailure;
        }
      },
      serverNow: () => Date.now() + clockRef.current.offset,
      async leave() {
        const token = sessionRef.current?.token;
        clearSession(code);
        sessionRef.current = null;
        if (token) {
          try {
            await postJson(`/api/rooms/${code}`, { type: "leave", token });
          } catch {
            /* tant pis : le serveur nous marquera déconnecté */
          }
        }
      },
    };
  }, [applyView, code, handleFailure]);

  const join = useCallback(
    async (name: string, avatar: string) => {
      const token = sessionRef.current?.token ?? newToken();
      const startedAt = Date.now();
      try {
        const res = await postJson<ActionResponse>(`/api/rooms/${code}`, { type: "join", name, avatar, token });
        sessionRef.current = {
          token: res.token ?? token,
          playerId: res.playerId ?? res.state.me?.id ?? "",
          name,
          avatar,
        };
        saveSession(code, sessionRef.current);
        applyView(res.state, startedAt, Date.now());
        pokeRef.current();
      } catch (e) {
        const f = e as Partial<ApiFailure>;
        throw { error: f.error ?? "network", message: f.message ?? "Impossible de rejoindre." } satisfies ApiFailure;
      }
    },
    [applyView, code],
  );

  return { status, view, offline, api, join };
}

/**
 * Secondes restantes avant `endsAt` (horloge serveur), rafraîchi ~4 fois par seconde.
 * Renvoie null s'il n'y a pas de minuteur.
 */
export function useCountdown(endsAt: number | null, api: Pick<GameApi, "serverNow">): number | null {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (endsAt == null) return;
    const update = () => setLeft(Math.max(0, (endsAt - api.serverNow()) / 1000));
    update();
    const id = setInterval(update, 250);
    return () => clearInterval(id);
  }, [endsAt, api]);
  return endsAt == null ? null : left;
}
