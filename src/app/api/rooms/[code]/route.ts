import { serviceDeps } from "@/lib/game/http";
import { MAX_BODY_BYTES, actionRequest, errorResult, getRoomRequest, readJsonBody, toResponse } from "@/lib/game/service";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ code: string }> };

/**
 * GET /api/rooms/[code]?token=T&v=N — état de la salle vu par ce joueur
 * (sans token : spectateur). Si `v` est la version courante : UnchangedResponse.
 */
export async function GET(request: Request, context: Context): Promise<Response> {
  const { code } = await context.params;
  const url = new URL(request.url);
  return toResponse(await getRoomRequest(serviceDeps(), code, url.searchParams.get("token"), url.searchParams.get("v")));
}

/** POST /api/rooms/[code] — action d'un joueur. Corps : ActionRequest. Réponse : ActionResponse. */
export async function POST(request: Request, context: Context): Promise<Response> {
  const { code } = await context.params;
  const body = await readJsonBody(request, MAX_BODY_BYTES);
  if (!body.ok) return toResponse(errorResult("invalid", body.reason === "too_big" ? "Requête trop volumineuse." : "JSON invalide."));
  return toResponse(await actionRequest(serviceDeps(), code, body.value));
}
