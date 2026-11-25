"use client";

/**
 * Mème en grand, par-dessus tout : auteur, points, répartition des notes,
 * navigation précédent / suivant (flèches, clavier, glissé), téléchargement
 * en PNG et partage natif quand le téléphone sait partager des fichiers.
 */
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { MemeView, exportMemePng, memeToPngBlob } from "@/components/meme/MemeView";
import { Emoji } from "@/components/ui/Emoji";
import { VOTE_OPTIONS, type MemeResult, type PlayerView } from "@/lib/game/types";
import { sfx } from "@/lib/sfx";
import { Avatar, ChevronIcon, CrossIcon, FALLBACK_COLOR, pts, slug } from "@/features/vote/shared";

type Busy = null | "download" | "share";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function MemeLightbox({
  items,
  index,
  onIndex,
  onClose,
  players,
  meId,
}: {
  items: MemeResult[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
  players: PlayerView[];
  meId: string | null;
}) {
  const item = items[Math.min(index, items.length - 1)];
  const many = items.length > 1;
  const memeRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [note, setNote] = useState<{ memeId: string; text: string; tone: "ok" | "error" } | null>(null);
  /** PNG déjà rendus (un deuxième appui est instantané, utile si le partage exige un geste « frais ») */
  const blobs = useRef(new Map<string, Blob>());
  const [canShare] = useState(() => typeof navigator !== "undefined" && typeof navigator.share === "function");

  const go = useCallback(
    (delta: number) => {
      if (!many) return;
      sfx.play("tap");
      onIndex((index + delta + items.length) % items.length);
    },
    [index, items.length, many, onIndex],
  );

  // ------------------------------------------------------------ clavier, focus, défilement de fond
  const handlers = useRef({ go, onClose });
  useEffect(() => {
    handlers.current = { go, onClose };
  }, [go, onClose]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        handlers.current.onClose();
      } else if (e.key === "ArrowRight") handlers.current.go(1);
      else if (e.key === "ArrowLeft") handlers.current.go(-1);
      else if (e.key === "Tab") {
        const panel = panelRef.current;
        if (!panel) return;
        const nodes = [...panel.querySelectorAll<HTMLElement>("button:not([disabled])")];
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prevOverflow;
      if (previous && document.contains(previous)) previous.focus({ preventScroll: true });
    };
  }, []);

  // ------------------------------------------------------------ glissé horizontal
  const swipe = useRef<{ id: number; x: number; y: number } | null>(null);
  const onPointerDown = (e: ReactPointerEvent) => {
    swipe.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: ReactPointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) go(dx < 0 ? 1 : -1);
  };

  if (!item || typeof document === "undefined") return null;

  // ------------------------------------------------------------ export
  const filename = `bac-a-memes-${slug(item.authorName)}-${slug(item.memeId)}.png`;
  const say = (text: string, tone: "ok" | "error") => setNote({ memeId: item.memeId, text, tone });
  const getBlob = async (): Promise<Blob> => {
    const cached = blobs.current.get(item.memeId);
    if (cached) return cached;
    if (!memeRef.current) throw new Error("mème absent");
    const blob = await memeToPngBlob(memeRef.current);
    blobs.current.set(item.memeId, blob);
    return blob;
  };

  const download = async () => {
    if (busy) return;
    setBusy("download");
    setNote(null);
    try {
      const cached = blobs.current.get(item.memeId);
      if (cached) downloadBlob(cached, filename);
      else if (memeRef.current) await exportMemePng(memeRef.current, filename);
      sfx.play("submit");
      say("Image enregistrée dans tes téléchargements.", "ok");
    } catch {
      sfx.play("error");
      say("L'image n'a pas voulu sortir. Réessaie.", "error");
    } finally {
      setBusy(null);
    }
  };

  const share = async () => {
    if (busy) return;
    setBusy("share");
    setNote(null);
    try {
      const blob = await getBlob();
      const file = new File([blob], filename, { type: "image/png" });
      const data: ShareData = { files: [file], title: "Bac à Mèmes", text: `Un mème signé ${item.authorName}` };
      if (typeof navigator.canShare === "function" && navigator.canShare(data)) {
        try {
          await navigator.share(data);
          say("C'est parti !", "ok");
        } catch (e) {
          const name = (e as { name?: string })?.name;
          if (name === "AbortError") return; // partage annulé par le joueur
          if (name === "NotAllowedError") {
            // le rendu a pris trop de temps pour ce geste : l'image est prête, un 2e appui suffit
            say("Image prête : appuie encore une fois sur Partager.", "ok");
            return;
          }
          throw e;
        }
      } else {
        downloadBlob(blob, filename);
        say("Partage indisponible ici : l'image a été téléchargée.", "ok");
      }
    } catch {
      sfx.play("error");
      say("Le partage a échoué. Essaie de télécharger l'image.", "error");
    } finally {
      setBusy(null);
    }
  };

  const author = players.find((p) => p.id === item.authorId);
  const message = note && note.memeId === item.memeId ? note : null;

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Mème de ${item.authorName}`}
      className="fixed inset-0 z-[90] flex flex-col bg-[#0c0b1f]/[0.97]"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex h-14 w-full max-w-3xl flex-none items-center justify-between px-3">
        <span className="font-display text-[15px] font-extrabold tabular-nums text-paper/80">
          {many ? (
            <>
              {index + 1}
              <span className="text-paper/45"> / {items.length}</span>
            </>
          ) : null}
        </span>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="grid h-11 w-11 place-items-center rounded-full border-2 border-paper/30 text-paper outline-none hover:bg-paper/10 focus-visible:ring-4 focus-visible:ring-fluo-blue"
        >
          <CrossIcon size={18} stroke={3} />
        </button>
      </div>

      <div
        className="relative mx-auto min-h-0 w-full max-w-3xl flex-1 touch-pan-y px-3"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipe.current = null)}
      >
        <motion.div
          key={item.memeId}
          className="h-full w-full"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.18 }}
        >
          <MemeView ref={memeRef} meme={item.meme} fit="contain" />
        </motion.div>
        {many ? (
          <>
            <NavButton dir="left" onClick={() => go(-1)} />
            <NavButton dir="right" onClick={() => go(1)} />
          </>
        ) : null}
      </div>

      <div className="mx-auto mt-3 w-full max-w-xl flex-none px-3">
        <div className="card px-3 pb-3 pt-2.5">
          <div className="flex items-center gap-2.5">
            <Avatar avatar={item.authorAvatar} color={author?.color ?? FALLBACK_COLOR} size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[19px] font-extrabold leading-tight">
                {item.authorName}
                {meId && item.authorId === meId ? <span className="ml-1.5 text-[13px] font-bold text-ink/55">(toi)</span> : null}
              </p>
              <div className="mt-0.5 flex items-center gap-2.5 whitespace-nowrap text-[12px] font-semibold text-ink/60">
                <span aria-label={`Manche ${item.round}`}>
                  <span className="min-[400px]:hidden" aria-hidden>
                    M{item.round}
                  </span>
                  <span className="max-[399px]:hidden" aria-hidden>
                    Manche {item.round}
                  </span>
                </span>
                <span className="flex items-center gap-1.5" aria-label="Notes reçues">
                  {VOTE_OPTIONS.map((o) => (
                    <span key={o.score} className="inline-flex items-center gap-0.5 tabular-nums" aria-label={`${o.label} : ${item.breakdown[o.score]}`}>
                      <Emoji id={o.emoji} size={14} />
                      {item.breakdown[o.score]}
                    </span>
                  ))}
                </span>
              </div>
            </div>
            <div className="flex-none rotate-3 rounded-xl border-[3px] border-ink bg-fluo-yellow px-2 py-1 text-center shadow-[3px_3px_0_0_var(--color-ink)]">
              <span className="block font-display text-[22px] font-extrabold leading-none tabular-nums">{item.points}</span>
              <span className="block text-[9px] font-bold uppercase leading-tight tracking-wide">{pts(item.points)}</span>
            </div>
          </div>

          <div className={`mt-3 grid gap-2.5 ${canShare ? "grid-cols-2" : "grid-cols-1"}`}>
            <button type="button" className="btn" onClick={download} disabled={busy !== null}>
              <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19.5h14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {busy === "download" ? "Ça développe…" : "Télécharger"}
            </button>
            {canShare ? (
              <button type="button" className="btn btn-blue" onClick={share} disabled={busy !== null}>
                <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 15V4m0 0L7.5 8.5M12 4l4.5 4.5M5 13v6.5h14V13" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {busy === "share" ? "Ça prépare…" : "Partager"}
              </button>
            ) : null}
          </div>
          <p
            className={`mt-2 min-h-[18px] text-center text-[13px] font-semibold leading-tight ${message?.tone === "error" ? "text-red-pen" : "text-ink/65"}`}
            aria-live="polite"
          >
            {message?.text ?? (many ? "Glisse ou utilise les flèches pour voir les autres." : "")}
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function NavButton({ dir, onClick }: { dir: "left" | "right"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      aria-label={dir === "left" ? "Mème précédent" : "Mème suivant"}
      className={`absolute top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border-[3px] border-ink bg-paper text-ink shadow-[3px_3px_0_0_rgba(0,0,0,0.55)] outline-none active:translate-x-[2px] active:shadow-none focus-visible:ring-4 focus-visible:ring-fluo-blue ${dir === "left" ? "left-1" : "right-1"}`}
    >
      <ChevronIcon dir={dir} size={18} stroke={4} />
    </button>
  );
}
