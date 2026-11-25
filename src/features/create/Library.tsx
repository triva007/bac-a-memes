"use client";

/** Joker — toute la bibliothèque de gabarits en feuille plein écran (onglets, recherche, vignettes paresseuses). */

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Emoji } from "@/components/ui/Emoji";
import { PERSO_CATEGORY, PERSO_PREFIX, type RoomView } from "@/lib/game/types";
import { buildPool } from "@/lib/game/deal";
import { TEMPLATES, availableCategories } from "@/lib/templates";
import { TemplateCard } from "./cards";
import type { TimePressure } from "./hooks";
import { Icon, Marker } from "./ui";

interface Item {
  id: string;
  name: string;
  category: string;
  search: string;
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

export interface LibraryProps {
  view: RoomView;
  selectedId: string | null;
  onPick: (templateId: string) => void;
  onClose: () => void;
  clock: TimePressure;
}

export function Library({ view, selectedId, onPick, onClose, clock }: LibraryProps) {
  const [tab, setTab] = useState<string>("all");
  const [query, setQuery] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const hands = view.create?.hands;

  const inHand = useMemo(() => new Set((hands ?? []).flat()), [hands]);

  const items = useMemo<Item[]>(() => {
    // uniquement les catégories activées par l'hôte (même règle que le serveur)
    const enabled = new Set(
      buildPool(
        TEMPLATES,
        view.images.map((img) => PERSO_PREFIX + img.id),
        view.settings.categories,
        view.settings.handSize,
      ).base.map((t) => t.id),
    );
    const base: Item[] = TEMPLATES.filter((t) => enabled.has(t.id)).map((t) => ({ id: t.id, name: t.name, category: t.category, search: norm(t.name) }));
    const perso: Item[] = view.images.map((img) => ({
      id: PERSO_PREFIX + img.id,
      name: `Image de ${img.byName}`,
      category: PERSO_CATEGORY,
      search: norm(`image perso ${img.byName}`),
    }));
    return [...base, ...perso];
  }, [view.images, view.settings.categories, view.settings.handSize]);

  const tabs = useMemo(() => {
    const present = new Set(items.map((i) => i.category));
    const list: { id: string; label: string; emoji: string }[] = [{ id: "all", label: "Tout", emoji: "sparkles" }];
    for (const c of availableCategories()) if (present.has(c.id)) list.push(c);
    if (present.has(PERSO_CATEGORY)) list.push({ id: PERSO_CATEGORY, label: "Pack perso", emoji: "framed-picture" });
    return list;
  }, [items]);

  const activeTab = tabs.some((t) => t.id === tab) ? tab : "all";
  const q = norm(query);
  const shown = items.filter((i) => (q ? q.split(/\s+/).every((w) => i.search.includes(w)) : activeTab === "all" || i.category === activeTab));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const pickTab = (id: string) => {
    setTab(id);
    setQuery("");
    scrollRef.current?.scrollTo({ top: 0 });
  };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Toute la bibliothèque de gabarits"
      data-testid="library"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 380, damping: 36 }}
      className="bg-grid fixed inset-0 z-50 flex flex-col text-paper"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex w-full max-w-[860px] flex-none flex-col gap-2.5 px-4 pb-2 pt-3">
        <div className="flex items-center gap-2">
          <Emoji id="joker" size={34} className="-rotate-6" />
          <h2 className="min-w-0 flex-1 font-display text-[1.4rem] font-extrabold leading-none">
            Toute la <Marker color="var(--color-fluo-pink)">bibliothèque</Marker>
          </h2>
          {clock.secs !== null ? (
            <span className={`flex h-9 min-w-9 items-center justify-center rounded-full border-[2.5px] border-ink px-2 font-display text-base font-extrabold text-ink ${clock.alert || clock.up ? "bg-red-pen text-paper" : "bg-fluo-yellow"}`} aria-label={`${clock.secs} secondes restantes`}>
              {clock.secs}
            </span>
          ) : null}
          <button type="button" onClick={onClose} className="btn btn-sm btn-paper !h-11 !min-h-11 !w-11 flex-none !p-0" aria-label="Fermer la bibliothèque">
            <Icon name="close" size={20} stroke={3} />
          </button>
        </div>
        <p className="text-[0.84rem] font-medium leading-snug text-paper/75">Prends ce que tu veux : ton joker n&apos;est consommé que si tu valides ton mème avec un gabarit hors de ta main.</p>

        <label className="relative block">
          <span className="sr-only">Chercher un gabarit par son nom</span>
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/55">
            <Icon name="search" size={20} />
          </span>
          <input
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value.slice(0, 40))}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            placeholder="Chercher un gabarit…"
            className="field !min-h-[48px] !py-2 !pl-10"
            data-testid="library-search"
          />
        </label>

        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Catégories">
          {tabs.map((t) => {
            const on = !q && activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => pickTab(t.id)}
                className={`flex h-11 flex-none items-center gap-1.5 rounded-full border-[2.5px] px-3 font-display text-[0.9rem] font-extrabold outline-none transition-colors focus-visible:ring-4 focus-visible:ring-fluo-blue ${
                  on ? "border-ink bg-fluo-yellow text-ink shadow-hard-light" : "border-paper/30 bg-ink-2 text-paper"
                }`}
              >
                <Emoji id={t.emoji} size={20} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-[860px] px-4 pt-2" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
          {shown.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-3.5 sm:grid-cols-3 md:grid-cols-4">
              {shown.map((it, i) => (
                <TemplateCard
                  key={it.id}
                  templateId={it.id}
                  name={it.name}
                  index={i}
                  eager={i < 6}
                  selected={it.id === selectedId}
                  badge={inHand.has(it.id) ? "Dans ta main" : undefined}
                  onPick={onPick}
                />
              ))}
            </div>
          ) : (
            <div className="mx-auto mt-10 max-w-xs text-center">
              <Emoji id="face-with-monocle" size={64} className="mx-auto" />
              <p className="mt-3 font-display text-lg font-extrabold leading-tight">Rien à ce nom-là.</p>
              <p className="mt-1 text-sm font-medium text-paper/70">Essaie un autre mot, ou fouille les onglets.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
