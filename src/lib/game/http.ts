/** Dépendances réelles des routes (store du processus, horloge système, catalogue réel). */
import { getCatalog } from "./catalog";
import type { ServiceDeps } from "./service";
import { getStore } from "./store";

export function serviceDeps(): ServiceDeps {
  return { store: getStore(), catalog: getCatalog(), now: Date.now };
}
