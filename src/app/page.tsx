import { redirect } from "next/navigation";
import { HomeScreen } from "@/features/home/HomeScreen";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/** Accueil. Lien profond : `/?code=ABCD` mène au même endroit que `/r/ABCD`. */
export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.code) ? sp.code[0] : sp.code;
  const code = (raw ?? "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 4);
  if (code.length === 4) redirect(`/r/${code}`);
  return <HomeScreen initialCode={code} />;
}
