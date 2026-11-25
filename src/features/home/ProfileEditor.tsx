"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { motion } from "motion/react";
import { Emoji } from "@/components/ui/Emoji";
import { Icon } from "@/components/ui/Icon";
import { AVATARS } from "@/lib/content/emoji-lite";
import { randomNickname } from "@/lib/content/phrases";
import { LIMITS } from "@/lib/game/types";
import { loadProfile, saveProfile, type StoredProfile } from "@/features/game/session";
import { sfx } from "@/lib/sfx";

const DEFAULT_AVATAR = AVATARS[0];

function cleanStoredProfile(p: StoredProfile | null): StoredProfile | null {
  if (!p || typeof p.name !== "string" || typeof p.avatar !== "string") return null;
  return {
    name: p.name.slice(0, LIMITS.nameMaxLength),
    avatar: AVATARS.includes(p.avatar) ? p.avatar : DEFAULT_AVATAR,
  };
}

/**
 * État du profil (pseudo + avatar), pré-rempli depuis le stockage local.
 * À n'utiliser que dans un composant monté côté client (lecture de localStorage
 * et tirage au sort dès le premier rendu).
 */
export function useProfile() {
  const [profile, setProfile] = useState<StoredProfile>(() => {
    const stored = cleanStoredProfile(loadProfile());
    if (stored) return stored;
    return { name: "", avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)] ?? DEFAULT_AVATAR };
  });

  const update = useCallback((patch: Partial<StoredProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      saveProfile(next);
      return next;
    });
  }, []);

  return { profile, update };
}

/** Pseudo tel qu'il sera envoyé : espaces réduits, longueur bornée. */
export function tidyName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, LIMITS.nameMaxLength);
}

/**
 * Pseudo (avec dé pour un pseudo au hasard) + grille d'avatars.
 * Utilisé par l'accueil et par l'écran « rejoindre ».
 */
