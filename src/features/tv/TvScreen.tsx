"use client";

/**
 * ÉCRAN DE CLASSE — `/tv/[code]`. Vue spectateur projetée au tableau :
 * aucune interaction pendant la partie, tout avance seul, c'est la source sonore.
 */
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import type { RoomView } from "@/lib/game/types";
import type { GameApi } from "@/features/game/props";
import { useRoom } from "@/features/game/useRoom";
import { PersoImagesProvider } from "@/components/meme/perso";
import { sfx } from "@/lib/sfx";
import { CodeForm } from "./CodeEntry";
import { confettiClear } from "./confetti";
import { useFullscreen, useIdle, useLocation, useSfxMuted, useWakeLock } from "./hooks";
import { BAR_H, PAD, Stage } from "./stage";
import { DISPLAY, Emo, FLUO, HAND, INK, PAPER, hard } from "./ui";
import { LobbyScene } from "./scenes/LobbyScene";
import { CreateScene } from "./scenes/CreateScene";
import { VoteScene } from "./scenes/VoteScene";
import { ResultsScene } from "./scenes/ResultsScene";
import { FinalScene } from "./scenes/FinalScene";

function sceneKey(view: RoomView): string {
  switch (view.phase) {
    case "lobby":
      return "lobby";
    case "create":
      return `create-${view.round}`;
    case "vote":
    case "reveal":
      return `vote-${view.round}`;
    case "results":
      return `results-${view.round}`;
    case "final":
      return "final";
  }
}

function Scene({ view, api }: { view: RoomView; api: GameApi }) {
  switch (view.phase) {
    case "lobby":
      return <LobbyScene view={view} api={api} />;
    case "create":
      return <CreateScene view={view} api={api} />;
    case "vote":
    case "reveal":
      return <VoteScene view={view} api={api} />;
    case "results":
      return <ResultsScene view={view} api={api} />;
    case "final":
      return <FinalScene view={view} api={api} />;
  }
}

