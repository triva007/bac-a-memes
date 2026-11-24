import { serviceDeps } from "@/lib/game/http";
import { deleteImageRequest, getImageRequest, toResponse } from "@/lib/game/service";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ code: string; id: string }> };

/**
 * GET /api/rooms/[code]/images/[id] — l'image, en binaire. Pas de jeton :
 * l'id aléatoire fait office de secret. Immuable, donc cache d'un an.
 */
export async function GET(_request: Request, context: Context): Promise<Response> {
  const { code, id } = await context.params;
  const image = await getImageRequest(serviceDeps(), code, id);
  if (!image.found) return toResponse(image.result);
  return new Response(new Uint8Array(image.bytes), {
    status: 200,
    headers: {
      "Content-Type": image.mime,
      "Content-Length": String(image.bytes.length),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": "inline",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}

/** DELETE /api/rooms/[code]/images/[id]?token=T — hôte ou auteur de l'image. Réponse : ActionResponse. */
export async function DELETE(request: Request, context: Context): Promise<Response> {
  const { code, id } = await context.params;
  const token = new URL(request.url).searchParams.get("token");
  return toResponse(await deleteImageRequest(serviceDeps(), code, id, token));
}
