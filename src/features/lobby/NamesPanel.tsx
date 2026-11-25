"use client";

import { useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Emoji } from "@/components/ui/Emoji";
import { Icon } from "@/components/ui/Icon";
import { LIMITS, type RoomView } from "@/lib/game/types";
import { sfx } from "@/lib/sfx";
import type { SettingsDraft } from "./useSettingsDraft";

function cleanItem(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, LIMITS.nameListItemMaxLength).trim();
}

function mergeNames(current: string[], added: string[]): string[] {
  const out = [...current];
  const seen = new Set(current.map((n) => n.toLocaleLowerCase("fr")));
  for (const raw of added) {
    const name = cleanItem(raw);
    if (!name) continue;
    const key = name.toLocaleLowerCase("fr");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length >= LIMITS.maxNames) break;
  }
  return out;
}

function Chip({ name, color, onRemove }: { name: string; color: string; onRemove?: () => void }) {
  const cls = "flex min-h-[40px] max-w-full md:min-h-[48px] items-center gap-1 rounded-full border-[2.5px] border-ink py-1 pl-3 text-[0.92rem] font-bold leading-tight";
  if (!onRemove) {
    return (
      <span className={`${cls} pr-3`} style={{ background: color }}>
        <span className="truncate">{name}</span>
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Retirer ${name}`}
      title="Retirer"
      className={`${cls} pr-1.5 outline-none hover:brightness-95 focus-visible:ring-4 focus-visible:ring-fluo-blue active:scale-95`}
      style={{ background: color }}
    >
      <span className="truncate">{name}</span>
      <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-ink/15" aria-hidden>
        <Icon name="close" size={13} strokeWidth={3.5} />
      </span>
    </button>
  );
}

/** Liste d'étiquettes éditable : Entrée ou virgule pour ajouter, croix pour retirer. */
function TagList({
  title,
  hint,
  emoji,
  color,
  placeholder,
  values,
  onChange,
}: {
  title: string;
  hint: string;
  emoji: string;
  color: string;
  placeholder: string;
  values: string[];
  /** absent = lecture seule */
  onChange?: (next: string[]) => void;
}) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const full = values.length >= LIMITS.maxNames;

  const commit = (raw: string): boolean => {
    if (!onChange) return false;
    const parts = raw.split(/[,;\n]+/);
    const next = mergeNames(values, parts);
    if (next.length === values.length) return false;
    sfx.play("tap");
    onChange(next);
    return true;
  };

  const onText = (value: string) => {
    if (!/[,;\n]/.test(value)) {
      setText(value);
      return;
    }
    // une virgule (tapée ou collée) valide tout ce qui la précède ; le reste attend la suite
    const cut = Math.max(value.lastIndexOf(","), value.lastIndexOf(";"), value.lastIndexOf("\n"));
    commit(value.slice(0, cut));
    setText(value.slice(cut + 1).replace(/^\s+/, ""));
  };

  const submit = () => {
    if (!cleanItem(text)) return;
    commit(text);
    setText("");
  };

  return (
    <section className="card p-3.5">
      <div className="flex items-center gap-2">
        <Emoji id={emoji} size={26} />
        <h3 className="min-w-0 flex-1 font-display text-[1.12rem] font-extrabold leading-tight">{title}</h3>
        <span className="flex-none text-[0.8rem] font-semibold tabular-nums text-ink/55">
          {values.length}/{LIMITS.maxNames}
        </span>
      </div>
      <p className="mt-0.5 text-[0.86rem] font-medium leading-snug text-ink/65">{hint}</p>

      {values.length > 0 ? (
        <ul className="mt-2.5 flex flex-wrap gap-1.5" aria-label={title}>
          <AnimatePresence initial={false} mode="popLayout">
            {values.map((name) => (
              <motion.li
                key={name.toLocaleLowerCase("fr")}
                layout
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 26 }}
                className="max-w-full"
              >
                <Chip name={name} color={color} onRemove={onChange ? () => onChange(values.filter((n) => n !== name)) : undefined} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      ) : !onChange ? (
        <p className="mt-2.5 font-[family-name:var(--font-hand)] text-[1.2rem] leading-tight text-ink/50">Personne sur la liste pour l&apos;instant.</p>
      ) : null}

      {onChange ? (
        <form
          className="mt-2.5 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
            inputRef.current?.focus();
          }}
        >
          <label htmlFor={inputId} className="sr-only">
            Ajouter un nom à «&nbsp;{title}&nbsp;»
          </label>
          <input
            id={inputId}
            ref={inputRef}
            className="field min-w-0 flex-1 !min-h-[48px] !py-2"
            value={text}
            onChange={(e) => onText(e.target.value)}
            onBlur={submit}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && text === "" && values.length > 0 && e.repeat === false) {
                onChange(values.slice(0, -1));
              }
            }}
            placeholder={full ? "Liste pleine" : placeholder}
            disabled={full}
            maxLength={200}
            autoComplete="off"
            autoCapitalize="words"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="done"
          />
          <button type="submit" className="btn btn-sm !min-h-[48px] flex-none" disabled={full || !cleanItem(text)} aria-label="Ajouter ce nom">
            <Icon name="plus" size={20} strokeWidth={3} />
          </button>
        </form>
      ) : null}
    </section>
  );
}

/** Onglet « Noms » : les noms à charrier (profs + autres), éditables par l'hôte. */
export function NamesPanel({ view, draft }: { view: RoomView; draft: SettingsDraft | null }) {
  const s = draft ? draft.settings : view.settings;
  const hostName = view.players.find((p) => p.isHost)?.name;
  return (
    <div className="flex flex-col gap-3.5">
      <div className="px-1 text-paper">
        <h2 className="font-display text-[1.3rem] font-extrabold leading-tight">
          Les noms à <span className="rounded-md bg-fluo-pink px-1.5 text-ink">charrier</span>
        </h2>
        <p className="mt-1 text-[0.9rem] font-medium leading-snug text-paper/75">
          Ils apparaîtront dans les cartes situation et en un tap dans l&apos;éditeur.{" "}
          {draft ? "Entrée ou virgule pour ajouter, touche un nom pour le retirer." : hostName ? `C'est ${hostName} qui tient la liste.` : "C'est l'hôte qui tient la liste."}
        </p>
      </div>
      {draft?.error ? (
        <p role="alert" className="rounded-xl border-[2.5px] border-ink bg-fluo-pink px-3 py-2 text-[0.9rem] font-bold text-ink">
          {draft.error}
        </p>
      ) : null}
      <TagList
        title="Les profs"
        hint="Comme vous les appelez en vrai."
        emoji="teacher"
        color="var(--color-fluo-yellow)"
        placeholder="Mme Dupont, M. Bernard…"
        values={s.profs}
        onChange={draft ? (profs) => draft.set({ profs }) : undefined}
      />
      <TagList
        title="Les autres"
        hint="CPE, surveillants, délégués, absents du jour…"
        emoji="graduation-cap"
        color="var(--color-fluo-blue)"
        placeholder="Le CPE, Kévin…"
        values={s.extraNames}
        onChange={draft ? (extraNames) => draft.set({ extraNames }) : undefined}
      />
      <p className="px-2 text-center font-[family-name:var(--font-hand)] text-[1.25rem] leading-tight text-muted">Rappel&nbsp;: on charrie, on n&apos;humilie pas.</p>
    </div>
  );
}
