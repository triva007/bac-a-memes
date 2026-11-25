"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Emoji } from "@/components/ui/Emoji";
import { Icon } from "@/components/ui/Icon";
import { LIMITS, PERSO_CATEGORY, type GameMode, type RoomView, type Settings } from "@/lib/game/types";
import { availableCategories } from "@/lib/templates";
import { sfx } from "@/lib/sfx";
import { SectionCard, Segmented, Stepper, Switch } from "./controls";
import type { SettingsDraft } from "./useSettingsDraft";

export const MODES: { id: GameMode; title: string; text: string; emoji: string; color: string }[] = [
  {
    id: "classique",
    title: "Classique",
    text: "Chacun choisit un gabarit dans sa main et le légende à sa sauce.",
    emoji: "flower-playing-cards",
    color: "var(--color-fluo-yellow)",
  },
  {
    id: "meme-image",
    title: "Même image pour tous",
    text: "Toute la classe légende le même gabarit : que la meilleure vanne gagne.",
    emoji: "framed-picture",
    color: "var(--color-fluo-blue)",
  },
  {
    id: "theme",
    title: "Thème imposé",
    text: "Une situation tombe pour tout le monde, chacun l'illustre avec le gabarit de son choix.",
    emoji: "bullseye",
    color: "var(--color-fluo-pink)",
  },
];

const CREATE_STEPS = [30, 45, 60, 75, 90, 120, 150, 180, 210, 240] as const;
const VOTE_STEPS = [6, 8, 10, 12, 15, 20, 25, 30, 40] as const;

