"use client";

/**
 * Feuille basse des stickers : onglets de `STICKER_GROUPS` + recherche (index
 * complet chargé à la demande). Elle recouvre le bas de l'éditeur seulement :
 * l'aperçu reste visible et manipulable au-dessus.
 */

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { STICKER_GROUPS, emojiUrl } from "@/lib/content/emoji-lite";
import { MAX_STICKERS } from "@/lib/game/types";
import { Emoji } from "@/components/ui/Emoji";
import { Icon } from "./ui";

type SearchFn = (query: string, limit?: number) => { id: string; fr: string }[];

let searchModule: Promise<SearchFn> | null = null;
function loadSearch(): Promise<SearchFn> {
  searchModule ??= import("@/lib/content/emoji").then((m) => m.searchEmoji);
  searchModule.catch(() => {
    searchModule = null;
  });
  return searchModule;
}

export interface StickerPanelProps {
  count: number;
  onAdd: (emojiId: string) => void;
  onClose: () => void;
}

export function StickerPanel({ count, onAdd, onClose }: StickerPanelProps) {
  const [group, setGroup] = useState<string>(STICKER_GROUPS[0].id);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<{ fn: SearchFn } | null>(null);
  const [failed, setFailed] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const full = count >= MAX_STICKERS;

  const q = query.trim();
  const wantSearch = q.length > 0;

  useEffect(() => {
    if (!wantSearch || search) return;
    let alive = true;
    loadSearch().then(
      (fn) => {
        if (alive) setSearch({ fn });
      },
      () => {
        if (alive) setFailed(true);
      },
    );
    return () => {
      alive = false;
    };
  }, [wantSearch, search]);

  const results = wantSearch && search ? search.fn(q, 60) : null;
  const current = STICKER_GROUPS.find((g) => g.id === group) ?? STICKER_GROUPS[0];
  const ids: readonly string[] = wantSearch ? (results ? results.map((r) => r.id) : []) : current.ids;

  const pickGroup = (id: string) => {
    setGroup(id);
    setQuery("");
    gridRef.current?.scrollTo({ top: 0 });
  };

  return (
    <motion.div
      role="dialog"
      aria-label="Stickers"
      data-testid="sticker-panel"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 420, damping: 38 }}
      className="absolute inset-0 z-20 flex flex-col rounded-t-[20px] border-x-[3px] border-t-[3px] border-ink bg-paper text-ink shadow-[0_-6px_0_0_rgba(0,0,0,0.35)]"
    >
      <div className="flex flex-none items-center gap-2 px-3 pt-2.5">
        <label className="relative block min-w-0 flex-1">
          <span className="sr-only">Chercher un sticker</span>
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/50">
            <Icon name="search" size={18} />
          </span>
          <input
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value.slice(0, 30))}
            onFocus={() => void loadSearch().catch(() => {})}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            placeholder="Chercher : feu, clown, 20/20…"
            className="field !min-h-[44px] !rounded-xl !border-[2.5px] !py-1.5 !pl-9"
            data-testid="sticker-search"
          />
        </label>
        <span
          className={`flex-none rounded-lg border-2 border-ink px-2 py-1 font-display text-[0.82rem] font-extrabold leading-none ${full ? "bg-fluo-orange" : "bg-paper-2"}`}
          aria-label={`${count} stickers posés sur ${MAX_STICKERS}`}
          data-testid="sticker-count"
        >
          {count}/{MAX_STICKERS}
        </span>
        <button type="button" onClick={onClose} className="btn btn-sm btn-green flex-none !min-h-[44px] !px-3" data-testid="sticker-close">
          <Icon name="check" size={18} stroke={3.4} />
          OK
        </button>
      </div>

      {!wantSearch ? (
        <div className="no-scrollbar flex flex-none gap-1.5 overflow-x-auto px-3 pb-1 pt-2" role="tablist" aria-label="Familles de stickers">
          {STICKER_GROUPS.map((g) => {
            const on = g.id === current.id;
            return (
              <button
                key={g.id}
                type="button"
                role="tab"
                aria-selected={on}
                aria-label={g.label}
                title={g.label}
                onClick={() => pickGroup(g.id)}
                className={`flex h-11 flex-none items-center gap-1.5 rounded-full border-[2.5px] px-2.5 font-display text-[0.82rem] font-extrabold outline-none focus-visible:ring-4 focus-visible:ring-fluo-blue ${
                  on ? "border-ink bg-fluo-yellow" : "border-ink/15 bg-paper-2"
                }`}
              >
                <Emoji id={g.emoji} size={24} />
                {on ? <span className="whitespace-nowrap pr-0.5">{g.label}</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}

      <div ref={gridRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pt-1" style={{ paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}>
        {full ? (
          <p className="mx-1 mb-1 mt-1 rounded-xl border-2 border-ink bg-fluo-orange px-3 py-1.5 text-center font-display text-[0.86rem] font-extrabold leading-tight" role="status">
            {MAX_STICKERS} stickers max ! Enlève-en un sur l&apos;aperçu pour en poser un autre.
          </p>
        ) : null}
        {wantSearch && !results ? (
          <p className="px-2 py-6 text-center text-sm font-semibold text-ink/60">{failed ? "La recherche n'a pas pu se charger. Passe par les onglets." : "Je fouille le tiroir à stickers…"}</p>
        ) : ids.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm font-semibold text-ink/60">Aucun sticker pour « {q} ». Essaie un mot plus simple.</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(52px,1fr))] gap-0.5" data-testid="sticker-grid">
            {ids.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => onAdd(id)}
                aria-label={`Poser le sticker ${id.replace(/-/g, " ")}`}
                data-sticker-id={id}
                className={`flex aspect-square touch-manipulation items-center justify-center rounded-xl outline-none transition-transform focus-visible:ring-4 focus-visible:ring-fluo-blue active:scale-90 active:bg-paper-2 ${full ? "opacity-40" : ""}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={emojiUrl(id)} alt="" width={38} height={38} loading="lazy" decoding="async" draggable={false} style={{ width: 38, height: 38, objectFit: "contain" }} />
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
