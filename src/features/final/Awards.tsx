"use client";

/**
 * RÉCOMPENSES : des « diplômes » posés face cachée (on voit le titre, pas le
 * lauréat). Un appui retourne la carte : joueur, explication, et le mème
 * concerné quand il y en a un.
 */
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { MemeView } from "@/components/meme/MemeView";
import { Emoji } from "@/components/ui/Emoji";
import type { Award, MemeResult, PlayerView } from "@/lib/game/types";
import { sfx } from "@/lib/sfx";
import { Avatar, FALLBACK_COLOR, fireConfetti } from "@/features/vote/shared";

const NEWS = { fontFamily: "var(--font-news)" } as const;
const TYPE = { fontFamily: "var(--font-type)" } as const;

export function Awards({
  awards,
  gallery,
  players,
  meId,
  onOpenMeme,
}: {
  awards: Award[];
  gallery: MemeResult[];
  players: PlayerView[];
  meId: string | null;
  onOpenMeme: (memeId: string) => void;
}) {
  const [flipped, setFlipped] = useState<ReadonlySet<string>>(() => new Set());
  const memes = useMemo(() => new Map(gallery.map((g) => [g.memeId, g])), [gallery]);
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const allFlipped = awards.length > 0 && awards.every((a) => flipped.has(a.id));

  const toggle = (award: Award) => {
    const next = new Set(flipped);
    if (next.has(award.id)) {
      next.delete(award.id);
      sfx.play("tap");
    } else {
      next.add(award.id);
      if (award.playerId === meId) {
        sfx.play("points", 0.9);
        void fireConfetti("mini");
      } else sfx.play("pop");
    }
    setFlipped(next);
  };

  if (awards.length === 0) {
    return (
      <div className="mx-auto max-w-md px-3 pt-8 text-center">
        <div className="card -rotate-1 px-5 py-6">
          <div className="flex justify-center">
            <Emoji id="scroll" size={56} />
          </div>
          <h2 className="mt-3 font-display text-[22px] font-extrabold leading-tight">Pas de diplôme cette fois</h2>
          <p className="mt-1.5 text-[15px] font-medium leading-snug text-ink/70">
            Le jury n&apos;a pas eu assez de mèmes à se mettre sous la dent. Session de rattrapage à la prochaine partie.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-3 pb-6 pt-3 lg:px-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="min-w-0 font-display text-[26px] font-extrabold leading-tight text-paper">
          Les <span className="inline-block -rotate-1 rounded-md bg-fluo-yellow px-2 text-ink">diplômes</span>
        </h2>
        <button
          type="button"
          className="btn btn-ghost btn-sm min-h-[44px] flex-none"
          onClick={() => {
            sfx.play("pop");
            setFlipped(allFlipped ? new Set() : new Set(awards.map((a) => a.id)));
          }}
        >
          {allFlipped ? "Tout cacher" : "Tout retourner"}
        </button>
      </div>
      <p className="mt-1 text-[13px] font-medium text-paper/60">Touche un diplôme pour découvrir qui le décroche.</p>

      <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {awards.map((award, i) => (
          <li key={award.id}>
            <Diploma
              award={award}
              index={i}
              flipped={flipped.has(award.id)}
              onToggle={() => toggle(award)}
              player={byId.get(award.playerId)}
              isMe={award.playerId === meId}
              meme={award.memeId ? memes.get(award.memeId) : undefined}
              onOpenMeme={onOpenMeme}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Diploma({
  award,
  index,
  flipped,
  onToggle,
  player,
  isMe,
  meme,
  onOpenMeme,
}: {
  award: Award;
  index: number;
  flipped: boolean;
  onToggle: () => void;
  player: PlayerView | undefined;
  isMe: boolean;
  meme: MemeResult | undefined;
  onOpenMeme: (memeId: string) => void;
}) {
  const tilt = index % 2 === 0 ? -0.8 : 0.8;
  return (
    <div className="relative h-[224px]" style={{ perspective: 1100, rotate: `${tilt}deg` }}>
      <motion.div
        className="absolute inset-0"
        style={{ transformStyle: "preserve-3d" }}
        initial={false}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
      >
        {/* ------------------------------------------------ face cachée : le titre, pas le lauréat */}
        <button
          type="button"
          onClick={onToggle}
          inert={flipped}
          aria-label={`Diplôme « ${award.title} » : découvrir le lauréat`}
          className="card absolute inset-0 flex flex-col items-center justify-center overflow-hidden p-3 text-center outline-none [backface-visibility:hidden] focus-visible:ring-4 focus-visible:ring-fluo-blue"
        >
          <span className="pointer-events-none absolute inset-[7px] rounded-[11px] border-2 border-ink/25" aria-hidden />
          <span className="pointer-events-none absolute inset-[11px] rounded-[8px] border border-ink/20" aria-hidden />
          <span className="text-[10px] uppercase tracking-[0.2em] text-ink/55" style={TYPE}>
            Diplôme du Bac à Mèmes
          </span>
          <span className="mt-2">
            <Emoji id={award.emoji} size={68} />
          </span>
          <span className="mt-2 text-balance px-3 text-[23px] font-black leading-[1.1]" style={NEWS}>
            {award.title}
          </span>
          <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-fluo-yellow px-3 py-1 font-display text-[13px] font-extrabold leading-none">
            Décerné à… <span className="text-ink/60">touche pour voir</span>
          </span>
          <span className="pointer-events-none absolute -right-1 -top-1 rotate-12" aria-hidden>
            <Emoji id="rosette" size={40} />
          </span>
        </button>

        {/* ------------------------------------------------ face révélée */}
        <div
          inert={!flipped}
          className="card absolute inset-0 flex overflow-hidden [backface-visibility:hidden]"
          style={{ transform: "rotateY(180deg)" }}
        >
          <span className="pointer-events-none absolute inset-[7px] rounded-[11px] border-2 border-ink/20" aria-hidden />
          <div className="relative flex min-w-0 flex-1 flex-col py-3.5 pl-4 pr-2">
            <div className="flex items-center gap-1.5">
              <Emoji id={award.emoji} size={24} />
              <span className="line-clamp-2 min-w-0 text-[15.5px] font-black leading-[1.1]" style={NEWS}>
                {award.title}
              </span>
            </div>
            <span className="mt-2 text-[10px] uppercase tracking-[0.18em] text-ink/55" style={TYPE}>
              décerné à
            </span>
            <div className="mt-1 flex min-w-0 items-center gap-2">
              <Avatar avatar={player?.avatar ?? "ghost"} color={player?.color ?? FALLBACK_COLOR} size={40} />
              <span className="min-w-0 truncate font-display text-[21px] font-extrabold leading-tight">
                <span className="hl" style={{ ["--hl" as string]: player?.color ?? "var(--color-fluo-yellow)" }}>
                  {award.playerName}
                </span>
              </span>
            </div>
            <p className="mt-2 line-clamp-4 text-[17.5px] leading-[1.08] text-ink/85" style={{ fontFamily: "var(--font-hand)", fontWeight: 600 }}>
              {award.description}
            </p>
            {isMe ? (
              <span className="mt-auto inline-flex w-fit -rotate-2 items-center rounded-md border-2 border-ink bg-fluo-green px-2 py-0.5 font-display text-[12px] font-extrabold leading-tight">
                C&apos;est toi !
              </span>
            ) : null}
          </div>

          <div className="relative flex w-[118px] flex-none flex-col items-center justify-between py-3 pr-3">
            <button
              type="button"
              onClick={onToggle}
              aria-label="Retourner le diplôme"
              className="grid h-11 w-11 flex-none place-items-center self-end rounded-full text-ink/55 outline-none hover:bg-ink/10 focus-visible:ring-4 focus-visible:ring-fluo-blue"
              style={{ marginTop: -6, marginRight: -6 }}
            >
              <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M4 12a8 8 0 1 0 2.6-5.9M4 4v5h5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {meme && flipped ? (
              <div className="relative h-[104px] w-[104px] flex-none rotate-2 overflow-hidden rounded-xl border-[3px] border-ink bg-ink shadow-[3px_3px_0_0_rgba(0,0,0,0.5)]">
                <MemeView meme={meme.meme} fit="contain" rounded={false} />
                <button
                  type="button"
                  onClick={() => onOpenMeme(meme.memeId)}
                  aria-label="Voir le mème en grand"
                  className="absolute inset-0 rounded-[9px] outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-fluo-blue"
                />
              </div>
            ) : (
              <span className="grid h-[104px] w-[104px] flex-none place-items-center opacity-90" aria-hidden>
                <Emoji id="rosette" size={76} />
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
