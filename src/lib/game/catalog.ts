/**
 * Catalogue réel vu par le moteur : le registre de gabarits (`@/lib/templates`)
 * réduit aux métadonnées dont le serveur a besoin (id, catégorie, champs).
 */
import { TEMPLATES } from "@/lib/templates";
import type { MemeTemplate } from "@/lib/templates/types";
import type { TemplateMeta } from "./types";

export function toTemplateMeta(templates: readonly Pick<MemeTemplate, "id" | "category" | "fields">[]): TemplateMeta[] {
  const seen = new Set<string>();
  const out: TemplateMeta[] = [];
  for (const t of templates) {
    if (!t || typeof t.id !== "string" || seen.has(t.id)) continue;
    seen.add(t.id);
    out.push({
      id: t.id,
      category: t.category,
      fields: (t.fields ?? []).map((f) => ({ id: f.id, maxLength: Math.max(1, Math.min(2000, Math.floor(f.maxLength) || 1)) })),
    });
  }
  return out;
}

let cached: TemplateMeta[] | null = null;

/** Même tableau à chaque appel (le moteur indexe le catalogue par identité). */
export function getCatalog(): TemplateMeta[] {
  cached ??= toTemplateMeta(TEMPLATES);
  return cached;
}
