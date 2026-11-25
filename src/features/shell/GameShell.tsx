"use client";

import { Component, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { PersoImagesProvider } from "@/components/meme/perso";
import { Icon } from "@/components/ui/Icon";
import { CreateScreen } from "@/features/create/CreateScreen";
import { FinalScreen } from "@/features/final/FinalScreen";
import type { GameApi, PhaseProps } from "@/features/game/props";
import { useRoom } from "@/features/game/useRoom";
import { LobbyScreen } from "@/features/lobby/LobbyScreen";
import { ResultsScreen } from "@/features/results/ResultsScreen";
import { VoteScreen } from "@/features/vote/VoteScreen";
import type { RoomView } from "@/lib/game/types";
import { sfx } from "@/lib/sfx";
import { GameMenu } from "./GameMenu";
import { JoinScreen } from "./JoinScreen";
import { RoundIntro } from "./RoundIntro";
import { KickedScreen, LeavingScreen, LoadingScreen, NotFoundScreen } from "./StatusScreens";
import { TopBar } from "./TopBar";
import { useWakeLock } from "./useWakeLock";

/** Clé d'écran : vote et révélation partagent le même écran, qui ne doit pas être remonté entre deux mèmes. */
function screenKey(view: RoomView): string {
  switch (view.phase) {
    case "lobby":
      return "lobby";
    case "create":
      return `create:${view.round}`;
    case "vote":
    case "reveal":
      return `vote:${view.round}`;
    case "results":
      return `results:${view.round}`;
    case "final":
      return "final";
  }
}

function PhaseScreen({ view, api }: PhaseProps) {
  switch (view.phase) {
    case "lobby":
      return <LobbyScreen view={view} api={api} />;
    case "create":
      return <CreateScreen view={view} api={api} />;
    case "vote":
    case "reveal":
      return <VoteScreen view={view} api={api} />;
    case "results":
      return <ResultsScreen view={view} api={api} />;
    case "final":
      return <FinalScreen view={view} api={api} />;
  }
}

/** Un écran qui plante ne doit pas emporter toute la partie : on propose de recharger, et la phase suivante repart propre. */
class PhaseBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error("[Bac à Mèmes] écran de phase en erreur", error);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="grid h-full place-items-center p-6 text-center">
        <div className="card max-w-[360px] rotate-1 p-5">
          <p className="font-display text-[1.4rem] font-extrabold leading-tight">Oups, cet écran a bugué.</p>
          <p className="mt-1.5 text-[0.95rem] font-medium text-ink/70">La partie continue. Recharge la page pour revenir dedans.</p>
          <button type="button" className="btn mt-4 w-full" onClick={() => window.location.reload()}>
            Recharger
          </button>
        </div>
      </div>
    );
  }
}

function OfflineBanner({ offline }: { offline: boolean }) {
  return (
    <AnimatePresence>
      {offline ? (
        <motion.div
          role="status"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="pointer-events-none absolute inset-x-0 top-2 z-40 flex justify-center px-3"
        >
          <div className="flex items-center gap-2 rounded-full border-[2.5px] border-ink bg-fluo-orange px-3.5 py-1.5 text-[0.9rem] font-bold text-ink shadow-[3px_3px_0_0_rgba(0,0,0,0.55)]">
            <Icon name="wifi-off" size={18} />
            Connexion perdue, on réessaie…
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function GameFrame({ view, api, offline, onLeave }: { view: RoomView; api: GameApi; offline: boolean; onLeave: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const inGame = view.phase === "create" || view.phase === "vote" || view.phase === "reveal" || view.phase === "results";

  useWakeLock(true);

  // prévenir avant de quitter la page par erreur en pleine partie (pas dans le salon)
  useEffect(() => {
    if (!inGame) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [inGame]);

  const key = screenKey(view);

  return (
    <PersoImagesProvider code={view.code} images={view.images}>
      <div className="flex h-dvh flex-col overflow-hidden">
        <TopBar view={view} api={api} onMenu={() => setMenuOpen(true)} />
        <div className="relative min-h-0 flex-1">
          <OfflineBanner offline={offline} />
          <AnimatePresence mode="wait" initial={false}>
            <motion.main
              key={key}
              className="absolute inset-0 flex flex-col"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <PhaseBoundary>
                <PhaseScreen view={view} api={api} />
              </PhaseBoundary>
            </motion.main>
          </AnimatePresence>
          {view.phase === "create" ? <RoundIntro key={`${view.code}:${view.round}`} view={view} api={api} /> : null}
        </div>
      </div>
      <GameMenu open={menuOpen} onClose={() => setMenuOpen(false)} view={view} api={api} onLeave={onLeave} />
    </PersoImagesProvider>
  );
}

/** Page de jeu `/r/[code]` : choisit quoi afficher selon l'état de la connexion à la salle. */
export function GameShell({ code }: { code: string }) {
  const router = useRouter();
  const { status, view, offline, api, join } = useRoom(code);
  const [leaving, setLeaving] = useState(false);

  // débloque le son au tout premier geste
  useEffect(() => {
    const unlock = () => sfx.unlock();
    window.addEventListener("pointerdown", unlock, { once: true, passive: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const leave = () => {
    setLeaving(true);
    void api.leave().finally(() => router.replace("/"));
  };

  let content: ReactNode;
  if (leaving) content = <LeavingScreen />;
  else if (status === "not-found") content = <NotFoundScreen code={code} />;
  else if (status === "kicked") content = <KickedScreen code={code} />;
  else if (status === "need-join" && view) content = <JoinScreen view={view} join={join} />;
  else if (status === "ok" && view) content = <GameFrame view={view} api={api} offline={offline} onLeave={leave} />;
  else content = <LoadingScreen code={code} />;

  return <MotionConfig reducedMotion="user">{content}</MotionConfig>;
}
