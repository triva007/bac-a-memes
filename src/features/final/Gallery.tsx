"use client";

/**
 * GALERIE de tous les mèmes de la partie : grille paresseuse (seules les cases
 * proches de l'écran montent leur mème), filtre « les miens », un appui ouvre
 * le mème en grand.
 */
import { useMemo, useState, type RefObject } from "react";
import { Emoji } from "@/components/ui/Emoji";
import type { MemeResult, PlayerView } from "@/lib/game/types";
import { sfx } from "@/lib/sfx";
import { Avatar, FALLBACK_COLOR, pts } from "@/features/vote/shared";
import { LazyMeme } from "@/features/results/LazyMeme";

export function Gallery({
  gallery,
  players,
  meId,
  scrollerRef,
  onOpen,
}: {
  gallery: MemeResult[];
  players: PlayerView[];
  meId: string | null;
  /** conteneur qui défile (pour le montage paresseux) */
  scrollerRef: RefObject<HTMLDivElement | null>;
  /** ouvre le mème `index` de la liste `items` (la liste filtrée affichée) */
  onOpen: (items: MemeResult[], index: number) => void;
}) {
  const [onlyMine, setOnlyMine] = useState(false);
  const mine = useMemo(() => (meId ? gallery.filter((g) => g.authorId === meId) : []), [gallery, meId]);
  const colors = useMemo(() => new Map(players.map((p) => [p.id, p.color])), [players]);
  const filterMine = onlyMine && meId !== null;
  const items = filterMine ? mine : gallery;

  return (
    <div className="mx-auto w-full max-w-5xl px-3 pb-6 pt-3 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <h2 className="font-display text-[26px] font-extrabold leading-tight text-paper">
            La <span className="inline-block -rotate-1 rounded-md bg-fluo-yellow px-2 text-ink">galerie</span>
          </h2>
          <p className="mt-0.5 text-[13px] font-medium text-paper/60">Touche un mème pour le voir en grand, le télécharger ou le partager.</p>
        </div>
        {meId ? (
          <div className="flex gap-1.5" role="group" aria-label="Filtrer la galerie">
            <FilterChip active={!filterMine} onClick={() => setOnlyMine(false)} label="Tous" count={gallery.length} />
            <FilterChip active={filterMine} onClick={() => setOnlyMine(true)} label="Les miens" count={mine.length} />
          </div>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="card mx-auto mt-6 max-w-md -rotate-1 px-5 py-6 text-center">
          <div className="flex justify-center">
            <Emoji id={filterMine ? "spider-web" : "framed-picture"} size={56} />
          </div>
          <h3 className="mt-3 font-display text-[21px] font-extrabold leading-tight">{filterMine ? "Ton mur est vide" : "Galerie vide"}</h3>
          <p className="mt-1.5 text-[15px] font-medium leading-snug text-ink/70">
            {filterMine
              ? "Tu n'as rendu aucun mème dans cette partie. La page blanche, ça arrive aux meilleurs."
              : "Aucun mème n'a survécu à cette partie. Il va falloir rejouer."}
          </p>
        </div>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((g, i) => (
            <li key={g.memeId} className="card relative p-1.5">
              <LazyMeme meme={g.meme} rootRef={scrollerRef} margin="300px 0px 300px 0px" className="aspect-square overflow-hidden rounded-[11px] bg-ink" />
              <div className="mt-1.5 flex items-center gap-1.5 px-0.5">
                <Avatar avatar={g.authorAvatar} color={colors.get(g.authorId) ?? FALLBACK_COLOR} size={22} />
                <span className={`min-w-0 flex-1 truncate text-[13px] leading-tight ${g.authorId === meId ? "font-extrabold" : "font-semibold"}`}>
                  {g.authorId === meId ? "Toi" : g.authorName}
                </span>
                <span className="flex-none rounded-md bg-ink px-1.5 py-0.5 font-display text-[12px] font-extrabold tabular-nums leading-none text-paper">{g.points}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  sfx.play("tap");
                  onOpen(items, i);
                }}
                aria-label={`Mème de ${g.authorName}, ${g.points} ${pts(g.points)}, manche ${g.round} : voir en grand`}
                className="absolute inset-0 rounded-[15px] outline-none focus-visible:ring-4 focus-visible:ring-fluo-blue"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => {
        sfx.play("tap");
        onClick();
      }}
      className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full border-2 px-3.5 font-display text-[14px] font-extrabold leading-none outline-none transition-colors focus-visible:ring-4 focus-visible:ring-fluo-blue ${
        active ? "border-ink bg-fluo-yellow text-ink shadow-[2px_2px_0_0_rgba(0,0,0,0.55)]" : "border-paper/30 text-paper/75"
      }`}
    >
      {label}
      <span className={`tabular-nums ${active ? "text-ink/60" : "text-paper/45"}`}>{count}</span>
    </button>
  );
}