export function ProfileEditor({
  name,
  avatar,
  onChange,
  error,
  nameRef,
  onSubmit,
}: {
  name: string;
  avatar: string;
  onChange: (patch: Partial<StoredProfile>) => void;
  /** message sous le champ pseudo */
  error?: string | null;
  nameRef?: RefObject<HTMLInputElement | null>;
  /** touche Entrée dans le champ pseudo */
  onSubmit?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [rolls, setRolls] = useState(0);
  const stripRef = useRef<HTMLDivElement>(null);
  const nameId = useId();
  const errorId = useId();
  const gridId = useId();

  // amène l'avatar choisi dans la partie visible de la bande défilante
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip || expanded) return;
    const el = strip.querySelector<HTMLElement>('[aria-checked="true"]');
    if (!el) return;
    const target = el.offsetLeft - strip.clientWidth / 2 + el.offsetWidth / 2;
    strip.scrollLeft = Math.max(0, target);
  }, [expanded]);

  const rollName = () => {
    sfx.play("pop");
    setRolls((n) => n + 1);
    let next = randomNickname(Math.random);
    if (next === name) next = randomNickname(Math.random);
    onChange({ name: next });
  };

  const pick = (id: string) => {
    if (id !== avatar) sfx.play("tap");
    onChange({ avatar: id });
  };

  const onGridKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const i = Math.max(0, AVATARS.indexOf(avatar));
    const next = AVATARS[(i + dir + AVATARS.length) % AVATARS.length];
    onChange({ avatar: next });
    requestAnimationFrame(() => {
      const el = stripRef.current?.querySelector<HTMLElement>('[aria-checked="true"]');
      el?.focus();
      // dans la bande défilante, garder l'avatar choisi visible
      el?.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
  };

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center gap-3">
        <motion.div
          key={avatar}
          initial={{ scale: 0.7, rotate: -10 }}
          animate={{ scale: 1, rotate: -4 }}
          transition={{ type: "spring", stiffness: 500, damping: 18 }}
          className="grid h-[60px] w-[60px] flex-none place-items-center rounded-2xl md:h-[72px] md:w-[72px] md:[&_img]:!h-12 md:[&_img]:!w-12 border-[3px] border-ink bg-fluo-yellow shadow-[3px_3px_0_0_var(--color-ink)]"
          aria-hidden
        >
          <Emoji id={avatar} size={42} />
        </motion.div>
        <div className="min-w-0 flex-1">
          <label htmlFor={nameId} className="mb-1 block text-[0.78rem] font-bold uppercase tracking-wide text-ink/60">
            Ton pseudo
          </label>
          <div className="relative">
            <input
              id={nameId}
              ref={nameRef}
              className="field !pr-[58px]"
              value={name}
              onChange={(e) => onChange({ name: e.target.value.slice(0, LIMITS.nameMaxLength) })}
              onKeyDown={(e) => {
                if (e.key === "Enter" && onSubmit) {
                  e.preventDefault();
                  onSubmit();
                }
              }}
              maxLength={LIMITS.nameMaxLength}
              placeholder="Ex. Léa du fond"
              autoComplete="nickname"
              autoCapitalize="words"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="done"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
            />
            <button
              type="button"
              onClick={rollName}
              aria-label="Pseudo au hasard"
              title="Pseudo au hasard"
              className="absolute right-1 top-1 grid h-[44px] w-[48px] place-items-center md:h-[48px] md:w-[52px] rounded-[10px] outline-none hover:bg-ink/10 focus-visible:ring-4 focus-visible:ring-fluo-blue"
            >
              <motion.span
                key={rolls}
                initial={rolls ? { rotate: -200, scale: 0.7 } : false}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 14 }}
                className="block"
              >
                <Emoji id="game-die" size={30} />
              </motion.span>
            </button>
          </div>
        </div>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="-mt-1 text-[0.9rem] font-bold text-red-pen">
          {error}
        </p>
      ) : null}

      <div>
        <div className="mb-1 flex items-center justify-between">
          <span id={gridId} className="text-[0.78rem] font-bold uppercase tracking-wide text-ink/60">
            Ta tête
          </span>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="-mr-2 flex min-h-[36px] items-center md:min-h-[48px] gap-1 rounded-lg px-2 text-[0.85rem] font-bold text-ink/70 underline decoration-2 underline-offset-2 outline-none hover:text-ink focus-visible:ring-4 focus-visible:ring-fluo-blue"
          >
            {expanded ? "Replier" : `Voir les ${AVATARS.length}`}
            <Icon name="chevron-down" size={16} className={expanded ? "rotate-180" : ""} />
          </button>
        </div>
        <div className="relative -mx-1 min-w-0">
          <div
            ref={stripRef}
            role="radiogroup"
            aria-labelledby={gridId}
            onKeyDown={onGridKey}
            className={
              expanded
                ? "grid grid-cols-[repeat(auto-fill,minmax(46px,1fr))] gap-1 p-1 md:grid-cols-[repeat(auto-fill,minmax(56px,1fr))]"
                : "no-scrollbar grid snap-x grid-flow-col grid-rows-2 gap-1 overflow-x-auto overscroll-x-contain p-1 [grid-auto-columns:46px] md:[grid-auto-columns:56px]"
            }
          >
            {AVATARS.map((id, i) => {
              const selected = id === avatar;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`Tête n° ${i + 1}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => pick(id)}
                  className={[
                    "grid aspect-square min-h-[46px] snap-start place-items-center rounded-xl border-[2.5px] outline-none transition-transform duration-100 md:min-h-[56px] md:[&_img]:!h-10 md:[&_img]:!w-10",
                    "focus-visible:ring-4 focus-visible:ring-fluo-blue",
                    selected ? "z-[1] scale-105 border-ink bg-fluo-yellow shadow-[2px_2px_0_0_var(--color-ink)]" : "border-transparent hover:bg-ink/10 active:scale-90",
                  ].join(" ")}
                >
                  <Emoji id={id} size={32} />
                </button>
              );
            })}
          </div>
          {!expanded ? (
            <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-paper to-transparent" />
          ) : null}
        </div>
      </div>
    </div>
  );
}