export function TvScreen({ code: rawCode }: { code: string }) {
  const code = rawCode.toUpperCase();
  const { status, view, offline, api } = useRoom(code, { spectator: true });
  const [started, setStarted] = useState(false);
  const idle = useIdle();
  const fullscreen = useFullscreen();
  const muted = useSfxMuted();
  useWakeLock(started);

  const start = useCallback(
    (goFullscreen: boolean) => {
      sfx.unlock();
      if (goFullscreen) void fullscreen.enter();
      setStarted(true);
      sfx.play("start");
    },
    [fullscreen],
  );

  const toggleFullscreen = fullscreen.toggle;
  // raccourcis clavier : F = plein écran, M = son (pratique quand la souris est loin)
  useEffect(() => {
    if (!started) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.key === "f" || e.key === "F") void toggleFullscreen();
      if (e.key === "m" || e.key === "M") sfx.toggleMuted();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, toggleFullscreen]);

  useEffect(() => () => confettiClear(), []);

  const notFound = status === "not-found";
  const key = view ? sceneKey(view) : "none";

  return (
    <MotionConfig reducedMotion="user">
      <Stage cursorHidden={started && idle && !notFound}>
        <TopBar
          code={code}
          view={notFound ? null : view}
          controlsVisible={!idle}
          muted={muted}
          fullscreen={fullscreen}
        />

        <div style={{ position: "absolute", left: 0, right: 0, top: BAR_H, bottom: 0 }}>
          {notFound ? (
            <NotFound code={code} />
          ) : !view ? (
            <Loading code={code} />
          ) : (
            <PersoImagesProvider code={view.code} images={view.images}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={key}
                  initial={{ opacity: 0, scale: 0.97, y: 24 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 1.02, y: -18 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  style={{ position: "absolute", inset: 0 }}
                >
                  <Scene view={view} api={api} />
                </motion.div>
              </AnimatePresence>
            </PersoImagesProvider>
          )}
        </div>

        <AnimatePresence>
          {offline && !notFound ? (
            <motion.div
              key="offline"
              role="status"
              initial={{ y: -90, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -90, opacity: 0 }}
              style={{
                ...DISPLAY,
                position: "absolute",
                left: "50%",
                top: 18,
                x: "-50%",
                zIndex: 30,
                display: "flex",
                alignItems: "center",
                gap: 18,
                padding: "14px 34px",
                fontSize: 34,
                color: INK,
                background: FLUO.orange,
                border: `5px solid ${INK}`,
                borderRadius: 24,
                boxShadow: hard(7),
                whiteSpace: "nowrap",
              }}
            >
              <Emo id="satellite-antenna" size={44} />
              Connexion perdue… on réessaie tout seul
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {!started && !notFound ? <StartGate key="gate" code={code} canFullscreen={fullscreen.supported} onStart={start} /> : null}
        </AnimatePresence>
      </Stage>
    </MotionConfig>
  );
}

// ------------------------------------------------------------------ barre du haut

function Logo() {
  return (
    <div style={{ ...DISPLAY, display: "flex", alignItems: "center", gap: 12, fontSize: 46, lineHeight: 1, color: PAPER, whiteSpace: "nowrap" }}>
      <span>Bac à</span>
      <span
        style={{
          color: INK,
          background: FLUO.yellow,
          padding: "6px 14px 8px",
          borderRadius: 12,
          border: `4px solid ${INK}`,
          boxShadow: hard(5),
          transform: "rotate(-2.5deg)",
        }}
      >
        Mèmes
      </span>
    </div>
  );
}

function IconButton({ label, onClick, children, tabbable }: { label: string; onClick: () => void; children: ReactNode; tabbable: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      tabIndex={tabbable ? 0 : -1}
      onClick={onClick}
      className="cursor-pointer transition-transform hover:brightness-110 active:translate-x-[3px] active:translate-y-[3px] focus-visible:outline-[5px] focus-visible:outline-offset-4 focus-visible:outline-[var(--color-fluo-blue)]"
      style={{
        width: 68,
        height: 68,
        display: "grid",
        placeItems: "center",
        color: PAPER,
        background: "#2c2a5a",
        border: "4px solid rgba(251,247,236,0.4)",
        borderRadius: 20,
      }}
    >
      {children}
    </button>
  );
}

const iconProps = { width: 36, height: 36, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

function TopBar({
  code,
  view,
  controlsVisible,
  muted,
  fullscreen,
}: {
  code: string;
  view: RoomView | null;
  controlsVisible: boolean;
  muted: boolean;
  fullscreen: ReturnType<typeof useFullscreen>;
}) {
  const { host } = useLocation();
  const inGame = view != null && view.phase !== "lobby";
  const roundLabel =
    view == null || view.phase === "lobby"
      ? null
      : view.phase === "final"
        ? "Résultats"
        : `Manche ${view.round}/${view.totalRounds}`;
  return (
    <header
      style={{ position: "absolute", left: 0, right: 0, top: 0, height: BAR_H, padding: `0 ${PAD}px`, display: "flex", alignItems: "center", gap: 36, zIndex: 20 }}
    >
      <Logo />
      {inGame && host ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "8px 22px",
            fontSize: 30,
            fontWeight: 600,
            color: "#c9c6e6",
            background: "rgba(30,29,64,0.9)",
            border: "3px solid rgba(251,247,236,0.22)",
            borderRadius: 20,
            whiteSpace: "nowrap",
            minWidth: 0,
          }}
        >
          <span>Rejoins sur</span>
          <span style={{ ...DISPLAY, color: PAPER, fontSize: host.length > 24 ? 28 : 34, overflow: "hidden", textOverflow: "ellipsis" }}>{host}</span>
          <span>· code</span>
          <span style={{ ...DISPLAY, color: INK, background: FLUO.yellow, padding: "2px 14px", borderRadius: 10, fontSize: 40, letterSpacing: "0.08em" }}>{code}</span>
        </div>
      ) : null}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 22 }}>
        {roundLabel ? (
          <div
            style={{
              ...DISPLAY,
              fontSize: 34,
              color: INK,
              background: FLUO.blue,
              padding: "8px 22px",
              border: `4px solid ${INK}`,
              borderRadius: 18,
              boxShadow: hard(5),
              transform: "rotate(1.2deg)",
              whiteSpace: "nowrap",
            }}
          >
            {roundLabel}
          </div>
        ) : null}
        <div
          className="focus-within:!opacity-100"
          style={{ display: "flex", gap: 14, opacity: controlsVisible ? 1 : 0, transition: "opacity 0.5s", pointerEvents: controlsVisible ? "auto" : "none" }}
        >
          <IconButton label={muted ? "Remettre le son (M)" : "Couper le son (M)"} onClick={() => sfx.toggleMuted()} tabbable>
            {muted ? (
              <svg {...iconProps}>
                <path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor" />
                <path d="m16 9 5 6M21 9l-5 6" />
              </svg>
            ) : (
              <svg {...iconProps}>
                <path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor" />
                <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
              </svg>
            )}
          </IconButton>
          {fullscreen.supported ? (
            <IconButton label={fullscreen.active ? "Quitter le plein écran (F)" : "Plein écran (F)"} onClick={() => void fullscreen.toggle()} tabbable>
              {fullscreen.active ? (
                <svg {...iconProps}>
                  <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
                </svg>
              ) : (
                <svg {...iconProps}>
                  <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
                </svg>
              )}
            </IconButton>
          ) : null}
        </div>
      </div>
    </header>
  );
}

