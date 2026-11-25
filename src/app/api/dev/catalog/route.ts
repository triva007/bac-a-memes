import { getCatalog } from "@/lib/game/catalog";

export const dynamic = "force-dynamic";

/** Liste publique des gabarits (ids + champs) — sert au simulateur de joueurs `scripts/bots.mjs`. */
export function GET() {
  return Response.json(getCatalog(), { headers: { "Cache-Control": "no-store" } });
}
