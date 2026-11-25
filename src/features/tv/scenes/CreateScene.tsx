"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { PhaseProps } from "@/features/game/props";
import { useCountdown } from "@/features/game/useRoom";
import { creatingPhrase, roundTitle, tip } from "@/lib/content/phrases";
import { getTemplate } from "@/lib/templates";
import { TemplateThumb } from "@/components/meme/MemeView";
import { sfx } from "@/lib/sfx";
import { useRotation } from "../hooks";
import { PAD, STAGE_W, useStage } from "../stage";
import { Chip, DISPLAY, Emo, FLUO, HAND, HandLine, INK, MODE_INFO, PAPER, PlayerTile, TimerRing, fitSize, hard, packGrid, useMemeHeight } from "../ui";

const LEFT_W = 440;
const GAP = 48;
const INTRO_MS = 3400;

export function CreateScene({ view, api }: PhaseProps) {
  const { bodyH } = useStage();
  const create = view.create;
  const total = view.settings.createSeconds;
  const left = useCountdown(view.phaseEndsAt, api);
  const sec = left == null ? null : Math.ceil(left);
  const rotation = useRotation(7000, api);
  const tipRotation = useRotation(9000, api);

  // annonce de manche : seulement si on arrive au tout début de la phase
  const [intro, setIntro] = useState(() => view.phaseEndsAt != null && total * 1000 - (view.phaseEndsAt - api.serverNow()) < 4000);
  useEffect(() => {
    if (!intro) return;
    sfx.play("start");
    const id = setTimeout(() => setIntro(false), INTRO_MS);
    return () => clearTimeout(id);
  }, [intro]);

  // tic-tac des 10 dernières secondes, puis fin du temps
  useEffect(() => {
    if (sec == null) return;
    if (sec > 0 && sec <= 10) sfx.play("tick", sec <= 3 ? 1 : 0.4);
    else if (sec === 0) sfx.play("timeUp");
  }, [sec]);

  // un son par copie rendue
  const players = view.players;
  const doneIds = useRef<Set<string> | null>(null);
  useEffect(() => {
    const now = new Set(players.filter((p) => p.done).map((p) => p.id));
    const before = doneIds.current;
    doneIds.current = now;
    if (!before) return;
    for (const id of now) {
      if (!before.has(id)) {
        sfx.play("submit");
        break;
      }
    }
  }, [players]);

  const forcedHeight = useMemeHeight(create?.forcedTemplateId ?? "");

  if (!create) return null;

  const wall = players.filter((p) => p.connected || p.done);
  const allIn = create.totalPlayers > 0 && create.submittedCount >= create.totalPlayers;
  const waiting = allIn ? [] : wall.filter((p) => !p.done && p.connected).map((p) => p.name);
  const phrase = creatingPhrase(`${view.code}:${view.round}:${rotation}`, waiting);
  const forced = create.forcedTemplateId;
  const theme = create.theme;
  const urgent = sec != null && sec <= 10;
  const mode = MODE_INFO[view.settings.mode] ?? MODE_INFO.classique;

  const innerH = bodyH - 8 - 40;
  const mainW = STAGE_W - PAD * 2 - LEFT_W - GAP;
  const phraseH = 76;
  const headH = forced ? 0 : theme ? 268 : 176;
  // gabarit imposé : un gabarit large prend plus de place en largeur, un gabarit haut en hauteur
  const thumbColW = forcedHeight <= 900 ? 740 : forcedHeight <= 1100 ? 620 : 540;
  const wallW = forced ? mainW - thumbColW - 40 : mainW;
  const wallH = forced ? innerH - phraseH - 24 : innerH - headH - phraseH - 24 * 2;
  const grid = packGrid(wall.length, wallW, wallH, 1.1, 270, 16);
  const pct = create.totalPlayers > 0 ? Math.min(1, create.submittedCount / create.totalPlayers) : 0;

  const wallNode = (
    <div style={{ position: "relative", width: wallW, height: wallH, flex: "none" }} aria-label="Mur des joueurs">
      {wall.map((p, i) => {
        const { x, y } = grid.at(i);
        return (
          <div key={p.id} style={{ position: "absolute", left: x, top: y, width: grid.w, transition: "left 0.5s, top 0.5s" }}>
            <motion.div
              key={p.done ? "done" : "busy"}
              initial={p.done ? { scale: 1.28, rotate: 8 } : false}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 12 }}
            >
              <PlayerTile player={p} w={grid.w} done={p.done} showDone dim={!p.connected && !p.done} />
            </motion.div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ position: "absolute", inset: 0, padding: `8px ${PAD}px 40px`, display: "flex", gap: GAP }}>
      {/* ------------------------------------------------ minuteur + compteur */}
      <div style={{ width: LEFT_W, flex: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
        <motion.div animate={urgent ? { scale: [1, 1.05, 1] } : { scale: 1 }} transition={urgent ? { duration: 1, repeat: Infinity } : { duration: 0.2 }}>
          <TimerRing left={left} total={total} size={400} urgent={urgent} />
        </motion.div>

        <div
          style={{
            width: "100%",
            padding: "20px 26px 24px",
            background: PAPER,
            color: INK,
            border: `5px solid ${INK}`,
            borderRadius: 30,
            boxShadow: hard(8),
            transform: "rotate(-1deg)",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <motion.span
              key={create.submittedCount}
              initial={{ scale: 1.35, color: "#0f9d58" }}
              animate={{ scale: 1, color: INK }}
              transition={{ type: "spring", stiffness: 400, damping: 14 }}
              style={{ ...DISPLAY, display: "inline-block", fontSize: 96, lineHeight: 1, fontVariantNumeric: "tabular-nums", transformOrigin: "left bottom" }}
            >
              {create.submittedCount}
            </motion.span>
            <span style={{ ...DISPLAY, fontSize: 54, lineHeight: 1, color: "#6f6d94" }}>/{create.totalPlayers}</span>
            <span style={{ ...DISPLAY, fontSize: 32, lineHeight: 1.05, marginLeft: "auto", textAlign: "right" }}>
              {create.submittedCount > 1 ? "copies" : "copie"}
              <br />
              {create.submittedCount > 1 ? "rendues" : "rendue"}
            </span>
          </div>
          <div style={{ marginTop: 14, height: 28, background: "#e4dcc4", border: `4px solid ${INK}`, borderRadius: 14, overflow: "hidden" }}>
            <div style={{ width: `${pct * 100}%`, height: "100%", background: FLUO.green, borderRight: pct > 0 && pct < 1 ? `4px solid ${INK}` : undefined, transition: "width 0.6s cubic-bezier(.2,1.2,.4,1)" }} />
          </div>
        </div>

        <div
          className="paper-seyes"
          style={{
            width: "100%",
            flex: "0 1 340px",
            minHeight: 0,
            padding: "18px 24px 18px 66px",
            color: INK,
            border: `5px solid ${INK}`,
            borderRadius: 26,
            boxShadow: hard(8),
            transform: "rotate(1.2deg)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div style={{ ...DISPLAY, fontSize: 26, color: "#e5383b", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 10 }}>
            <Emo id="light-bulb" size={34} /> Conseil du prof
          </div>
          <HandLine text={tip(`${view.code}:${view.round}:${tipRotation}`)} size={44} color={INK} style={{ marginTop: 6 }} />
        </div>
      </div>

      {/* ------------------------------------------------ consigne + mur des joueurs */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 24 }}>
        {forced ? (
          <div style={{ display: "flex", gap: 40, height: wallH, flex: "none" }}>
            <ForcedTemplate templateId={forced} w={thumbColW} h={wallH} />
            {wallNode}
          </div>
        ) : (
          <>
            <div style={{ height: headH, flex: "none", display: "flex", alignItems: "center" }}>
              {theme ? (
                <div
                  style={{
                    width: "100%",
                    height: headH - 16,
                    padding: "18px 36px",
                    background: PAPER,
                    color: INK,
                    border: `6px solid ${INK}`,
                    borderRadius: 34,
                    boxShadow: hard(10),
                    transform: "rotate(-0.5deg)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    gap: 10,
                    position: "relative",
                  }}
                >
                  <Chip color={FLUO.pink} size={30} style={{ position: "absolute", left: 30, top: -30, transform: "rotate(-2deg)" }}>
                    <Emo id="bullseye" size={38} /> Thème imposé
                  </Chip>
                  <div
                    style={{
                      ...DISPLAY,
                      fontSize: fitSize(theme, [[40, 76], [60, 64], [85, 54], [120, 46], [170, 38], [999, 32]]),
                      lineHeight: 1.08,
                      marginTop: 14,
                      display: "-webkit-box",
                      WebkitLineClamp: 4,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {theme}
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 30, width: "100%" }}>
                  <motion.div animate={{ rotate: [-10, 10, -10] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }} style={{ flex: "none" }}>
                    <Emo id="writing-hand" size={130} />
                  </motion.div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ ...DISPLAY, fontSize: 104, lineHeight: 1 }}>
                      À vos{" "}
                      <span style={{ color: INK, background: FLUO.yellow, padding: "0 0.14em", borderRadius: 14, display: "inline-block", transform: "rotate(-1.5deg)" }}>mèmes</span> !
                    </div>
                    <div style={{ fontSize: 38, fontWeight: 700, color: "#c9c6e6", marginTop: 12 }}>Choisis ton gabarit, trouve la légende qui tue, et valide.</div>
                  </div>
                </div>
              )}
            </div>
            {wallNode}
          </>
        )}
        <div style={{ height: phraseH, flex: "none", display: "flex", alignItems: "center", gap: 18 }}>
          <Emo id={allIn ? "party-popper" : "eyes"} size={56} />
          <HandLine text={phrase} size={fitSize(phrase, [[58, 54], [70, 46], [86, 40], [999, 34]])} style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden" }} />
        </div>
      </div>

      {/* ------------------------------------------------ compte à rebours géant */}
      <AnimatePresence>
        {!intro && sec != null && sec <= 10 ? (
          <motion.div
            key="countdown"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 5,
              display: "grid",
              placeItems: "center",
              background: "radial-gradient(closest-side, rgba(20,19,43,0.82), rgba(20,19,43,0.35) 70%, rgba(20,19,43,0))",
              pointerEvents: "none",
            }}
            aria-hidden
          >
            <motion.div
              key={sec}
              initial={{ scale: 1.7, opacity: 0, rotate: sec % 2 ? -6 : 6 }}
              animate={{ scale: 1, opacity: 1, rotate: sec % 2 ? 2 : -2 }}
              transition={{ type: "spring", stiffness: 300, damping: 14 }}
              style={{
                ...DISPLAY,
                fontSize: sec === 0 ? 210 : 560,
                lineHeight: 0.9,
                color: sec <= 3 ? FLUO.pink : FLUO.yellow,
                WebkitTextStroke: `${sec === 0 ? 10 : 18}px ${INK}`,
                paintOrder: "stroke fill",
                textShadow: `14px 14px 0 ${INK}`,
                whiteSpace: "nowrap",
              }}
            >
              {sec === 0 ? "Stylos posés !" : sec}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ------------------------------------------------ annonce de manche */}
      <AnimatePresence>
        {intro ? (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.08 }}
            transition={{ duration: 0.35 }}
            style={{ position: "absolute", inset: 0, zIndex: 10, background: "rgba(20,19,43,0.96)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 40 }}
          >
            <motion.div initial={{ y: -80, opacity: 0, rotate: -6 }} animate={{ y: 0, opacity: 1, rotate: -3 }} transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}>
              <Chip color={FLUO.blue} size={64}>
                Manche {view.round}/{view.totalRounds}
              </Chip>
            </motion.div>
            <RoundTitle text={roundTitle(view.round, view.totalRounds, `${view.code}:${view.round}`)} />
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 44, fontWeight: 700, color: "#c9c6e6" }}
            >
              <Emo id={mode.emoji} size={60} />
              {mode.label} — {mode.pitch.toLowerCase()}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function RoundTitle({ text }: { text: string }) {
  return (
    <motion.h1
      initial={{ scale: 0.3, opacity: 0, rotate: 8 }}
      animate={{ scale: 1, opacity: 1, rotate: 1.5 }}
      transition={{ type: "spring", stiffness: 240, damping: 13, delay: 0.3 }}
      style={{
        ...DISPLAY,
        margin: 0,
        maxWidth: 1640,
        padding: "30px 60px 38px",
        fontSize: fitSize(text, [[16, 190], [24, 150], [34, 120], [48, 96], [999, 78]]),
        lineHeight: 1,
        textAlign: "center",
        color: INK,
        background: FLUO.yellow,
        border: `8px solid ${INK}`,
        borderRadius: 44,
        boxShadow: hard(16, "rgba(0,0,0,0.6)"),
      }}
    >
      {text}
    </motion.h1>
  );
}

function ForcedTemplate({ templateId, w, h }: { templateId: string; w: number; h: number }) {
  const height = useMemeHeight(templateId);
  const name = getTemplate(templateId)?.name;
  const labelH = 86;
  const border = 6;
  const footH = 64;
  const k = Math.min((w - border * 2 - 12) / 1000, (h - labelH - footH - border * 2 - 12) / height);
  const tw = Math.floor(1000 * k);
  const th = Math.floor(height * k);
  return (
    <div style={{ width: w, height: h, flex: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0 }}>
      <div style={{ height: labelH, display: "flex", alignItems: "flex-start" }}>
        <Chip color={FLUO.pink} size={34} style={{ transform: "rotate(-2deg)" }}>
          <Emo id="framed-picture" size={42} /> Même gabarit pour tous
        </Chip>
      </div>
      <div
        style={{
          width: tw + border * 2,
          height: th + border * 2,
          background: INK,
          border: `${border}px solid ${INK}`,
          borderRadius: 26,
          boxShadow: hard(12),
          transform: "rotate(-1deg)",
          overflow: "hidden",
        }}
      >
        <div style={{ width: tw, height: th, borderRadius: 20, overflow: "hidden" }}>
          <TemplateThumb templateId={templateId} fit="contain" eager />
        </div>
      </div>
      <div style={{ ...HAND, height: footH - 16, fontSize: (name?.length ?? 0) > 24 ? 36 : 44, lineHeight: 1.1, color: "#c9c6e6", marginTop: 16, whiteSpace: "nowrap", maxWidth: w, overflow: "hidden", textOverflow: "ellipsis" }}>
        {name ? `« ${name} »` : "À toi la meilleure légende !"}
      </div>
    </div>
  );
}
