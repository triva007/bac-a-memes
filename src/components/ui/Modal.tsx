"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Icon } from "./Icon";
import { useIsClient } from "./hooks";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Pile des fenêtres ouvertes : seule celle du dessus réagit au clavier. */
const stack: symbol[] = [];

function Panel({
  onClose,
  title,
  children,
  footer,
  size,
  tone,
}: {
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size: "sm" | "md";
  tone: "paper" | "ink";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const panel = ref.current;
    const id = Symbol("modal");
    stack.push(id);
    panel?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey, true);
      const at = stack.indexOf(id);
      if (at !== -1) stack.splice(at, 1);
      document.body.style.overflow = prevOverflow;
      if (previous && document.contains(previous)) previous.focus({ preventScroll: true });
    };
  }, []);

  const ink = tone === "ink";
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
      <motion.div
        className="absolute inset-0 bg-[#090818]/75"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
        aria-hidden
      />
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
        className={[
          "relative flex max-h-[min(92dvh,760px)] w-full flex-col overflow-hidden outline-none",
          "rounded-t-[24px] border-[3px] border-b-0 border-ink sm:rounded-[22px] sm:border-b-[3px]",
          "shadow-[0_-6px_0_0_rgba(0,0,0,0.35)] sm:shadow-[7px_7px_0_0_rgba(0,0,0,0.55)]",
          size === "sm" ? "sm:max-w-[420px]" : "sm:max-w-[520px]",
          ink ? "bg-ink-2 text-paper sm:border-paper/30" : "bg-paper text-ink",
        ].join(" ")}
      >
        <div className={`flex items-center gap-3 border-b-[3px] py-2.5 pl-5 pr-2.5 ${ink ? "border-paper/15" : "border-ink"}`}>
          <h2 id={titleId} className="min-w-0 flex-1 font-display text-[1.3rem] font-extrabold leading-tight">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className={`grid h-11 w-11 flex-none place-items-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-fluo-blue ${ink ? "hover:bg-paper/10" : "hover:bg-ink/10"}`}
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        {footer ? (
          <div
            className={`border-t-[3px] px-5 pt-3 ${ink ? "border-paper/15" : "border-ink/15"}`}
            style={{ paddingBottom: "max(0.9rem, env(safe-area-inset-bottom))" }}
          >
            {footer}
          </div>
        ) : (
          <div style={{ height: "env(safe-area-inset-bottom)" }} />
        )}
      </motion.div>
    </div>
  );
}

/**
 * Fenêtre modale : feuille qui monte du bas sur téléphone, carte centrée sur grand écran.
 * Échap et clic sur le fond ferment ; le focus est piégé puis rendu à l'élément d'origine.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
  tone = "paper",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md";
  tone?: "paper" | "ink";
}) {
  const isClient = useIsClient();
  if (!isClient) return null;
  return createPortal(
    <AnimatePresence>
      {open ? (
        <Panel key="panel" onClose={onClose} title={title} footer={footer} size={size} tone={tone}>
          {children}
        </Panel>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

/** Demande de confirmation avant une action qui fâche (quitter, expulser, supprimer). */
export function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title,
  children,
  confirmLabel,
  cancelLabel = "Annuler",
  danger = true,
  busy = false,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: ReactNode;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <div className="flex gap-3">
          <button type="button" className="btn btn-paper flex-1" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn flex-1 ${danger ? "btn-pink" : "btn-green"}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      <div className="text-[0.98rem] font-medium leading-snug text-ink/80">{children}</div>
    </Modal>
  );
}
