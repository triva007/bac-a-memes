// Génère `emoji-index.gen.ts` (index compact pour la recherche) à partir de
// `emoji-data.json`, qui reste la source de vérité et n'est jamais modifié.
//
//   node src/lib/content/gen-emoji-index.mjs
//
// Format : une ligne par emoji, `id|libellé|groupe(0-7)|tag;tag;…|caractère`.
// ~105 Ko au lieu de 220 Ko de JSON, et une seule chaîne à analyser.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const GROUPS = ["visages", "gens", "animaux", "bouffe", "lieux", "activites", "objets", "symboles"];

export function buildIndex(data) {
  return data
    .map((e) => {
      const g = GROUPS.indexOf(e.g);
      if (g < 0) throw new Error(`groupe inconnu : ${e.g} (${e.id})`);
      const fields = [e.id, e.fr, String(g), e.tags.join(";"), e.ch];
      for (const f of [e.id, e.fr, e.ch, ...e.tags]) {
        if (/[|;\n]/.test(f)) throw new Error(`séparateur dans les données : ${e.id}`);
      }
      return fields.join("|");
    })
    .join("\n");
}

export function render(data) {
  return (
    "// FICHIER GÉNÉRÉ par gen-emoji-index.mjs à partir de emoji-data.json — ne pas modifier à la main.\n" +
    `export const EMOJI_INDEX: string = ${JSON.stringify(buildIndex(data))};\n`
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const data = JSON.parse(readFileSync(join(here, "emoji-data.json"), "utf8"));
  const out = render(data);
  writeFileSync(join(here, "emoji-index.gen.ts"), out);
  console.log(`emoji-index.gen.ts : ${data.length} emojis, ${Buffer.byteLength(out)} octets`);
}
