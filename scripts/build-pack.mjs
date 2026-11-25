#!/usr/bin/env node
/**
 * Pack intégré : parcourt public/pack/, lit les dimensions de chaque image
 * (en-têtes PNG / JPEG / GIF / WebP lus à la main, aucune dépendance) et écrit
 * src/lib/templates/pack-manifest.json : [{ id, file, name, w, h }].
 * Lancé avant `dev` et `build` (predev / prebuild). N'échoue JAMAIS : un
 * fichier illisible est ignoré avec un avertissement.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PACK_DIR = join(ROOT, "public", "pack");
const OUT = join(ROOT, "src", "lib", "templates", "pack-manifest.json");
const EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const warn = (msg) => console.warn(`[pack] ⚠ ${msg}`);

function sizePng(b) {
  if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47 || b.toString("ascii", 12, 16) !== "IHDR") return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

function sizeGif(b) {
  if (b.length < 10 || !/^GIF8[79]a$/.test(b.toString("ascii", 0, 6))) return null;
  return { w: b.readUInt16LE(6), h: b.readUInt16LE(8) };
}

function sizeJpeg(b) {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) {
      i++;
      continue;
    }
    const m = b[i + 1];
    if (m === 0xff) {
      i++;
      continue;
    }
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) {
      i += 2;
      continue;
    }
    // SOF0..SOF15 sauf DHT (C4), JPG (C8), DAC (CC)
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
    }
    i += 2 + b.readUInt16BE(i + 2);
  }
  return null;
}

function sizeWebp(b) {
  if (b.length < 30 || b.toString("ascii", 0, 4) !== "RIFF" || b.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = b.toString("ascii", 12, 16);
  if (chunk === "VP8X") return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
  if (chunk === "VP8 ") return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  if (chunk === "VP8L") {
    const bits = b.readUInt32LE(21);
    return { w: 1 + (bits & 0x3fff), h: 1 + ((bits >> 14) & 0x3fff) };
  }
  return null;
}

/** Dimensions d'une image d'après son contenu (l'extension peut mentir). */
export function imageSize(buffer) {
  for (const read of [sizePng, sizeJpeg, sizeGif, sizeWebp]) {
    try {
      const s = read(buffer);
      if (s && s.w > 0 && s.h > 0) return s;
    } catch {
      /* en-tête tronqué : on essaie le format suivant */
    }
  }
  return null;
}

const stem = (file) => file.slice(0, file.length - extname(file).length);

/** "Ah_Denis (2).JPG" -> "ah-denis-2" */
export function slugify(file) {
  return (
    stem(file)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "image"
  );
}

/** "ah-denis.jpg" -> "Ah denis" */
export function displayName(file) {
  const s = stem(file).replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim() || "Image";
  return (s.charAt(0).toUpperCase() + s.slice(1)).slice(0, 60);
}

export function buildManifest(dir = PACK_DIR) {
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir)
    .filter((f) => !f.startsWith(".") && f !== "LISEZ-MOI.txt")
    .sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base", numeric: true }) || (a < b ? -1 : 1));
  const used = new Set();
  const out = [];
  for (const file of files) {
    try {
      const path = join(dir, file);
      if (!statSync(path).isFile()) continue;
      if (!EXTENSIONS.has(extname(file).toLowerCase())) {
        warn(`« ${file} » ignoré : format non accepté (jpg, jpeg, png, webp, gif).`);
        continue;
      }
      const buffer = readFileSync(path);
      const size = imageSize(buffer);
      if (!size) {
        warn(`« ${file} » ignoré : image illisible.`);
        continue;
      }
      if (buffer.length > 2 * 1024 * 1024) warn(`« ${file} » pèse ${(buffer.length / 1048576).toFixed(1)} Mo (2 Mo max conseillé).`);
      const base = `pack-${slugify(file)}`;
      let id = base;
      for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
      used.add(id);
      out.push({ id, file, name: displayName(file), w: size.w, h: size.h });
    } catch (e) {
      warn(`« ${file} » ignoré : ${e instanceof Error ? e.message : e}`);
    }
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const manifest = buildManifest();
    const json = JSON.stringify(manifest, null, 2) + "\n";
    if (!existsSync(OUT) || readFileSync(OUT, "utf8") !== json) writeFileSync(OUT, json);
    console.log(`[pack] ${manifest.length} image(s) dans public/pack → pack-manifest.json`);
  } catch (e) {
    warn(`manifeste non régénéré : ${e instanceof Error ? e.message : e}`);
  }
}
