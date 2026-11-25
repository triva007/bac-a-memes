import { Gallery } from "./Gallery";

export const metadata = { title: "Galerie des gabarits — dev" };

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * Galerie de dev des gabarits : /dev/gabarits
 *   ?fill=vide|court|long   état de remplissage initial
 *   ?only=<id>[,<id>…]      n'affiche que ces gabarits
 *   ?cat=<catégorie>        n'affiche qu'une catégorie
 *   ?sheet=1                planche contact : les 3 états côte à côte à 340 px
 *   ?section=gabarits|stickers|decors|perso|perf   n'affiche qu'une section
 */
export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const fill = one(sp.fill);
  return (
    <Gallery
      initialFill={fill === "court" || fill === "long" ? fill : "vide"}
      only={one(sp.only)?.split(",").filter(Boolean) ?? null}
      cat={one(sp.cat) ?? null}
      sheet={one(sp.sheet) === "1"}
      section={one(sp.section) ?? null}
    />
  );
}
