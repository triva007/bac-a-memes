"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { PhaseProps } from "@/features/game/props";
import { lobbyPhrase } from "@/lib/content/phrases";
import { sfx } from "@/lib/sfx";
import { useLocation, useRotation } from "../hooks";
import { PAD, STAGE_W, useStage } from "../stage";
import { Chip, DISPLAY, Emo, FLUO, HAND, HandLine, INK, MODE_INFO, PAPER, PlayerTile, QrCode, fitSize, hard, packGrid } from "../ui";

const LEFT_W = 700;
const GAP = 48;
const CARD_PAD = 36;

export function LobbyScene({ view, api }: PhaseProps) {
  const { bodyH } = useStage();
  const { host, origin } = useLocation();
  const rotation = useRotation(7000, api);
  const players = view.players;
  const connected = players.filter((p) => p.connected);
  const hostPlayer = players.find((p) => p.isHost);

  // un son par arrivée (pas pour ceux déjà là quand l'écran s'allume)
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (seen.current === null) {
      seen.current = new Set(players.map((p) => p.id));
      return;
    }
    let fresh = 0;
    for (const p of players) {
      if (seen.current.has(p.id)) continue;
      seen.current.add(p.id);
      // pas d'annulation : un rafraîchissement de la vue ne doit pas avaler le son d'une arrivée
      setTimeout(() => sfx.play("join"), fresh * 150);
      fresh++;
    }
  }, [players]);
  const [initialIds] = useState(() => new Set(players.map((p) => p.id)));

  const innerH = bodyH - 8 - 40;
  const rightW = STAGE_W - PAD * 2 - LEFT_W - GAP;
  const headerH = 168;
  const footerH = 78;
  const gridH = innerH - headerH - footerH - 28 * 2;
  const grid = packGrid(players.length, rightW, gridH, 1.1, 236, 16);

  // carte « rejoins » : le QR prend la place restante
  const code = view.code;
  const tileGap = 14;
  const tileW = Math.min(150, Math.floor((LEFT_W - CARD_PAD * 2 - tileGap * (code.length - 1)) / code.length));
  const fixedH = 96 + 128 + 44 + Math.round(tileW * 1.16) + 3 * 22;
  const qrRoom = innerH - CARD_PAD * 2 - fixedH;
  const stacked = qrRoom > 560;
  const qrSize = Math.max(180, Math.floor(stacked ? Math.min(qrRoom - 86, LEFT_W - CARD_PAD * 2 - 20) : Math.min(qrRoom - 12, 400)));
  const joinUrl = origin ? `${origin}/r/${code}` : "";
  const mode = MODE_INFO[view.settings.mode] ?? MODE_INFO.classique;

  return (
    <div style={{ position: "absolute", inset: 0, padding: `8px ${PAD}px 40px`, display: "flex", gap: GAP }}>
      {/* ------------------------------------------------ comment rejoindre */}
      <section
        aria-label="Comment rejoindre la partie"
        style={{
          width: LEFT_W,
          height: innerH,
          flex: "none",
          padding: CARD_PAD,
          background: PAPER,
          color: INK,
          border: `6px solid ${INK}`,
          borderRadius: 40,
          boxShadow: hard(12),
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        <h1 style={{ ...DISPLAY, fontSize: 80, lineHeight: 1.2, height: 96, margin: 0, whiteSpace: "nowrap" }}>
          Rejoins la{" "}
          <span style={{ background: `linear-gradient(transparent 50%, ${FLUO.pink} 50%)`, padding: "0 0.1em" }}>partie</span> !
        </h1>

        <div style={{ height: 128 }}>
          <StepLabel n={1}>Sur ton téléphone, va sur</StepLabel>
          <div
            style={{
              ...DISPLAY,
              marginTop: 6,
              fontSize: fitSize(host, [[14, 68], [18, 58], [22, 50], [26, 43], [32, 36], [99, 28]]),
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            <span style={{ background: `linear-gradient(transparent 55%, ${FLUO.blue} 55%)`, padding: "0 0.08em" }}>{host || "…"}</span>
          </div>
        </div>

        <div>
          <StepLabel n={2}>Tape le code de la salle</StepLabel>
          <div style={{ display: "flex", gap: tileGap, marginTop: 8 }} aria-label={`Code : ${code.split("").join(" ")}`}>
            {code.split("").map((ch, i) => (
              <div
                key={i}
                aria-hidden
                style={{
                  ...DISPLAY,
                  width: tileW,
                  height: Math.round(tileW * 1.16) - 8,
                  display: "grid",
                  placeItems: "center",
                  fontSize: Math.round(tileW * 0.86),
                  lineHeight: 1,
                  letterSpacing: 0,
                  color: INK,
                  background: FLUO.yellow,
                  border: `6px solid ${INK}`,
                  borderRadius: 24,
                  boxShadow: hard(7, INK),
                  transform: `rotate(${[-2, 1.5, -1, 2, -1.5, 1][i % 6]}deg)`,
                }}
              >
                {ch}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: stacked ? "column" : "row",
            alignItems: "center",
            justifyContent: stacked ? "center" : "flex-start",
            gap: stacked ? 14 : 28,
          }}
        >
          <div style={{ padding: 0, border: `6px solid ${INK}`, borderRadius: 22, overflow: "hidden", boxShadow: hard(7, INK), flex: "none", background: "#fff" }}>
            {joinUrl ? <QrCode text={joinUrl} size={qrSize} /> : <div style={{ width: qrSize, height: qrSize }} />}
          </div>
          <div style={{ display: "flex", flexDirection: stacked ? "row" : "column", alignItems: stacked ? "center" : "flex-start", gap: 12 }}>
            <Emo id="mobile-phone" size={stacked ? 64 : 84} style={{ transform: "rotate(-8deg)" }} />
            <div style={{ ...HAND, fontSize: stacked ? 50 : 54, lineHeight: 1, color: INK }}>
              …ou scanne{stacked ? " " : <br />}le QR code,{stacked ? " " : <br />}ça va plus vite !
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ qui est là */}
      <section aria-label="Joueurs dans la salle" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 28 }}>
        <div style={{ height: headerH, display: "flex", alignItems: "center", gap: 30 }}>
          <motion.div
            key={connected.length}
            initial={{ scale: 1.25, rotate: 3 }}
            animate={{ scale: 1, rotate: -3 }}
            transition={{ type: "spring", stiffness: 420, damping: 14 }}
            style={{
              ...DISPLAY,
              minWidth: 150,
              height: 150,
              padding: "0 26px",
              display: "grid",
              placeItems: "center",
              fontSize: 116,
              lineHeight: 1,
              color: INK,
              background: FLUO.green,
              border: `6px solid ${INK}`,
              borderRadius: 34,
              boxShadow: hard(9),
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {connected.length}
          </motion.div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ ...DISPLAY, fontSize: 66, lineHeight: 1.05 }} aria-live="polite">
              {connected.length > 1 ? "joueurs dans la salle" : connected.length === 1 ? "joueur dans la salle" : "joueur pour l'instant"}
            </div>
            <HandLine text={lobbyPhrase(`${code}:${rotation}`)} size={50} style={{ marginTop: 8 }} />
          </div>
        </div>

        <div style={{ position: "relative", height: gridH, flex: "none" }}>
          <AnimatePresence>
            {players.map((p, i) => {
              const { x, y } = grid.at(i);
              return (
                <div
                  key={p.id}
                  style={{ position: "absolute", left: x, top: y, width: grid.w, transition: "left 0.5s cubic-bezier(.2,.9,.3,1), top 0.5s cubic-bezier(.2,.9,.3,1)" }}
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -25, y: 40 }}
                    animate={{ scale: 1, rotate: 0, y: 0 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 380, damping: 15, delay: initialIds.has(p.id) ? 0.15 + i * 0.045 : 0 }}
                  >
                    <PlayerTile
                      player={p}
                      w={grid.w}
                      dim={!p.connected}
                      badge={p.isHost ? <Emo id="crown" size={Math.round(grid.w * 0.34)} style={{ transform: "rotate(-18deg)" }} /> : null}
                    />
                  </motion.div>
                </div>
              );
            })}
          </AnimatePresence>
          {players.length <= 1 ? (
            <div style={{ ...HAND, position: "absolute", left: 0, right: 0, bottom: 20, textAlign: "center", fontSize: 54, color: "#b8b6dc" }}>
              On attend les copains… sortez les téléphones !
            </div>
          ) : null}
        </div>

        <div style={{ height: footerH, display: "flex", alignItems: "center", gap: 20, flexWrap: "nowrap" }}>
          <Chip color={FLUO.yellow} size={32} style={{ transform: "rotate(-1.2deg)" }}>
            <Emo id={mode.emoji} size={40} />
            {mode.label}
          </Chip>
          <Chip size={32} style={{ transform: "rotate(0.8deg)" }}>
            {view.settings.rounds} {view.settings.rounds > 1 ? "manches" : "manche"}
          </Chip>
          <Chip size={32} style={{ transform: "rotate(-0.6deg)" }}>
            <Emo id="stopwatch" size={40} />
            {view.settings.createSeconds} s par mème
          </Chip>
          {hostPlayer ? (
            <div style={{ ...HAND, fontSize: 44, lineHeight: 1, color: "#c9c6e6", marginLeft: 6, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {hostPlayer.name} lance quand tout le monde est là
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function StepLabel({ n, children }: { n: number; children: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 32, fontWeight: 700, color: "#4a4870", height: 44 }}>
      <span
        style={{
          ...DISPLAY,
          width: 44,
          height: 44,
          display: "grid",
          placeItems: "center",
          fontSize: 28,
          color: PAPER,
          background: INK,
          borderRadius: "50%",
          flex: "none",
        }}
      >
        {n}
      </span>
      {children}
    </div>
  );
}
