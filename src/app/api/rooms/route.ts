import { serviceDeps } from "@/lib/game/http";
import { MAX_BODY_BYTES, createRoomRequest, errorResult, readJsonBody, toResponse } from "@/lib/game/service";

export const dynamic = "force-dynamic";

/** POST /api/rooms — crée une salle. Corps : CreateRoomRequest. Réponse : JoinResponse. */
export async function POST(request: Request): Promise<Response> {
  const body = await readJsonBody(request, MAX_BODY_BYTES);
  if (!body.ok) return toResponse(errorResult("invalid", body.reason === "too_big" ? "Requête trop volumineuse." : "JSON invalide."));
  return toResponse(await createRoomRequest(serviceDeps(), body.value));
}