const UPLOAD_OPTIONS: { value: Settings["uploads"]; label: string }[] = [
  { value: "all", label: "Tout le monde" },
  { value: "host", label: "L'hôte seul" },
  { value: "off", label: "Personne" },
];

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m} min ${s}` : `${m} min`;
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/** Durée maximale d'une partie (si personne ne valide en avance), en minutes. */
function estimateMinutes(s: Settings, players: number): number {
  const perRound = s.createSeconds + players * (s.voteSeconds + LIMITS.revealSeconds) + LIMITS.resultsSeconds;
  return Math.max(1, Math.round((s.rounds * perRound) / 60));
}

interface CategoryOption {
  id: string;
  label: string;
  emoji: string;
}

function categoryOptions(hasImages: boolean): CategoryOption[] {
  const list: CategoryOption[] = availableCategories().map((c) => ({ id: c.id, label: c.label, emoji: c.emoji }));
  if (hasImages) list.push({ id: PERSO_CATEGORY, label: "Pack perso", emoji: "camera" });
  return list;
}

/** `[]` = toutes les catégories. */
function isCategoryOn(selected: string[], id: string): boolean {
  return selected.length === 0 || selected.includes(id);
}

// ---------------------------------------------------------------- hôte

function ModePicker({ value, onChange }: { value: GameMode; onChange: (m: GameMode) => void }) {
  return (
    <div role="radiogroup" aria-label="Mode de jeu" className="grid gap-2 lg:grid-cols-3">
      {MODES.map((m) => {
        const selected = m.id === value;
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => {
              if (selected) return;
              sfx.play("pop");
              onChange(m.id);
            }}
            className={[
              "relative flex min-h-[64px] items-center gap-3 rounded-2xl border-[3px] border-ink p-2.5 pr-9 text-left outline-none transition-transform focus-visible:ring-4 focus-visible:ring-fluo-blue lg:flex-col lg:items-start lg:pr-2.5",
              selected ? "shadow-[3px_3px_0_0_var(--color-ink)]" : "bg-white opacity-80 hover:opacity-100 active:scale-[0.98]",
            ].join(" ")}
            style={selected ? { background: m.color } : undefined}
          >
            <span className="grid h-11 w-11 flex-none place-items-center rounded-xl border-[2.5px] border-ink bg-white">
              <Emoji id={m.emoji} size={30} />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-[1.05rem] font-extrabold leading-tight">{m.title}</span>
              <span className={`mt-0.5 block text-[0.84rem] font-medium leading-snug ${selected ? "text-ink/85" : "text-ink/65"}`}>{m.text}</span>
            </span>
            {selected ? (
              <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-ink text-paper" aria-hidden>
                <Icon name="check" size={15} strokeWidth={3.5} />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function CategoryPicker({ selected, options, onChange }: { selected: string[]; options: CategoryOption[]; onChange: (next: string[]) => void }) {
  const all = options.map((o) => o.id);
  const onCount = all.filter((id) => isCategoryOn(selected, id)).length;
  const toggle = (id: string) => {
    const current = all.filter((c) => isCategoryOn(selected, c));
    const next = current.includes(id) ? current.filter((c) => c !== id) : [...current, id];
    if (next.length === 0) {
      sfx.play("error");
      return; // il en faut au moins une
    }
    sfx.play("tap");
    // tout coché = « toutes » (les futures catégories seront incluses)
    onChange(next.length === all.length ? [] : all.filter((c) => next.includes(c)));
  };
  return (
    <div className="py-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[0.98rem] font-bold leading-tight">Catégories de gabarits</span>
        <span className="text-[0.8rem] font-semibold text-ink/60">{onCount === all.length ? "toutes" : `${onCount} sur ${all.length}`}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Catégories de gabarits">
        {options.map((o) => {
          const on = isCategoryOn(selected, o.id);
          const last = on && onCount === 1;
          return (
            <button
              key={o.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              aria-disabled={last || undefined}
              title={last ? "Il faut garder au moins une catégorie" : undefined}
              onClick={() => toggle(o.id)}
              className={[
                "flex min-h-[44px] items-center gap-1.5 rounded-full border-[2.5px] border-ink py-1 pl-2 pr-3 text-[0.9rem] font-bold outline-none focus-visible:ring-4 focus-visible:ring-fluo-blue",
                on ? "bg-fluo-green shadow-[2px_2px_0_0_var(--color-ink)]" : "bg-white text-ink/55",
              ].join(" ")}
            >
              <span className={`grid h-[22px] w-[22px] flex-none place-items-center rounded-md border-2 border-ink ${on ? "bg-ink text-paper" : "bg-white"}`} aria-hidden>
                {on ? <Icon name="check" size={14} strokeWidth={3.5} /> : null}
              </span>
              <Emoji id={o.emoji} size={20} />
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Réglages modifiables par l'hôte. */
export function SettingsEditor({ view, draft }: { view: RoomView; draft: SettingsDraft }) {
  const s = draft.settings;
  const players = Math.max(2, view.players.filter((p) => p.connected).length);
  const sameImage = s.mode === "meme-image";
  const options = categoryOptions(view.images.length > 0);

  return (
    <div className="flex flex-col gap-3.5">
      {draft.error ? (
        <p role="alert" className="rounded-xl border-[2.5px] border-ink bg-fluo-pink px-3 py-2 text-[0.9rem] font-bold text-ink">
          {draft.error}
        </p>
      ) : null}

      <SectionCard title="Mode de jeu">
        <ModePicker value={s.mode} onChange={(mode) => draft.set({ mode })} />
      </SectionCard>

      <SectionCard
        title="Rythme"
        hint={
          <>
            Partie d&apos;environ <strong className="font-bold text-ink">{estimateMinutes(s, players)} min</strong> à {players} joueurs (moins si tout le monde valide vite).
          </>
        }
      >
        <div className="divide-y-2 divide-ink/10">
          <Stepper label="Manches" value={s.rounds} min={1} max={8} onChange={(rounds) => draft.set({ rounds })} />
          <Stepper
            label="Temps de création"
            hint="pour fabriquer son mème"
            value={s.createSeconds}
            min={30}
            max={240}
            values={CREATE_STEPS}
            format={formatDuration}
            onChange={(createSeconds) => draft.set({ createSeconds })}
          />
          <Stepper
            label="Temps de vote"
            hint="par mème"
            value={s.voteSeconds}
            min={6}
            max={40}
            values={VOTE_STEPS}
            format={formatDuration}
            onChange={(voteSeconds) => draft.set({ voteSeconds })}
          />
        </div>
      </SectionCard>

      <SectionCard title="Gabarits" hint={sameImage ? "En mode « Même image pour tous », pas de main ni de joker : le gabarit est tiré au sort pour toute la classe." : undefined}>
        <div className="divide-y-2 divide-ink/10">
          <Stepper label="Taille de la main" hint="gabarits proposés à chacun" value={s.handSize} min={3} max={6} disabled={sameImage} onChange={(handSize) => draft.set({ handSize })} />
          <Stepper label="Relances" hint="nouvelle main, par manche" value={s.rerolls} min={0} max={4} disabled={sameImage} onChange={(rerolls) => draft.set({ rerolls })} />
          <Stepper
            label="Jokers"
            hint="piocher dans toute la bibliothèque, par partie"
            value={s.jokers}
            min={0}
            max={5}
            disabled={sameImage}
            onChange={(jokers) => draft.set({ jokers })}
          />
          <CategoryPicker selected={s.categories} options={options} onChange={(categories) => draft.set({ categories })} />
        </div>
      </SectionCard>

      <SectionCard title="Options">
        <div className="divide-y-2 divide-ink/10">
          <Switch label="Stickers" hint="coller des emojis sur son mème" checked={s.stickers} onChange={(stickers) => draft.set({ stickers })} />
          <Segmented
            label={"Qui peut ajouter des images\u00a0?"}
            hint="pour le pack perso de la salle"
            value={s.uploads}
            options={UPLOAD_OPTIONS}
            onChange={(uploads) => draft.set({ uploads })}
          />
        </div>
      </SectionCard>
    </div>
  );
}

// ---------------------------------------------------------------- invités

/** Valeur qui « flashe » au surligneur quand l'hôte la change. */
function Live({ children, k }: { children: ReactNode; k: string | number | boolean }) {
  // `initial={false}` : pas de flash à l'ouverture de l'onglet, seulement aux changements
  return (
    <AnimatePresence initial={false}>
      <motion.strong
        key={String(k)}
        initial={{ backgroundColor: "rgba(255,233,74,1)", scale: 1.08 }}
        animate={{ backgroundColor: "rgba(255,233,74,0)", scale: 1 }}
        transition={{ duration: 1.1, ease: "easeOut" }}
        className="inline-block rounded-md px-0.5 font-bold text-ink"
      >
        {children}
      </motion.strong>
    </AnimatePresence>
  );
}

function Row({ emoji, children }: { emoji: string; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3 py-2.5">
      <span className="mt-0.5 flex-none">
        <Emoji id={emoji} size={26} />
      </span>
      <div className="min-w-0 flex-1 text-[0.95rem] font-medium leading-snug text-ink/80">{children}</div>
    </li>
  );
}

/** Résumé lisible des réglages, pour ceux qui ne sont pas l'hôte (mis à jour en direct). */
export function SettingsSummary({ view }: { view: RoomView }) {
  const s = view.settings;
  const mode = MODES.find((m) => m.id === s.mode) ?? MODES[0];
  const hostName = view.players.find((p) => p.isHost)?.name;
  const options = categoryOptions(view.images.length > 0);
  const on = options.filter((o) => isCategoryOn(s.categories, o.id));
  const allOn = s.categories.length === 0 || on.length === options.length;
  const names = s.profs.length + s.extraNames.length;

  return (
    <section className="card p-3.5" aria-label="Réglages de la partie">
      <h3 className="font-display text-[1.12rem] font-extrabold leading-tight">Les règles du jour</h3>
      <p className="mt-0.5 text-[0.86rem] font-medium text-ink/65">{hostName ? `C'est ${hostName} qui règle la partie.` : "C'est l'hôte qui règle la partie."}</p>
      <ul className="mt-1.5 divide-y-2 divide-ink/10">
        <Row emoji={mode.emoji}>
          Mode <Live k={s.mode}>{mode.title}</Live>
          <span className="block text-[0.86rem] text-ink/65">{mode.text}</span>
        </Row>
        <Row emoji="stopwatch">
          <Live k={s.rounds}>{plural(s.rounds, "manche", "manches")}</Live>, <Live k={s.createSeconds}>{formatDuration(s.createSeconds)}</Live> pour créer,{" "}
          <Live k={s.voteSeconds}>{formatDuration(s.voteSeconds)}</Live> pour noter chaque mème.
        </Row>
        {s.mode === "meme-image" ? (
          <Row emoji="framed-picture">Un seul gabarit par manche, le même pour toute la classe.</Row>
        ) : (
          <Row emoji="flower-playing-cards">
            Main de <Live k={s.handSize}>{s.handSize} gabarits</Live>, <Live k={s.rerolls}>{s.rerolls === 0 ? "aucune relance" : plural(s.rerolls, "relance", "relances")}</Live> par manche,{" "}
            <Live k={s.jokers}>{s.jokers === 0 ? "aucun joker" : plural(s.jokers, "joker", "jokers")}</Live> pour la partie.
          </Row>
        )}
        <Row emoji="open-file-folder">
          Gabarits&nbsp;: <Live k={allOn ? "toutes" : on.map((o) => o.id).join(",")}>{allOn ? "toutes les catégories" : on.map((o) => o.label).join(", ")}</Live>.
        </Row>
        <Row emoji="sparkles">
          Stickers <Live k={s.stickers}>{s.stickers ? "autorisés" : "désactivés"}</Live>.
        </Row>
        <Row emoji="camera">
          Pack perso&nbsp;:{" "}
          <Live k={s.uploads}>{s.uploads === "all" ? "tout le monde peut ajouter des images" : s.uploads === "host" ? "seul l'hôte ajoute des images" : "ajout d'images désactivé"}</Live>.
        </Row>
        <Row emoji="label">
          <Live k={names}>{names === 0 ? "Aucun nom à charrier" : plural(names, "nom à charrier", "noms à charrier")}</Live>
          {names === 0 ? " pour l'instant." : " (onglet Noms)."}
        </Row>
      </ul>
    </section>
  );
}
