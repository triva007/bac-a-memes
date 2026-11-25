/** Session locale du joueur (localStorage). Tout est protégé : navigation privée, SSR. */
export interface StoredSession {
  token: string;
  playerId: string;
  name: string;
  avatar: string;
}

export interface StoredProfile {
  name: string;
  avatar: string;
}

const sessionKey = (code: string) => `bam:session:${code.toUpperCase()}`;
const PROFILE_KEY = "bam:profile";

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* stockage indisponible : on continue sans */
  }
}

export function loadSession(code: string): StoredSession | null {
  const s = read<StoredSession>(sessionKey(code));
  return s && typeof s.token === "string" && typeof s.playerId === "string" ? s : null;
}

export function saveSession(code: string, session: StoredSession) {
  write(sessionKey(code), session);
  write(PROFILE_KEY, { name: session.name, avatar: session.avatar });
}

export function clearSession(code: string) {
  try {
    window.localStorage.removeItem(sessionKey(code));
  } catch {
    /* rien */
  }
}

export function loadProfile(): StoredProfile | null {
  return read<StoredProfile>(PROFILE_KEY);
}

export function saveProfile(profile: StoredProfile) {
  write(PROFILE_KEY, profile);
}

/** Jeton secret généré côté client (le serveur l'adopte) : rend le "join" rejouable sans doublon. */
export function newToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
