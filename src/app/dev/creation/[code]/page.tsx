"use client";

/**
 * Page de dev de l'écran de création : /dev/creation/CODE
 *   ?spectateur=1   regarde la salle sans joueur (écran d'attente)
 * Imite le shell : barre du haut de 56 px (code, manche, minuteur) + conteneur de hauteur définie.
 */

import { use, useState } from "react";
import { PersoImagesProvider } from "@/components/meme/perso";
import { CreateScreen } from "@/features/create/CreateScreen";
import type { ApiFailure } from "@/features/game/props";
import { useCountdown, useRoom } from "@/features/game/useRoom";

type Search = Record<string, string | string[] | undefined>;

export default function Page({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<Search> }) {
  const { code } = use(params);
  const sp = use(searchParams);
  return <DevCreation code={code.toUpperCase()} spectator={sp.spectateur === "1"} />;
}

function DevCreation({ code, spectator }: { code: string; spectator: boolean }) {
  const { status, view, offline, api, join } = useRoom(code, { spectator });
  const left = useCountdown(view?.phaseEndsAt ?? null, api);
  const [name, setName] = useState("Testeur");
  const [error, setError] = useState<string | null>(null);

  const doJoin = () => {
    setError(null);
    join(name.trim() || "Testeur", "fox").catch((e: ApiFailure) => setError(e.message));
  };
  const act = (type: "start" | "skip") => {
    setError(null);
    api.send({ type }).catch((e: ApiFailure) => setError(e.message));
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex h-14 flex-none items-center gap-3 border-b-2 border-paper/10 bg-ink-2 px-4 font-display font-extrabold">
        <span className="rounded-lg bg-fluo-yellow px-2 py-0.5 text-ink">{code}</span>
        <span className="text-sm text-paper/80">{view ? (view.phase === "create" ? `Manche ${view.round}/${view.totalRounds}` : view.phase) : status}</span>
        {offline ? <span className="text-xs text-fluo-orange">hors ligne</span> : null}
        <span className="ml-auto text-xl tabular-nums" data-testid="dev-timer">
          {left == null ? "–" : Math.ceil(left)}
        </span>
      </header>

      <main className="min-h-0 flex-1" style={{ height: "calc(100dvh - 56px)" }}>
        {status === "loading" ? (
          <p className="p-6 text-center text-muted">Chargement…</p>
        ) : status === "not-found" ? (
          <p className="p-6 text-center font-display text-xl font-extrabold">Salle {code} introuvable.</p>
        ) : status === "kicked" ? (
          <p className="p-6 text-center font-display text-xl font-extrabold">Expulsé de la salle.</p>
        ) : status === "need-join" ? (
          <div className="mx-auto flex max-w-sm flex-col gap-3 p-6">
            <p className="font-display text-xl font-extrabold">Rejoindre {code} (page de dev)</p>
            <input className="field" value={name} maxLength={16} onChange={(e) => setName(e.target.value)} aria-label="Pseudo de test" data-testid="dev-name" />
            <button type="button" className="btn" onClick={doJoin} data-testid="dev-join">
              Rejoindre
            </button>
            {error ? <p className="text-sm font-semibold text-fluo-orange">{error}</p> : null}
          </div>
        ) : view && view.phase === "create" ? (
          <PersoImagesProvider code={view.code} images={view.images}>
            <CreateScreen view={view} api={api} />
          </PersoImagesProvider>
        ) : view ? (
          <div className="mx-auto flex max-w-sm flex-col gap-3 p-6 text-center">
            <p className="font-display text-xl font-extrabold" data-testid="dev-phase">
              Phase « {view.phase} » — l&apos;écran de création s&apos;affiche pendant « create ».
            </p>
            <p className="text-sm text-muted">
              {view.players.filter((p) => p.connected).length} joueur(s) connecté(s){view.me ? "" : " · spectateur"}
            </p>
            {view.me?.isHost && view.phase === "lobby" ? (
              <button type="button" className="btn btn-green" onClick={() => act("start")}>
                Lancer la partie
              </button>
            ) : null}
            {view.me?.isHost && view.phase !== "lobby" && view.phase !== "final" ? (
              <button type="button" className="btn btn-paper" onClick={() => act("skip")}>
                Passer
              </button>
            ) : null}
            {error ? <p className="text-sm font-semibold text-fluo-orange">{error}</p> : null}
          </div>
        ) : null}
      </main>
    </div>
  );
}
