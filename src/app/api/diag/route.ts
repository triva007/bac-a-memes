import { randomBytes } from "node:crypto";
import { SITUATIONS } from "@/lib/content/situations";
import { getCatalog } from "@/lib/game/catalog";
import { NO_STORE_HEADERS } from "@/lib/game/service";
import { getStore } from "@/lib/game/store";

export const dynamic = "force-dynamic";

/** identité de CETTE instance (processus) : change à chaque démarrage à froid */
const INSTANCE_ID = randomBytes(6).toString("hex");
const STARTED_AT = Date.now();
const TTL_SECONDS = 600;

function describe(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

interface Probe {
  ok: boolean;
  setMs?: number;
  getMs?: number;
  deleteMs?: number;
  match?: boolean;
  error?: string;
}

/** aller-retour set/get/delete sur une clé de test, avec latences */
async function probe(kv: { get(k: string): Promise<unknown>; set(k: string, v: unknown, ttl: number): Promise<void>; delete(k: string): Promise<void> }): Promise<Probe> {
  const key = `diag:probe:${INSTANCE_ID}:${randomBytes(4).toString("hex")}`;
  const value = { nonce: randomBytes(8).toString("hex"), at: Date.now() };
  try {
    const t0 = performance.now();
    await kv.set(key, value, 60);
    const t1 = performance.now();
    const read = (await kv.get(key)) as { nonce?: string } | null;
    const t2 = performance.now();
    await kv.delete(key);
    const t3 = performance.now();
    return {
      ok: read?.nonce === value.nonce,
      match: read?.nonce === value.nonce,
      setMs: Math.round((t1 - t0) * 10) / 10,
      getMs: Math.round((t2 - t1) * 10) / 10,
      deleteMs: Math.round((t3 - t2) * 10) / 10,
    };
  } catch (error) {
    return { ok: false, error: describe(error) };
  }
}

/**
 * GET /api/diag — auto-test du stockage, pour vérifier la prod.
 * Ne renvoie jamais d'erreur 500 : les erreurs sont dans le JSON.
 * `lastVisit` montre si une AUTRE instance a écrit dans le cache partagé :
 * en rappelant la route plusieurs fois, on vérifie que les instances se voient.
 */
export async function GET(): Promise<Response> {
  const now = Date.now();
  const report: Record<string, unknown> = {
    ok: true,
    now,
    instanceId: INSTANCE_ID,
    instanceAgeMs: now - STARTED_AT,
    region: process.env.VERCEL_REGION ?? null,
    vercel: Boolean(process.env.VERCEL),
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? null,
  };
  const errors: string[] = [];

  try {
    const store = getStore();
    report.kv = store.kind;
    report.storeStats = store.stats;
    report.local = await probe(store.local);
    if (store.shared) {
      const shared = store.shared;
      report.shared = await probe(shared);
      try {
        const key = "diag:last-visit";
        const previous = (await shared.get(key)) as { instanceId?: string; at?: number } | null;
        await shared.set(key, { instanceId: INSTANCE_ID, at: now }, TTL_SECONDS);
        report.lastVisit = previous
          ? {
              instanceId: previous.instanceId ?? null,
              ageMs: typeof previous.at === "number" ? now - previous.at : null,
              fromOtherInstance: previous.instanceId !== INSTANCE_ID,
            }
          : null;
      } catch (error) {
        errors.push(`lastVisit: ${describe(error)}`);
      }
    } else {
      report.shared = null;
    }
  } catch (error) {
    errors.push(`store: ${describe(error)}`);
  }

  try {
    report.templates = getCatalog().length;
  } catch (error) {
    errors.push(`templates: ${describe(error)}`);
  }
  try {
    report.situations = SITUATIONS.length;
  } catch (error) {
    errors.push(`situations: ${describe(error)}`);
  }

  if (errors.length > 0) {
    report.ok = false;
    report.errors = errors;
  }
  try {
    return Response.json(report, { status: 200, headers: NO_STORE_HEADERS });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, errors: [describe(error)] }), {
      status: 200,
      headers: { ...NO_STORE_HEADERS, "Content-Type": "application/json" },
    });
  }
}
