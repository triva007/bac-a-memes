"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { Emoji } from "@/components/ui/Emoji";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { copyText } from "@/components/ui/hooks";
import { sfx } from "@/lib/sfx";

/** QR code en SVG (modules nets, encre sur blanc pour un contraste maximal). */
export function QrCode({ text, className = "" }: { text: string; className?: string }) {
  const qr = useMemo(() => {
    try {
      const { modules } = QRCode.create(text, { errorCorrectionLevel: "M" });
      let d = "";
      for (let row = 0; row < modules.size; row++) {
        let col = 0;
        while (col < modules.size) {
          if (!modules.get(row, col)) {
            col++;
            continue;
          }
          let run = 1;
          while (col + run < modules.size && modules.get(row, col + run)) run++;
          d += `M${col} ${row}h${run}v1h-${run}z`;
          col += run;
        }
      }
      return { size: modules.size, d };
    } catch {
      return null;
    }
  }, [text]);

  if (!qr) return <div className={`grid place-items-center bg-white text-center text-[0.7rem] font-bold text-ink/60 ${className}`}>QR indisponible</div>;
  const margin = 2;
  const box = qr.size + margin * 2;
  return (
    <svg viewBox={`${-margin} ${-margin} ${box} ${box}`} shapeRendering="crispEdges" className={className} role="img" aria-label="QR code du lien de la salle">
      <rect x={-margin} y={-margin} width={box} height={box} fill="#fff" />
      <path d={qr.d} fill="#14132b" />
    </svg>
  );
}

function useFlash(ms = 2200): [boolean, () => void] {
  const [on, setOn] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const fire = () => {
    setOn(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOn(false), ms);
  };
  return [on, fire];
}

/** Bouton « copier » avec confirmation. */
export function CopyButton({
  text,
  label,
  doneLabel = "Copié !",
  className = "btn btn-paper btn-sm",
  iconSize = 18,
}: {
  text: string;
  label: string;
  doneLabel?: string;
  className?: string;
  iconSize?: number;
}) {
  const [done, flash] = useFlash();
  const [failed, flashFailed] = useFlash(3000);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        if (await copyText(text)) {
          sfx.play("tap");
          flash();
        } else {
          flashFailed();
        }
      }}
    >
      <Icon name={done ? "check" : "copy"} size={iconSize} />
      <span aria-live="polite">{failed ? "Copie impossible" : done ? doneLabel : label}</span>
    </button>
  );
}

/**
 * Haut du salon : code en très gros, QR code vers `/r/CODE`, partage du lien,
 * et l'encart « écran de classe ».
 */
export function InviteCard({ code }: { code: string }) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const host = typeof window === "undefined" ? "" : window.location.host;
  const joinUrl = `${origin}/r/${code}`;
  const tvUrl = `${origin}/tv/${code}`;
  const [zoom, setZoom] = useState(false);
  const [copied, flashCopied] = useFlash();
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const share = async () => {
    if (canShare) {
      try {
        await navigator.share({
          title: "Bac à Mèmes",
          text: `Rejoins ma partie de Bac à Mèmes\u00a0! Code\u00a0: ${code}`,
          url: joinUrl,
        });
        return;
      } catch (e) {
        if ((e as DOMException)?.name === "AbortError") return; // partage annulé
      }
    }
    if (await copyText(joinUrl)) {
      sfx.play("tap");
      flashCopied();
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      <section className="card relative flex items-stretch gap-3 p-3 lg:flex-col lg:items-center lg:gap-4 lg:p-5" aria-label="Inviter des joueurs">
        <div className="flex min-w-0 flex-1 flex-col justify-between lg:items-center lg:text-center">
          <div>
            <div className="text-[0.74rem] font-bold uppercase tracking-wide text-ink/60">Code de la salle</div>
            <div
              className="mt-0.5 w-fit -rotate-1 font-display text-[clamp(3rem,15.5vw,3.9rem)] font-extrabold leading-[0.95] tracking-[0.04em] lg:text-[5.4rem]"
              aria-label={code.split("").join(" ")}
            >
              <span className="hl [--hl:var(--color-fluo-yellow)]">{code}</span>
            </div>
          </div>
          <button type="button" className="btn btn-sm btn-green mt-2 w-fit lg:mt-4 lg:!min-h-[48px] lg:!px-5 lg:!text-[1rem]" onClick={share}>
            <Icon name={copied ? "check" : canShare ? "share" : "copy"} size={18} />
            <span aria-live="polite">{copied ? "Lien copié !" : canShare ? "Partager le lien" : "Copier le lien"}</span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => setZoom(true)}
          aria-label="Agrandir le QR code"
          className="group relative flex-none self-center rounded-[14px] border-[3px] border-ink bg-white p-1 outline-none focus-visible:ring-4 focus-visible:ring-fluo-blue lg:order-first"
        >
          <QrCode text={joinUrl} className="h-[104px] w-[104px] lg:h-[230px] lg:w-[230px]" />
          <span className="absolute -bottom-2 -right-2 grid h-7 w-7 place-items-center rounded-full border-2 border-ink bg-fluo-yellow lg:hidden" aria-hidden>
            <Icon name="expand" size={14} strokeWidth={3} />
          </span>
        </button>
      </section>

      <aside className="flex items-center gap-2.5 rounded-2xl border-2 border-dashed border-paper/35 bg-ink-2/70 py-1.5 pl-3 pr-1.5 text-paper">
        <Emoji id="television" size={28} />
        <p className="min-w-0 flex-1 text-[0.82rem] font-medium leading-snug text-paper/85">
          <strong className="font-bold text-paper">Écran de classe&nbsp;:</strong> ouvre{" "}
          <span className="whitespace-nowrap font-bold text-fluo-yellow">/tv/{code}</span> sur l&apos;ordi du vidéoprojecteur.
        </p>
        <CopyButton
          text={tvUrl}
          label="Copier"
          doneLabel="Copié"
          className="flex min-h-[44px] flex-none items-center gap-1.5 rounded-xl border-2 border-paper/35 px-2.5 text-[0.82rem] font-bold text-paper outline-none hover:bg-paper/10 focus-visible:ring-4 focus-visible:ring-fluo-blue"
          iconSize={16}
        />
      </aside>

      <Modal open={zoom} onClose={() => setZoom(false)} title="Scanne pour rejoindre" size="sm">
        <div className="flex flex-col items-center gap-3 pb-2 text-center">
          <div className="rounded-[18px] border-[3px] border-ink bg-white p-2">
            <QrCode text={joinUrl} className="h-[min(72vw,46dvh,320px)] w-[min(72vw,46dvh,320px)]" />
          </div>
          <div className="font-display text-[3rem] font-extrabold leading-none tracking-[0.06em]">
            <span className="hl">{code}</span>
          </div>
          <p className="break-all text-[0.9rem] font-semibold text-ink/65">
            {host}/r/{code}
          </p>
        </div>
      </Modal>
    </div>
  );
}
