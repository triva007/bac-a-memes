"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Emoji } from "@/components/ui/Emoji";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import type { ApiFailure, PhaseProps } from "@/features/game/props";
import { LIMITS, type CustomImage } from "@/lib/game/types";
import { sfx } from "@/lib/sfx";

const imageUrl = (code: string, id: string) => `/api/rooms/${encodeURIComponent(code)}/images/${encodeURIComponent(id)}`;

/** Erreurs après lesquelles il est inutile d'essayer les images suivantes. */
const BLOCKING = new Set(["too_many_images", "uploads_off", "not_host", "bad_token", "kicked", "room_not_found", "network"]);

interface Progress {
  done: number;
  total: number;
}

function fileLabel(file: File, index: number): string {
  const name = file.name?.trim();
  if (!name || /^image\.(png|jpe?g|webp)$/i.test(name)) return `Image ${index + 1}`;
  return name.length > 28 ? `${name.slice(0, 25)}…` : name;
}

/** Onglet « Pack perso » : images ajoutées par les joueurs, qui deviennent des gabarits à légender. */
export function PersoPanel({ view, api }: PhaseProps) {
  const meId = view.me?.id;
  const isHost = view.me?.isHost ?? false;
  const mode = view.settings.uploads;
  const images = view.images;
  const mine = images.filter((i) => i.by === meId).length;
  const roomFull = images.length >= LIMITS.maxImages;
  const mineFull = mine >= LIMITS.maxImagesPerPlayer;
  const allowed = mode === "all" || (mode === "host" && isHost);
  const canAdd = allowed && !roomFull && !mineFull;
  const hostName = view.players.find((p) => p.isHost)?.name ?? "l'hôte";

  const [progress, setProgress] = useState<Progress | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<CustomImage | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);
  // dernière valeur des compteurs, lue par l'envoi (qui peut durer plusieurs secondes)
  const limitsRef = useRef({ room: images.length, mine });
  useEffect(() => {
    limitsRef.current = { room: images.length, mine };
  }, [images.length, mine]);

  const addFiles = useCallback(
    async (list: File[]) => {
      if (busyRef.current || list.length === 0) return;
      const problems: string[] = [];
      const pictures = list.filter((f) => f.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|heic|avif)$/i.test(f.name));
      if (pictures.length < list.length) problems.push("Seules les images sont acceptées (captures d'écran, photos).");
      const room = Math.max(0, Math.min(LIMITS.maxImages - limitsRef.current.room, LIMITS.maxImagesPerPlayer - limitsRef.current.mine));
      const batch = pictures.slice(0, room);
      if (pictures.length > batch.length) {
        problems.push(
          room === 0
            ? "Plus de place : la limite d'images est atteinte."
            : `Seulement ${room} image${room > 1 ? "s" : ""} envoyée${room > 1 ? "s" : ""} : la limite est atteinte.`,
        );
      }
      if (batch.length === 0) {
        setErrors(problems);
        if (problems.length) sfx.play("error");
        return;
      }
      busyRef.current = true;
      setErrors([]);
      setProgress({ done: 0, total: batch.length });
      let added = 0;
      for (let i = 0; i < batch.length; i++) {
        try {
          await api.addImage(batch[i]);
          added++;
        } catch (e) {
          const f = e as Partial<ApiFailure>;
          problems.push(`${fileLabel(batch[i], i)} : ${f.message || "envoi impossible."}`);
          if (f.error && BLOCKING.has(f.error)) break;
        }
        setProgress({ done: i + 1, total: batch.length });
      }
      busyRef.current = false;
      setProgress(null);
      setErrors(problems);
      if (added > 0) sfx.play("pop");
      if (problems.length) sfx.play("error");
    },
    [api],
  );

  // coller une image (Ctrl+V) n'importe où dans l'onglet
  useEffect(() => {
    if (!canAdd) return;
    const onPaste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith("image/"));
      if (files.length === 0) return;
      e.preventDefault();
      void addFiles(files);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [addFiles, canAdd]);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!canAdd) return;
    void addFiles([...e.dataTransfer.files]);
  };

  const remove = async () => {
    if (!preview || removing) return;
    setRemoving(true);
    setRemoveError(null);
    try {
      await api.removeImage(preview.id);
      sfx.play("tap");
      setPreviewOpen(false);
    } catch (e) {
      const f = e as Partial<ApiFailure>;
      if (f.error === "image_not_found") {
        setPreviewOpen(false);
      } else {
        sfx.play("error");
        setRemoveError(f.message || "Suppression impossible.");
      }
    } finally {
      setRemoving(false);
    }
  };

  const canRemove = (img: CustomImage) => isHost || img.by === meId;
  const busy = progress !== null;

  return (
    <div
      className="flex flex-col gap-3.5"
      onDragOver={(e) => {
        if (!canAdd) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        setDragOver(false);
      }}
      onDrop={onDrop}
    >
      <section className={`card p-3.5 transition-shadow ${dragOver ? "shadow-[0_0_0_5px_var(--color-fluo-blue)]" : ""}`}>
        <div className="flex items-center gap-2">
          <Emoji id="camera" size={26} />
          <h2 className="min-w-0 flex-1 font-display text-[1.12rem] font-extrabold leading-tight">Le pack perso</h2>
          <span className="flex-none text-[0.8rem] font-semibold tabular-nums text-ink/55" aria-label={`${images.length} images sur ${LIMITS.maxImages}`}>
            {images.length}/{LIMITS.maxImages}
          </span>
        </div>
        <p className="mt-1 text-[0.9rem] font-medium leading-snug text-ink/75">
          Ajoute des captures d&apos;écran des mèmes du moment&nbsp;: elles tomberont dans les mains à légender.
        </p>

        {allowed ? (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => {
                const files = [...(e.target.files ?? [])];
                e.target.value = "";
                void addFiles(files);
              }}
            />
            <button type="button" className="btn btn-pink mt-3 w-full" onClick={() => inputRef.current?.click()} disabled={!canAdd || busy}>
              {busy ? (
                <>
                  Envoi… {progress.done}/{progress.total}
                </>
              ) : (
                <>
                  <Icon name="image" size={22} />
                  Ajouter des images
                </>
              )}
            </button>
            {busy ? (
              <div className="mt-2 h-3 overflow-hidden rounded-full border-2 border-ink bg-white" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}>
                <div className="h-full bg-fluo-pink transition-[width] duration-300" style={{ width: `${Math.max(6, (progress.done / progress.total) * 100)}%` }} />
              </div>
            ) : null}
            <p className="mt-2 text-[0.8rem] font-semibold leading-snug text-ink/60">
              {roomFull
                ? "Le pack de la salle est plein : supprime une image pour en ajouter une autre."
                : mineFull
                  ? `Tu as ajouté tes ${LIMITS.maxImagesPerPlayer} images, c'est le maximum par joueur.`
                  : `Tu en as ajouté ${mine} sur ${LIMITS.maxImagesPerPlayer}.`}
              <span className="hidden lg:inline"> Tu peux aussi coller une image (Ctrl + V) ou la glisser ici.</span>
            </p>
          </>
        ) : (
          <p className="mt-3 flex items-start gap-2 rounded-xl border-[2.5px] border-ink bg-paper-2 px-3 py-2 text-[0.9rem] font-bold leading-snug">
            <Emoji id="locked" size={20} />
            <span>
              {mode === "off"
                ? isHost
                  ? "Tu as désactivé l'ajout d'images (onglet Réglages)."
                  : `L'ajout d'images est désactivé par ${hostName}.`
                : `Ici, seul ${hostName} peut ajouter des images.`}
            </span>
          </p>
        )}

        {errors.length > 0 ? (
          <ul role="alert" className="mt-2.5 space-y-1 rounded-xl border-[2.5px] border-red-pen bg-red-pen/10 px-3 py-2 text-[0.88rem] font-bold leading-snug text-red-pen">
            {errors.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        ) : null}
      </section>

      {images.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
          <AnimatePresence initial={false} mode="popLayout">
            {images.map((img) => (
              <motion.li
                key={img.id}
                layout
                initial={{ scale: 0.6, opacity: 0, rotate: -6 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 26 }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setPreview(img);
                    setRemoveError(null);
                    setPreviewOpen(true);
                  }}
                  aria-label={`Image ajoutée par ${img.byName}. Voir${canRemove(img) ? " ou supprimer" : ""}`}
                  className="relative block aspect-square w-full overflow-hidden rounded-[14px] border-[3px] border-ink bg-ink-3 shadow-[3px_3px_0_0_rgba(0,0,0,0.5)] outline-none focus-visible:ring-4 focus-visible:ring-fluo-blue active:scale-95"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl(view.code, img.id)} alt="" loading="lazy" decoding="async" draggable={false} className="h-full w-full object-cover" />
                  <span className="absolute inset-x-0 bottom-0 truncate bg-ink/80 px-1.5 py-[3px] text-left text-[0.68rem] font-bold leading-tight text-paper">
                    {img.by === meId ? "Toi" : img.byName}
                  </span>
                  {canRemove(img) ? (
                    <span className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full border-2 border-ink bg-paper text-ink" aria-hidden>
                      <Icon name="trash" size={13} strokeWidth={2.4} />
                    </span>
                  ) : null}
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      ) : (
        <div className="rounded-2xl border-[3px] border-dashed border-paper/25 px-4 py-6 text-center">
          <div className="mx-auto w-fit -rotate-6">
            <Emoji id="framed-picture" size={44} />
          </div>
          <p className="mt-2 font-[family-name:var(--font-hand)] text-[1.35rem] leading-tight text-paper/70">
            {allowed ? "Aucune image pour l'instant. Qui dégaine la première capture ?" : "Aucune image dans le pack pour l'instant."}
          </p>
        </div>
      )}

      <Modal
        open={previewOpen && preview !== null && images.some((i) => i.id === preview.id)}
        onClose={() => setPreviewOpen(false)}
        title={preview ? (preview.by === meId ? "Ton image" : `Image de ${preview.byName}`) : "Image"}
        size="sm"
        footer={
          preview && canRemove(preview) ? (
            <div className="flex gap-3">
              <button type="button" className="btn btn-paper flex-1" onClick={() => setPreviewOpen(false)}>
                Garder
              </button>
              <button type="button" className="btn btn-pink flex-1" onClick={remove} disabled={removing}>
                <Icon name="trash" size={19} />
                {removing ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          ) : undefined
        }
      >
        {preview ? (
          <div className="flex flex-col items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl(view.code, preview.id)}
              alt={`Image ajoutée par ${preview.byName}`}
              className="max-h-[52dvh] w-auto max-w-full rounded-xl border-[3px] border-ink bg-ink-3 object-contain"
            />
            {removeError ? (
              <p role="alert" className="text-[0.9rem] font-bold text-red-pen">
                {removeError}
              </p>
            ) : (
              <p className="text-center text-[0.86rem] font-medium text-ink/65">Elle peut tomber dans la main de n&apos;importe qui, avec une légende en haut et en bas.</p>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
