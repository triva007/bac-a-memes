"use client";

/**
 * FIN DE PARTIE (phase "final") : quatre volets — cérémonie du podium,
 * diplômes, classement complet, galerie — et une barre du bas pour rejouer
 * (hôte) ou quitter.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MotionConfig } from "motion/react";
import { Emoji } from "@/components/ui/Emoji";
import type { PhaseProps } from "@/features/game/props";
import { lastPlacePhrase } from "@/lib/content/phrases";
import type { MemeResult, PlayerView } from "@/lib/game/types";
import { sfx } from "@/lib/sfx";
import { Avatar, MEDALS, ordinal, pts, withRanks, type Ranked } from "@/features/vote/shared";
import { RankingList } from "@/features/results/RankingList";
import { Awards } from "./Awards";
import { Gallery } from "./Gallery";
import { MemeLightbox } from "./MemeLightbox";
import { Podium } from "./Podium";

type Final = NonNullable<PhaseProps["view"]["final"]>;
type Tab = "podium" | "awards" | "ranking" | "gallery";

const TABS: { id: Tab; label: string }[] = [
  { id: "podium", label: "Podium" },
  { id: "awards", label: "Diplômes" },
  { id: "ranking", label: "Classement" },
  { id: "gallery", label: "Galerie" },
];

export function FinalScreen({ view, api }: PhaseProps) {
  if (!view.final) {
    return <div className="flex h-full items-center justify-center p-6 text-center font-display text-xl font-extrabold text-paper/80">Le jury délibère…</div>;
  }
  return (
    <MotionConfig reducedMotion="user">
      <FinalStage view={view} api={api} final={view.final} />
    </MotionConfig>
  );
}

function FinalStage({ view, api, final }: PhaseProps & { final: Final }) {
  const meId = view.me?.id ?? null;
  const [tab, setTab] = useState<Tab>("podium");
  const [lightbox, setLightbox] = useState<{ items: MemeResult[]; index: number } | null>(null);
  const galleryScroller = useRef<HTMLDivElement>(null);

  const ranked = useMemo(() => {
    const byId = new Map(view.players.map((p) => [p.id, p]));
    const ordered = final.ranking.map((id) => byId.get(id)).filter((p): p is PlayerView => p !== undefined);
    return withRanks(ordered);
  }, [view.players, final.ranking]);
  const me = meId ? (ranked.find((r) => r.player.id === meId) ?? null) : null;
  const top = useMemo(() => ranked.slice(0, 3), [ranked]);

  const select = (next: Tab) => {
    if (next === tab) return;
    sfx.play("tap");
    setTab(next);
  };

  const panel = (id: Tab) => ({
    id: `final-panel-${id}`,
    role: "tabpanel" as const,
    "aria-labelledby": `final-tab-${id}`,
    hidden: tab !== id,
    className: "absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-contain",
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-none border-b-[3px] border-ink bg-ink-2 px-2 py-1.5">
        <div role="tablist" aria-label="Fin de partie" className="mx-auto grid max-w-xl grid-cols-4 gap-1">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                id={`final-tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`final-panel-${t.id}`}
                onClick={() => select(t.id)}
                className={`h-11 rounded-xl border-2 px-0.5 font-display text-[13.5px] font-extrabold leading-none tracking-tight outline-none transition-colors focus-visible:ring-4 focus-visible:ring-fluo-blue ${
                  active ? "border-ink bg-fluo-yellow text-ink shadow-[2px_2px_0_0_rgba(0,0,0,0.55)]" : "border-transparent text-paper/70 hover:text-paper"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <div {...panel("podium")}>
          <Podium top={top} me={me} total={ranked.length} seed={view.code} onNext={() => select("awards")} />
        </div>
        <div {...panel("awards")}>
          <Awards
            awards={final.awards}
            gallery={final.gallery}
            players={view.players}
            meId={meId}
            onOpenMeme={(memeId) => {
              const index = final.gallery.findIndex((g) => g.memeId === memeId);
              if (index >= 0) setLightbox({ items: final.gallery, index });
            }}
          />
        </div>
        <div {...panel("ranking")}>
          <FinalRanking ranked={ranked} me={me} seed={view.code} />
        </div>
        <div {...panel("gallery")} ref={galleryScroller}>
          <Gallery gallery={final.gallery} players={view.players} meId={meId} scrollerRef={galleryScroller} onOpen={(items, index) => setLightbox({ items, index })} />
        </div>
      </div>

      <Footer view={view} api={api} />

      {lightbox ? (
        <MemeLightbox
          items={lightbox.items}
          index={lightbox.index}
          onIndex={(index) => setLightbox((cur) => (cur ? { ...cur, index } : cur))}
          onClose={() => setLightbox(null)}
          players={view.players}
          meId={meId}
        />
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------ classement complet

function FinalRanking({ ranked, me, seed }: { ranked: Ranked[]; me: Ranked | null; seed: string }) {
  const rows = useMemo(() => ranked.map((r) => ({ player: r.player, rank: r.rank, score: r.player.score })), [ranked]);
  const last = ranked.length >= 4 ? ranked[ranked.length - 1] : null;
  const showLast = last !== null && last.rank > 3;
  const lastIsMe = showLast && me?.player.id === last.player.id;

  return (
    <div className="mx-auto w-full max-w-xl px-3 pb-6 pt-3">
      <h2 className="font-display text-[26px] font-extrabold leading-tight text-paper">
        Classement <span className="hl text-ink">final</span>
      </h2>

      {me ? (
        <div className="card mt-3 flex -rotate-1 items-center gap-3 bg-fluo-yellow px-3.5 py-3" style={{ background: "var(--color-fluo-yellow)" }}>
          <Avatar avatar={me.player.avatar} color={me.player.color} size={52} />
          <div className="min-w-0 flex-1">
            <p className="font-display text-[22px] font-extrabold leading-none">
              Tu finis {ordinal(me.rank)}
              {me.tied ? <span className="ml-1.5 text-[13px] font-bold text-ink/60">ex æquo</span> : null}
            </p>
            <p className="mt-1 text-[14px] font-semibold leading-tight text-ink/70">
              sur {ranked.length} joueur{ranked.length > 1 ? "s" : ""}, avec <span className="font-extrabold tabular-nums text-ink">{me.player.score}</span> {pts(me.player.score)}
            </p>
          </div>
          {me.rank <= 3 && me.player.score > 0 ? <Emoji id={MEDALS[me.rank - 1]} size={46} /> : null}
        </div>
      ) : null}

      <RankingList rows={rows} meId={me?.player.id ?? null} className="mt-4" />

      {showLast && last ? (
        <div
          className="relative mx-auto mt-6 max-w-sm rotate-1 rounded-md border-2 border-ink/80 px-4 pb-3.5 pt-4 text-ink shadow-[4px_4px_0_0_rgba(0,0,0,0.5)]"
          style={{ background: "#fff3a6" }}
        >
          <span className="absolute -top-3 left-1/2 h-5 w-20 -translate-x-1/2 -rotate-2 rounded-sm bg-fluo-pink/70" aria-hidden />
          <p className="flex items-center gap-2 text-[13px] font-bold leading-tight">
            <Avatar avatar={last.player.avatar} color={last.player.color} size={28} />
            <span>{lastIsMe ? "Un mot pour toi, qui fermes la marche" : `Un mot pour ${last.player.name}, qui ferme la marche`}</span>
          </p>
          <p className="mt-2 text-[23px] leading-[1.05]" style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}>
            {lastPlacePhrase(`${seed}:${last.player.id}`)}
          </p>
          <span className="absolute -bottom-3 -right-2 rotate-12" aria-hidden>
            <Emoji id="red-heart" size={30} />
          </span>
        </div>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------ barre du bas

function Footer({ view, api }: PhaseProps) {
  const router = useRouter();
  const isHost = view.me?.isHost ?? false;
  const [busy, setBusy] = useState<null | "again" | "leave">(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);

  useEffect(() => {
    if (!confirmLeave) return;
    const t = setTimeout(() => setConfirmLeave(false), 4000);
    return () => clearTimeout(t);
  }, [confirmLeave]);

  const again = () => {
    if (busy) return;
    setBusy("again");
    setError(null);
    sfx.play("start");
    api
      .send({ type: "again" })
      .catch((e: { message?: string }) => {
        sfx.play("error");
        setError(e?.message ?? "Impossible de relancer la partie.");
      })
      .finally(() => setBusy(null));
  };

  const leave = () => {
    if (busy) return;
    if (!confirmLeave) {
      setConfirmLeave(true);
      return;
    }
    setBusy("leave");
    api.leave().finally(() => router.push("/"));
  };

  return (
    <footer className="flex-none border-t-[3px] border-ink bg-ink-2" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
      <div className="mx-auto flex w-full max-w-xl items-center gap-3 px-3 pt-2">
        {view.me ? (
          <button
            type="button"
            onClick={leave}
            disabled={busy !== null}
            className={`btn btn-sm min-h-[44px] flex-none ${confirmLeave ? "btn-pink" : "btn-ghost"}`}
          >
            {busy === "leave" ? "À la prochaine…" : confirmLeave ? "Sûr ? Quitter" : "Quitter"}
          </button>
        ) : null}
        <div className="min-w-0 flex-1 text-right">
          {error ? (
            <span className="text-[12px] font-semibold leading-tight text-fluo-pink">{error}</span>
          ) : !isHost ? (
            <span className="text-[13px] font-medium leading-tight text-paper/55">
              {view.me ? "L'hôte peut lancer la revanche." : "Partie terminée. Merci d'avoir regardé !"}
            </span>
          ) : null}
        </div>
        {isHost ? (
          <button type="button" className="btn btn-green min-h-[44px] flex-none px-5 py-2" onClick={again} disabled={busy !== null}>
            {busy === "again" ? "On relance…" : "Rejouer"}
          </button>
        ) : null}
      </div>
    </footer>
  );
}
