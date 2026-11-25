"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Emoji } from "@/components/ui/Emoji";
import type { ApiFailure, GameApi, PhaseProps } from "@/features/game/props";
import { lobbyPhrase, rotatingSeed } from "@/lib/content/phrases";
import { LIMITS, type RoomView } from "@/lib/game/types";
import { sfx } from "@/lib/sfx";
import { InviteCard } from "./InviteCard";
import { NamesPanel } from "./NamesPanel";
import { PersoPanel } from "./PersoPanel";
import { PlayersPanel } from "./PlayersPanel";
import { MODES, SettingsEditor, SettingsSummary } from "./SettingsPanel";
import { useSettingsDraft, type SettingsDraft } from "./useSettingsDraft";

type TabId = "joueurs" | "reglages" | "noms" | "perso";

const TABS: { id: TabId; label: string }[] = [
  { id: "joueurs", label: "Joueurs" },
  { id: "reglages", label: "Réglages" },
  { id: "noms", label: "Noms" },
  { id: "perso", label: "Pack perso" },
];

function Tabs({
  active,
  onChange,
  badges,
  baseId,
}: {
  active: TabId;
  onChange: (t: TabId) => void;
  badges: Partial<Record<TabId, number>>;
  baseId: string;
}) {
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const i = TABS.findIndex((t) => t.id === active);
    const next = TABS[(i + dir + TABS.length) % TABS.length];
    onChange(next.id);
    requestAnimationFrame(() => document.getElementById(`${baseId}-tab-${next.id}`)?.focus());
  };
  return (
    <div role="tablist" aria-label="Sections du salon" onKeyDown={onKey} className="flex gap-1 rounded-[16px] border-[2.5px] border-paper/20 bg-ink-2 p-1">
      {TABS.map((t) => {
        const selected = t.id === active;
        const badge = badges[t.id];
        return (
          <button
            key={t.id}
            id={`${baseId}-tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${baseId}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => {
              if (!selected) sfx.play("tap");
              onChange(t.id);
            }}
            className={[
              "relative flex min-h-[44px] min-w-0 flex-1 items-center justify-center gap-1 rounded-[11px] px-1 font-display text-[0.86rem] font-extrabold leading-none outline-none transition-colors focus-visible:ring-4 focus-visible:ring-fluo-blue min-[400px]:text-[0.95rem]",
              selected ? "bg-fluo-yellow text-ink shadow-[2px_2px_0_0_rgba(0,0,0,0.55)]" : "text-paper/75 hover:bg-paper/10",
            ].join(" ")}
          >
            <span className="truncate">{t.label}</span>
            {badge ? (
              <span
                className={`flex-none rounded-full px-[5px] py-[2px] text-[0.68rem] font-extrabold tabular-nums leading-none ${selected ? "bg-ink text-paper" : "bg-paper/20 text-paper"}`}
              >
                {badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Phrase d'ambiance qui tourne toutes les 6 s (la même sur tous les téléphones de la salle). */
function WaitingPhrase({ code, api }: { code: string; api: GameApi }) {
  const [now, setNow] = useState(() => api.serverNow());
  useEffect(() => {
    const id = setInterval(() => setNow(api.serverNow()), 1000);
    return () => clearInterval(id);
  }, [api]);
  const phrase = lobbyPhrase(rotatingSeed(code, now, 6000));
  return (
    <div className="relative mt-0.5 min-h-[2.5rem]">
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={phrase}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="font-[family-name:var(--font-hand)] text-[1.25rem] leading-[1.05] text-fluo-green"
        >
          {phrase}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

function StartBar({ view, api, draft }: { view: RoomView; api: GameApi; draft: SettingsDraft }) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isHost = view.me?.isHost ?? false;
  const count = view.players.length;
  const missing = Math.max(0, LIMITS.minPlayersToStart - count);
  const hostName = view.players.find((p) => p.isHost)?.name;
  const s = draft.settings;
  const mode = MODES.find((m) => m.id === s.mode) ?? MODES[0];

  const start = async () => {
    if (starting) return;
    setStarting(true);
    setError(null);
    try {
      sfx.unlock();
      await draft.flush();
      await api.send({ type: "start" });
      // la suite : la vue passe en phase "create", le salon est démonté
    } catch (e) {
      sfx.play("error");
      setError((e as Partial<ApiFailure>).message || "Impossible de lancer la partie.");
      setStarting(false);
    }
  };

  return (
    <div
      className="relative z-10 flex-none border-t-[3px] border-black/40 bg-ink-2 px-3 pt-2.5"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto w-full max-w-[560px]">
        {isHost ? (
          <>
            <p className="mb-2 min-h-[1.1rem] text-center text-[0.84rem] font-semibold leading-tight" role={error ? "alert" : undefined}>
              {error ? (
                <span className="text-fluo-pink">{error}</span>
              ) : missing > 0 ? (
                <span className="text-fluo-orange">
                  Il faut au moins {LIMITS.minPlayersToStart} joueurs pour lancer&nbsp;: partage le code&nbsp;!
                </span>
              ) : (
                <span className="text-paper/75">
                  {count} joueurs · {s.rounds} manche{s.rounds > 1 ? "s" : ""} · {mode.title}
                </span>
              )}
            </p>
            <button type="button" className="btn btn-green w-full !min-h-[58px] !text-[1.25rem]" onClick={start} disabled={missing > 0 || starting}>
              {starting ? "C'est parti…" : "Lancer la partie"}
              {!starting ? <Emoji id="rocket" size={26} /> : null}
            </button>
          </>
        ) : (
          <div className="flex items-center gap-3 py-0.5">
            <span className="flex-none animate-float [--tilt:-8deg]">
              <Emoji id="hourglass-not-done" size={38} />
            </span>
            <div className="min-w-0 flex-1" aria-live="polite">
              <p className="font-display text-[1.1rem] font-extrabold leading-tight text-paper">
                En attente de {hostName ? <span className="text-fluo-yellow">{hostName}</span> : "l'hôte"}…
              </p>
              <WaitingPhrase code={view.code} api={api} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Salon d'attente (phase "lobby"). */
export function LobbyScreen({ view, api }: PhaseProps) {
  const isHost = view.me?.isHost ?? false;
  const draft = useSettingsDraft(view.settings, api);
  const [tab, setTab] = useState<TabId>("joueurs");
  const baseId = useId();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  const changeTab = (next: TabId) => {
    setTab(next);
    // si l'en-tête est déjà sorti de l'écran, le nouvel onglet commence juste sous la barre d'onglets
    const scroller = scrollerRef.current;
    const anchor = tabsRef.current;
    if (scroller && anchor) {
      const top = anchor.offsetTop - 8;
      if (scroller.scrollTop > top) scroller.scrollTop = top;
    }
  };

  const names = (isHost ? draft.settings : view.settings).profs.length + (isHost ? draft.settings : view.settings).extraNames.length;
  const badges: Partial<Record<TabId, number>> = {
    joueurs: view.players.length,
    noms: names,
    perso: view.images.length,
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollerRef} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto grid w-full max-w-[560px] gap-3 px-3 pb-5 pt-3 lg:max-w-[1040px] lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start lg:gap-8 lg:px-6 lg:pt-6">
          <div className="lg:sticky lg:top-6">
            <InviteCard code={view.code} />
          </div>

          <div className="min-w-0">
            <div ref={tabsRef} className="sticky top-0 z-10 -mx-3 bg-ink/95 px-3 py-2 backdrop-blur-sm lg:top-0 lg:mx-0 lg:rounded-b-2xl lg:px-0 lg:pt-0">
              <Tabs active={tab} onChange={changeTab} badges={badges} baseId={baseId} />
            </div>
            <div id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${tab}`} className="pt-1">
              {tab === "joueurs" ? <PlayersPanel view={view} api={api} /> : null}
              {tab === "reglages" ? isHost ? <SettingsEditor view={view} draft={draft} /> : <SettingsSummary view={view} /> : null}
              {tab === "noms" ? <NamesPanel view={view} draft={isHost ? draft : null} /> : null}
              {tab === "perso" ? <PersoPanel view={view} api={api} /> : null}
            </div>
          </div>
        </div>
      </div>
      <StartBar view={view} api={api} draft={draft} />
    </div>
  );
}
