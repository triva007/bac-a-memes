"use client";

/**
 * ÉCRAN DE CRÉATION — choisir son gabarit, écrire son mème, le valider.
 * Rendu par le shell pendant la phase "create", dans un conteneur de hauteur définie.
 *
 *   Picker (étape 1)  →  Editor (étape 2)  →  DoneScreen (étape 3)
 *   WaitingScreen : spectateur, ou joueur arrivé en cours de manche.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import type { ApiFailure, PhaseProps } from "@/features/game/props";
import type { Sticker } from "@/lib/game/types";
import { sfx } from "@/lib/sfx";
import { buildMeme, draftKey, initDraft, saveDraft, selectTemplate, setValue, templateExists, type DraftState } from "./draft";
import { Editor } from "./Editor";
import { useAutosave, useTimePressure, type DraftPayload } from "./hooks";
import { Library } from "./Library";
import { Picker } from "./Picker";
import { DoneScreen, WaitingScreen } from "./Screens";
import { NoticeBubble, Spinner, useNotice } from "./ui";

const NO_VALUES: Record<string, string> = {};

export function CreateScreen({ view, api }: PhaseProps) {
  const create = view.create;
  if (!create) return null;
  const playing = view.me !== null && create.hands.length > 0;
  return (
    <MotionConfig reducedMotion="user">
      {playing ? <CreateFlow key={`${view.round}:${view.phaseEndsAt ?? 0}`} view={view} api={api} /> : <WaitingScreen view={view} api={api} />}
    </MotionConfig>
  );
}

function CreateFlow({ view, api }: PhaseProps) {
  const create = view.create;
  const hands = create?.hands;
  const forced = create?.forcedTemplateId ?? null;
  const submitted = create?.submitted ?? false;
  const storageKey = draftKey(view.code, view.round, view.phaseEndsAt);

  const [draft, setDraft] = useState<DraftState>(() => initDraft(view, storageKey));
  const [library, setLibrary] = useState(false);
  const [busy, setBusy] = useState<"submit" | "unsubmit" | null>(null);
  /** vrai quand on arrive dans l'éditeur par un tap sur un gabarit (ou d'office en mode « même image ») : le premier champ prend le focus */
  const [arrivedByTap, setArrivedByTap] = useState(() => forced !== null && !submitted && !create?.myMeme);
  const [notice, notify] = useNotice();

  const templateId = forced ?? draft.templateId;
  const templateOk = templateId ? templateExists(templateId, view.images) : false;
  const inHand = templateId ? (hands ?? []).some((h) => h.includes(templateId)) : false;
  const usedJoker = templateId !== null && !forced && !inHand;
  const values = (templateId ? draft.valuesByTpl[templateId] : undefined) ?? NO_VALUES;
  const stickers = draft.stickers;

  const payload = useMemo<DraftPayload | null>(
    () => (templateId && templateOk ? { meme: buildMeme(templateId, values, stickers), usedJoker } : null),
    [templateId, templateOk, values, stickers, usedJoker],
  );
  const hasContent = payload ? Object.keys(payload.meme.values).length > 0 : false;

  // ---------------------------------------------------------------- temps + sauvegarde
  const nearEnd = useRef<() => void>(() => {});
  const onNearEnd = useCallback(() => nearEnd.current(), []);
  const clock = useTimePressure(view.phaseEndsAt, api, { sound: !submitted, onNearEnd });

  const onDraftError = useCallback((f: ApiFailure) => notify(f.message || "Ce brouillon n'a pas pu être enregistré."), [notify]);
  const autosave = useAutosave(api, payload, !submitted && !clock.up, onDraftError);
  useEffect(() => {
    // ~2 s avant la fin : on envoie de force, et la suite part sans attendre
    nearEnd.current = () => {
      autosave.hurry();
      autosave.flushNow();
    };
  }, [autosave]);

  useEffect(() => {
    saveDraft(storageKey, draft);
  }, [storageKey, draft]);

  // ---------------------------------------------------------------- actions
  const choose = useCallback(
    (id: string) => {
      if (clock.up) return;
      sfx.play("tap");
      // rendu synchrone : l'éditeur est monté et son premier champ prend le focus
      // dans le geste même (indispensable pour ouvrir le clavier sur iOS)
      flushSync(() => {
        setArrivedByTap(true);
        setLibrary(false);
        setDraft((d) => selectTemplate(d, id));
      });
    },
    [clock.up],
  );

  const onHand = useCallback((index: number) => setDraft((d) => ({ ...d, handIndex: index, revealed: Math.max(d.revealed, index) })), []);
  const onValue = useCallback((fieldId: string, value: string) => setDraft((d) => (templateId ? setValue(d, templateId, fieldId, value) : d)), [templateId]);
  const onStickers = useCallback((next: Sticker[]) => setDraft((d) => ({ ...d, stickers: next })), []);
  const toPicker = useCallback(() => {
    sfx.play("tap");
    setDraft((d) => ({ ...d, step: "pick" }));
  }, []);
  const backToEditor = useCallback(() => {
    sfx.play("tap");
    setArrivedByTap(false);
    setDraft((d) => ({ ...d, step: "edit" }));
  }, []);
  const closeLibrary = useCallback(() => setLibrary(false), []);

  const submit = async () => {
    if (!payload || busy) return;
    setBusy("submit");
    try {
      await api.send({ type: "submit", meme: payload.meme, usedJoker: payload.usedJoker });
      autosave.markSent(payload);
      sfx.play("submit");
    } catch (e) {
      const f = e as Partial<ApiFailure>;
      sfx.play("error");
      notify(f.error === "bad_phase" ? "Trop tard : le temps est écoulé." : f.message || "Envoi raté, réessaie.");
    } finally {
      setBusy(null);
    }
  };

  const editAgain = async () => {
    if (busy) return;
    setBusy("unsubmit");
    try {
      await api.send({ type: "unsubmit" });
      sfx.play("tap");
      setArrivedByTap(false);
      setDraft((d) => (d.templateId || forced ? { ...d, step: "edit" } : d));
    } catch (e) {
      const f = e as Partial<ApiFailure>;
      sfx.play("error");
      notify(f.error === "bad_phase" ? "Trop tard pour modifier." : f.message || "Ça n'a pas marché, réessaie.");
    } finally {
      setBusy(null);
    }
  };

  if (!create) return null;

  const canJoker = view.settings.mode !== "meme-image" && !forced && ((view.me?.jokersLeft ?? 0) > 0 || usedJoker);
  const screen: "done" | "edit" | "pick" = submitted ? "done" : draft.step === "edit" && templateId ? "edit" : "pick";
  const doneMeme = create.myMeme ?? payload?.meme ?? null;

  return (
    <div className="relative h-full w-full overflow-hidden" data-create-screen={screen}>
      {screen === "done" ? (
        doneMeme ? (
          <motion.div key="done" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18 }}>
            <DoneScreen view={view} api={api} meme={doneMeme} onEdit={editAgain} busy={busy === "unsubmit"} clock={clock} />
          </motion.div>
        ) : (
          <WaitingScreen view={view} api={api} />
        )
      ) : screen === "edit" && templateId ? (
        <motion.div key={`edit:${templateId}`} className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.16 }}>
          <Editor
            view={view}
            templateId={templateId}
            templateOk={templateOk}
            usedJoker={usedJoker}
            values={values}
            stickers={stickers}
            onValue={onValue}
            onStickers={onStickers}
            onChangeTemplate={forced ? undefined : toPicker}
            onSubmit={submit}
            busy={busy === "submit"}
            clock={clock}
            autoFocus={arrivedByTap}
            notify={notify}
          />
        </motion.div>
      ) : (
        <motion.div key="pick" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.16 }}>
          <Picker
            view={view}
            handIndex={draft.handIndex}
            revealed={draft.revealed}
            onHand={onHand}
            selectedId={draft.templateId}
            onPick={choose}
            onBack={draft.templateId && templateOk ? backToEditor : undefined}
            canJoker={canJoker}
            onOpenLibrary={() => {
              sfx.play("pop");
              setLibrary(true);
            }}
            locked={clock.up}
          />
        </motion.div>
      )}

      <NoticeBubble notice={notice} className="top-3" />

      {/* 5 dernières secondes : le cadre rougit */}
      {clock.alert && !submitted ? (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-30"
          style={{ boxShadow: "inset 0 0 0 5px var(--color-red-pen), inset 0 0 38px rgba(229,56,59,0.55)" }}
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          data-testid="time-alert"
        />
      ) : null}

      <AnimatePresence>
        {clock.up && !submitted ? (
          <motion.div
            key="time-up"
            role="alert"
            data-testid="time-up"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-ink/85 px-6 text-center backdrop-blur-[3px]"
          >
            <motion.div
              initial={{ scale: 2.2, rotate: -18, opacity: 0 }}
              animate={{ scale: 1, rotate: -5, opacity: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 17 }}
              className="rounded-2xl border-[5px] border-red-pen px-5 py-3 font-display text-[2.3rem] font-extrabold uppercase leading-none tracking-tight text-red-pen"
              style={{ boxShadow: "inset 0 0 0 3px rgba(229,56,59,0.25)" }}
            >
              Temps écoulé !
            </motion.div>
            <p className="max-w-xs text-[1.5rem] leading-tight text-paper" style={{ fontFamily: "var(--font-hand)", fontWeight: 600 }}>
              {hasContent ? "Posez les stylos. Ton brouillon part au vote tel quel." : "Posez les stylos. Copie blanche pour cette manche… tu te rattraperas au vote."}
            </p>
            <p className="flex items-center gap-2 font-display text-sm font-bold text-muted">
              <Spinner size={16} />
              On ramasse les copies…
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <LibraryPortal open={library && !submitted && !clock.up}>
        <Library view={view} selectedId={templateId} onPick={choose} onClose={closeLibrary} clock={clock} />
      </LibraryPortal>
    </div>
  );
}

/** La bibliothèque est rendue dans <body> : plein écran quoi que fasse le conteneur du shell. */
function LibraryPortal({ open, children }: { open: boolean; children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(<AnimatePresence>{open ? children : null}</AnimatePresence>, document.body);
}