// ------------------------------------------------------------------ écran de démarrage

const bigButton = "cursor-pointer transition-transform hover:brightness-105 active:translate-x-[5px] active:translate-y-[5px] focus-visible:outline-[6px] focus-visible:outline-offset-[6px] focus-visible:outline-[var(--color-fluo-blue)]";

function StartGate({ code, canFullscreen, onStart }: { code: string; canFullscreen: boolean; onStart: (fullscreen: boolean) => void }) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.3 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tv-gate-title"
      style={{ position: "absolute", inset: 0, zIndex: 60, display: "grid", placeItems: "center", background: "rgba(20,19,43,0.9)", cursor: "default" }}
    >
      <div
        style={{
          width: 1200,
          padding: "56px 72px 48px",
          background: PAPER,
          border: `6px solid ${INK}`,
          borderRadius: 44,
          boxShadow: hard(16),
          transform: "rotate(-0.8deg)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          color: INK,
        }}
      >
        <motion.div animate={{ rotate: [-5, 5, -5], y: [0, -8, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}>
          <Emo id="television" size={150} />
        </motion.div>
        <h1 id="tv-gate-title" style={{ ...DISPLAY, fontSize: 96, lineHeight: 1, margin: "14px 0 0" }}>
          Écran de classe
        </h1>
        <div style={{ ...DISPLAY, fontSize: 46, marginTop: 20, display: "flex", alignItems: "center", gap: 18 }}>
          Salle
          <span style={{ background: FLUO.yellow, border: `5px solid ${INK}`, borderRadius: 16, padding: "2px 22px", letterSpacing: "0.1em", boxShadow: hard(5) }}>{code}</span>
        </div>
        <p style={{ ...HAND, fontSize: 52, lineHeight: 1.1, color: "#4a4870", margin: "26px 0 34px" }}>
          Branche le vidéoprojecteur, monte le son… et clique pour démarrer.
        </p>
        <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
          <button
            type="button"
            autoFocus
            onClick={() => onStart(canFullscreen)}
            className={bigButton}
            style={{ ...DISPLAY, fontSize: 56, padding: "26px 54px", color: INK, background: FLUO.green, border: `6px solid ${INK}`, borderRadius: 30, boxShadow: hard(9) }}
          >
            {canFullscreen ? "Démarrer en plein écran" : "Démarrer l'écran de classe"}
          </button>
          {canFullscreen ? (
            <button
              type="button"
              onClick={() => onStart(false)}
              className={bigButton}
              style={{ ...DISPLAY, fontSize: 38, padding: "22px 36px", color: INK, background: "#fff", border: `5px solid ${INK}`, borderRadius: 26, boxShadow: hard(7) }}
            >
              Démarrer sans plein écran
            </button>
          ) : null}
        </div>
        <p style={{ fontSize: 28, fontWeight: 600, color: "#6f6d94", margin: "30px 0 0" }}>
          Ce clic active le son. Ensuite, plus besoin de toucher à rien : <b>F</b> plein écran · <b>M</b> son
        </p>
      </div>
    </motion.div>
  );
}

// ------------------------------------------------------------------ états

function Loading({ code }: { code: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30 }} role="status">
      <motion.div animate={{ rotate: [0, -14, 14, 0], y: [0, -18, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}>
        <Emo id="satellite-antenna" size={170} />
      </motion.div>
      <div style={{ ...DISPLAY, fontSize: 76 }}>Connexion à la salle {code}…</div>
    </div>
  );
}

function NotFound({ code }: { code: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
      <div
        style={{
          width: 1240,
          padding: "48px 64px 36px",
          background: PAPER,
          border: `6px solid ${INK}`,
          borderRadius: 40,
          boxShadow: hard(14),
          transform: "rotate(0.5deg)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          color: INK,
        }}
      >
        <Emo id="face-with-monocle" size={130} />
        <h1 style={{ ...DISPLAY, fontSize: 84, lineHeight: 1.02, margin: "12px 0 0" }}>
          Salle <span style={{ background: `linear-gradient(transparent 52%, ${FLUO.pink} 52%)`, padding: "0 0.12em" }}>{code}</span> introuvable
        </h1>
        <p style={{ ...HAND, fontSize: 48, lineHeight: 1.1, color: "#4a4870", margin: "18px 0 30px" }}>
          Elle a peut-être expiré, ou une lettre s&apos;est perdue en route. Essaie un autre code :
        </p>
        <CodeForm />
      </div>
    </div>
  );
}
