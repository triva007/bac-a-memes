"use client";

/**
 * PACK MÉMORISÉ — les images qu'un joueur a ajoutées sont gardées sur son
 * appareil (IndexedDB, base `bam`, magasin `pack`) pour être rechargées en un
 * tap dans une prochaine salle.
 *
 * Tout est protégé : IndexedDB absent (navigation privée, vieux navigateur),
 * quota dépassé, base verrouillée… chaque fonction renvoie une valeur neutre
 * et l'appli continue sans mémoriser. Aucune fonction ne lève d'exception.
 */
import { useSyncExternalStore } from "react";

const DB_NAME = "bam";
const STORE = "pack";
/** Nombre maximal d'images mémorisées (= taille maximale du pack d'une salle). */
export const PACK_MAX = 60;
const THUMB_SIDE = 240;

/** Ce que l'interface garde en mémoire : pas l'image entière, seulement sa vignette. */
export interface PackMeta {
  /** empreinte de l'image compressée */
  id: string;
  w: number;
  h: number;
  /** petite data URL JPEG pour l'aperçu ("" si la vignette n'a pas pu être faite) */
  thumb: string;
  addedAt: number;
}

interface PackRecord extends PackMeta {
  /** data URL JPEG compressée (≈ 100-300 Ko), telle qu'elle a été envoyée */
  dataUrl: string;
}

export interface PackImage {
  dataUrl: string;
  w: number;
  h: number;
}

// ---------------------------------------------------------------- outils image

/** Empreinte rapide (2 × FNV-1a 32 bits + longueur) : sert uniquement à dédoublonner. */
export function fingerprint(dataUrl: string): string {
  let a = 0x811c9dc5;
  let b = 0x01000193;
  for (let i = 0; i < dataUrl.length; i++) {
    const c = dataUrl.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193);
    b = Math.imul(b + c, 0x85ebca6b) ^ (b >>> 13);
  }
  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, "0");
  return `${dataUrl.length.toString(36)}-${hex(a)}${hex(b)}`;
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(",");
  const mime = /^data:([^;,]+)/.exec(dataUrl)?.[1] ?? "image/jpeg";
  const bin = atob(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function makeThumb(img: PackImage): Promise<string> {
  try {
    const bitmap = await createImageBitmap(dataUrlToBlob(img.dataUrl));
    const scale = Math.min(1, THUMB_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    return canvas.toDataURL("image/jpeg", 0.72);
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------- IndexedDB

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openOnce(version?: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = version === undefined ? indexedDB.open(DB_NAME) : indexedDB.open(DB_NAME, version);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("blocked"));
  });
}

function openDb(): Promise<IDBDatabase | null> {
  if (!dbPromise) {
    dbPromise = (async () => {
      try {
        if (typeof indexedDB === "undefined") return null;
        let db = await openOnce();
        // base déjà créée sans notre magasin : on monte la version pour l'ajouter
        if (!db.objectStoreNames.contains(STORE)) {
          const next = db.version + 1;
          db.close();
          db = await openOnce(next);
        }
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        return db;
      } catch {
        return null;
      }
    })();
  }
  return dbPromise;
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("abort"));
  });
}

function ask<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function readAll(): Promise<PackMeta[]> {
  try {
    const db = await openDb();
    if (!db) return [];
    const out: PackMeta[] = [];
    await new Promise<void>((resolve, reject) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).openCursor();
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) return resolve();
        const r = cursor.value as Partial<PackRecord>;
        if (typeof r.id === "string" && typeof r.dataUrl === "string") {
          // on ne garde pas `dataUrl` en mémoire : 60 images feraient ~15 Mo de chaînes
          out.push({ id: r.id, w: Number(r.w) || 1000, h: Number(r.h) || 1000, thumb: typeof r.thumb === "string" ? r.thumb : "", addedAt: Number(r.addedAt) || 0 });
        }
        cursor.continue();
      };
    });
    return out.sort((x, y) => x.addedAt - y.addedAt);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------- état partagé

const EMPTY: PackMeta[] = [];
let cache: PackMeta[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function publish(next: PackMeta[]) {
  cache = next;
  for (const l of listeners) l();
}

async function refresh(): Promise<void> {
  publish(await readAll());
  loaded = true;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!loaded) void refresh();
  return () => {
    listeners.delete(listener);
  };
}

/** Liste des images mémorisées sur cet appareil (vide tant qu'elle n'est pas lue, ou si IndexedDB manque). */
export function useSavedPack(): PackMeta[] {
  return useSyncExternalStore(
    subscribe,
    () => cache,
    () => EMPTY,
  );
}

/** Image entière d'une entrée du pack, lue à la demande au moment de l'envoi. */
export async function getPackImage(id: string): Promise<PackImage | null> {
  try {
    const db = await openDb();
    if (!db) return null;
    const r = (await ask(db.transaction(STORE, "readonly").objectStore(STORE).get(id))) as PackRecord | undefined;
    return r && typeof r.dataUrl === "string" ? { dataUrl: r.dataUrl, w: r.w, h: r.h } : null;
  } catch {
    return null;
  }
}

/**
 * Mémorise une image compressée. Sans effet si elle y est déjà, si le pack
 * est plein ou si le stockage refuse. Renvoie l'empreinte de l'image.
 */
export async function rememberImage(img: PackImage, id = fingerprint(img.dataUrl)): Promise<string> {
  try {
    const db = await openDb();
    if (!db) return id;
    if (!loaded) await refresh();
    if (cache.some((p) => p.id === id) || cache.length >= PACK_MAX) return id;
    const record: PackRecord = { id, w: img.w, h: img.h, thumb: await makeThumb(img), addedAt: Date.now(), dataUrl: img.dataUrl };
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record);
    await done(tx);
    if (!cache.some((p) => p.id === id)) publish([...cache, { id, w: record.w, h: record.h, thumb: record.thumb, addedAt: record.addedAt }]);
  } catch {
    /* quota dépassé, base indisponible… : on joue sans mémoriser */
  }
  return id;
}

export async function forgetImage(id: string): Promise<void> {
  publish(cache.filter((p) => p.id !== id));
  try {
    const db = await openDb();
    if (!db) return;
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    await done(tx);
  } catch {
    /* rien */
  }
}

export async function clearPack(): Promise<void> {
  publish(EMPTY);
  try {
    const db = await openDb();
    if (!db) return;
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    await done(tx);
  } catch {
    /* rien */
  }
}

// ---------------------------------------------------------------- correspondance pack → salle
//
// Pour savoir ce qui est déjà dans la salle sans comparer les octets, on note
// au moment de l'envoi « empreinte de l'image mémorisée → id de l'image dans la
// salle », par code de salle, dans sessionStorage.

export type PackMap = Record<string, string>;
const mapKey = (code: string) => `bam:pack-map:${code.toUpperCase()}`;

export function loadPackMap(code: string): PackMap {
  try {
    const raw = window.sessionStorage.getItem(mapKey(code));
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return {};
    const out: PackMap = {};
    for (const [k, v] of Object.entries(parsed)) if (typeof v === "string") out[k] = v;
    return out;
  } catch {
    return {};
  }
}

export function savePackMap(code: string, map: PackMap): void {
  try {
    window.sessionStorage.setItem(mapKey(code), JSON.stringify(map));
  } catch {
    /* stockage indisponible : au pire on renverra une image déjà présente */
  }
}
