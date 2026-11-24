import { serviceDeps } from "@/lib/game/http";
import { MAX_IMAGE_BODY_BYTES, addImageRequest, errorResult, readJsonBody, toResponse } from "@/lib/game/service";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ code: string }> };

/** POST /api/rooms/[code]/images — ajoute une image au pack perso. Corps : AddImageRequest. */
export async function POST(request: Request, context: Context): Promise<Response> {
  const { code } = await context.params;
  const body = await readJsonBody(request, MAX_IMAGE_BODY_BYTES);
  if (!body.ok) {
    return toResponse(body.reason === "too_big" ? errorResult("image_too_big", "Image trop lourde.") : errorResult("invalid", "JSON invalide."));
  }
  return toResponse(await addImageRequest(serviceDeps(), code, body.value));
}
