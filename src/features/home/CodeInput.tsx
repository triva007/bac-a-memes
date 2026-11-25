"use client";

import { useState, type RefObject } from "react";

export const CODE_LENGTH = 4;

/** Extrait un code de salle d'une saisie libre (lettres tapées, ou lien collé `/r/ABCD`, `?code=ABCD`). */
export function parseCode(raw: string): string {
  const fromLink = /(?:\/(?:r|tv)\/|[?&]code=)([a-z]{4})(?![a-z])/i.exec(raw);
  if (fromLink) return fromLink[1].toUpperCase();
  return raw
    .normalize("NFD")
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase()
    .slice(0, CODE_LENGTH);
}

/**
 * Saisie du code à 4 lettres : quatre grosses cases, un seul vrai champ
 * (invisible, par-dessus) pour que clavier, collage et lecteurs d'écran marchent normalement.
 */
export function CodeInput({
  value,
  onChange,
  onComplete,
  invalid,
  inputRef,
  describedBy,
}: {
  value: string;
  onChange: (code: string) => void;
  /** appelé quand la 4e lettre vient d'être saisie */
  onComplete?: (code: string) => void;
  invalid?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  describedBy?: string;
}) {
  const [focused, setFocused] = useState(false);
  const active = Math.min(value.length, CODE_LENGTH - 1);

  return (
    <div className="relative w-fit">
      <div aria-hidden className="flex gap-1.5">
        {Array.from({ length: CODE_LENGTH }, (_, i) => {
          const ch = value[i] ?? "";
          const isActive = focused && i === active;
          return (
            <div
              key={i}
              className={[
                "grid h-[60px] w-[50px] place-items-center rounded-[14px] md:h-[72px] md:w-[62px] border-[3px] bg-white font-display text-[2.1rem] font-extrabold leading-none text-ink transition-shadow",
                invalid ? "border-red-pen" : "border-ink",
                isActive ? "shadow-[0_0_0_4px_var(--color-fluo-blue)]" : "",
              ].join(" ")}
            >
              {ch || <span className="mb-1 h-[4px] w-4 self-end rounded-full bg-ink/20" />}
            </div>
          );
        })}
      </div>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          const next = parseCode(e.target.value);
          onChange(next);
          if (next.length === CODE_LENGTH && next !== value) onComplete?.(next);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-label="Code de la salle (4 lettres)"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="go"
        className="absolute inset-0 h-full w-full cursor-text rounded-[14px] bg-transparent text-center text-[16px] text-transparent caret-transparent opacity-[0.01] outline-none"
      />
    </div>
  );
}
