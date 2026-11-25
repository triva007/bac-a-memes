"use client";

/**
 * Page de DEV pour les écrans vote / révélation / classement / podium :
 *   /dev/partie/ABCD?nom=Zoé&avatar=fox      rejoint la salle ABCD comme joueur de test
 *   /dev/partie/ABCD?spectateur=1            simple spectateur (me = null)
 * Si une session existe déjà pour cette salle dans ce navigateur (ex. hôte créé
 * par un script), elle est réutilisée. La barre du haut imite celle du vrai shell (56 px).
 */
import { use, useEffect, useRef } from "react";
import { PersoImagesProvider } from "@/components/meme/perso";
import { FinalScreen } from "@/features/final/FinalScreen";
import { useCountdown, useRoom } from "@/features/game/useRoom";
import { ResultsScreen } from "@/features/results/ResultsScreen";
import { VoteScreen } from "@/features/vote/VoteScreen";

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default function Page({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<Search> }) {
  const { code } = use(params);
  const sp = use(searchParams);
  const spectator = one(sp.spectateur) === "1";
  const name = one(sp.nom) ?? "Testeur";
  const avatar = one(sp.avatar) ?? "nerd-face";
  const { status, view, offline, api, join } = useRoom(code, { spectator });
  const left = useCountdown(view?.phaseEndsAt ?? null, api);

  const joining = useRef(false);
  useEffect(() => {
    if (status !== "need-join" || spectator || joining.current) return;
    joining.current = true;
    join(name, avatar)
      .catch((e) => console.warn("join impossible", e))
      .finally(() => {
        joining.current = false;
      });
  }, [status, spectator, join, name, avatar]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <div className="flex h-14 flex-none items-center justify-between gap-3 border-b-[3px] border-ink bg-ink-2 px-3 font-display text-sm font-extrabold">
        <span className="rounded-md bg-paper px-2 py-0.5 text-ink">{code.toUpperCase()}</span>
        <span className="text-paper/80">
          {view ? `${view.phase} · manche ${view.round}/${view.totalRounds}` : status}
          {offline ? " · hors ligne" : ""}
        </span>
        <span className="tabular-nums text-fluo-yellow">{left == null ? "—" : `${Math.ceil(left)} s`}</span>
      </div>
      <main className="min-h-0 flex-1" data-phase={view?.phase ?? status}>
        {!view ? (
          <p className="p-6 text-center text-paper/70">{status}…</p>
        ) : (
          <PersoImagesProvider code={view.code} images={view.images}>
            {view.phase === "vote" || view.phase === "reveal" ? (
              <VoteScreen view={view} api={api} />
            ) : view.phase === "results" ? (
              <ResultsScreen view={view} api={api} />
            ) : view.phase === "final" ? (
              <FinalScreen view={view} api={api} />
            ) : (
              <p className="p-6 text-center font-display text-xl font-extrabold text-paper/70">
                Phase « {view.phase} » — {view.players.filter((p) => p.connected).length} joueurs. Cette page de dev n&apos;affiche que vote, révélation,
                classement et podium.
              </p>
            )}
          </PersoImagesProvider>
        )}
      </main>
    </div>
  );
}
