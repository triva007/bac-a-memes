import type { MemeTemplate } from "./types";

/** Registre de tous les gabarits. Rempli à partir de `./library/**`. */
export const TEMPLATES: MemeTemplate[] = [];

const BY_ID = new Map(TEMPLATES.map((t) => [t.id, t]));

export function getTemplate(id: string): MemeTemplate | undefined {
  return BY_ID.get(id);
}
