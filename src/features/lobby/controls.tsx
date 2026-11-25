"use client";

import { useId, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { sfx } from "@/lib/sfx";

/** Titre de section sur carte papier. */
export function SectionCard({ title, hint, children, className = "" }: { title: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card p-3.5 ${className}`}>
      <h3 className="font-display text-[1.12rem] font-extrabold leading-tight">{title}</h3>
      {hint ? <p className="mt-0.5 text-[0.86rem] font-medium leading-snug text-ink/65">{hint}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/**
 * Compteur − valeur + . Avec `values`, parcourt une liste de paliers
 * (la valeur courante peut être hors liste : on saute au palier voisin).
 */
export function Stepper({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  step = 1,
  values,
  format = String,
  disabled = false,
}: {
  label: string;
  hint?: ReactNode;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  values?: readonly number[];
  format?: (v: number) => string;
  disabled?: boolean;
}) {
  const labelId = useId();
  const prev = values ? [...values].reverse().find((v) => v < value) : Math.max(min, value - step);
  const next = values ? values.find((v) => v > value) : Math.min(max, value + step);
  const canDown = !disabled && prev !== undefined && prev < value;
  const canUp = !disabled && next !== undefined && next > value;
  const go = (v: number | undefined) => {
    if (v === undefined) return;
    sfx.play("tap");
    onChange(v);
  };
  const btn =
    "grid h-11 w-11 flex-none place-items-center rounded-full border-[2.5px] border-ink bg-white outline-none transition-transform active:scale-90 disabled:opacity-30 focus-visible:ring-4 focus-visible:ring-fluo-blue";
  return (
    <div className={`flex min-h-[52px] items-center gap-2 py-1 ${disabled ? "opacity-45" : ""}`} role="group" aria-labelledby={labelId}>
      <div className="min-w-0 flex-1">
        <div id={labelId} className="text-[0.98rem] font-bold leading-tight">
          {label}
        </div>
        {hint ? <div className="text-[0.8rem] font-medium leading-snug text-ink/60">{hint}</div> : null}
      </div>
      <button type="button" className={btn} onClick={() => go(prev)} disabled={!canDown} aria-label={`Moins : ${label}`}>
        <Icon name="minus" size={20} strokeWidth={3} />
      </button>
      <output className="min-w-[68px] text-center font-display text-[1.15rem] font-extrabold tabular-nums leading-none" aria-live="polite">
        {format(value)}
      </output>
      <button type="button" className={btn} onClick={() => go(next)} disabled={!canUp} aria-label={`Plus : ${label}`}>
        <Icon name="plus" size={20} strokeWidth={3} />
      </button>
    </div>
  );
}

/** Choix exclusif en pastilles. */
export function Segmented<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint?: ReactNode;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const labelId = useId();
  return (
    <div className="py-1">
      <div id={labelId} className="text-[0.98rem] font-bold leading-tight">
        {label}
      </div>
      {hint ? <div className="text-[0.8rem] font-medium leading-snug text-ink/60">{hint}</div> : null}
      <div role="radiogroup" aria-labelledby={labelId} className="mt-2 flex rounded-[14px] border-[2.5px] border-ink bg-white p-[3px]">
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => {
                if (selected) return;
                sfx.play("tap");
                onChange(o.value);
              }}
              className={[
                "min-h-[40px] min-w-0 flex-auto rounded-[9px] px-1.5 text-[0.82rem] font-bold leading-tight outline-none focus-visible:ring-4 focus-visible:ring-fluo-blue",
                selected ? "bg-ink text-paper" : "text-ink/70 hover:bg-ink/10",
              ].join(" ")}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Interrupteur oui / non. */
export function Switch({ label, hint, checked, onChange }: { label: string; hint?: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => {
        sfx.play("tap");
        onChange(!checked);
      }}
      className="flex min-h-[52px] w-full items-center gap-3 rounded-xl py-1 text-left outline-none focus-visible:ring-4 focus-visible:ring-fluo-blue"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[0.98rem] font-bold leading-tight">{label}</span>
        {hint ? <span className="block text-[0.8rem] font-medium leading-snug text-ink/60">{hint}</span> : null}
      </span>
      <span
        aria-hidden
        className={`relative h-[32px] w-[58px] flex-none rounded-full border-[2.5px] border-ink transition-colors ${checked ? "bg-fluo-green" : "bg-paper-2"}`}
      >
        <span
          className={`absolute top-[2px] h-[23px] w-[23px] rounded-full border-[2.5px] border-ink bg-white transition-[left] duration-150 ${checked ? "left-[28px]" : "left-[2px]"}`}
        />
      </span>
      <span className="w-[34px] flex-none text-[0.86rem] font-bold text-ink/70" aria-hidden>
        {checked ? "Oui" : "Non"}
      </span>
    </button>
  );
}
