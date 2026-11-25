"use client";

/**
 * Étape 2 — l'éditeur. Aperçu en direct collé en haut (toujours visible, même
 * clavier ouvert), un champ par zone du gabarit, noms et idées en un tap,
 * stickers, validation.
 */

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type FocusEvent, type MouseEvent } from "react";
import { flushSync } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { MemeView } from "@/components/meme/MemeView";
import { Emoji } from "@/components/ui/Emoji";
import { MAX_STICKERS, type Meme, type RoomView, type Sticker } from "@/lib/game/types";
import { sfx } from "@/lib/sfx";
import { getMemeFields, isCaptionTemplate } from "@/lib/templates";
import type { TemplateField } from "@/lib/templates/types";
import { isPersoTemplateId } from "@/components/meme/perso";
import { SituationCard } from "./cards";
import { useViewportBox, type TimePressure } from "./hooks";
import { StickerPanel } from "./StickerPanel";
import { Icon, Spinner, ThemeBanner, keepFocus } from "./ui";

const FOOTER_H = 72;
const QUICK_H = 52;
/** en dessous de cette hauteur visible (clavier ouvert), on passe en mise en page serrée */
const COMPACT_BELOW = 430;
/**
 * Tablette / ordinateur en paysage : aperçu à gauche, champs à droite. Le clavier
 * virtuel (qui mange la moitié de l'écran en paysage) ne cache alors ni le mème
 * ni le champ en cours.
 */
const WIDE_MIN_W = 900;
/** en deux colonnes, la mise en page serrée n'est utile que sous cette hauteur visible */
const WIDE_COMPACT_BELOW = 280;

const STICKER_SPOTS: { x: number; y: number; r: number }[] = [
  { x: 0.5, y: 0.5, r: -6 },
  { x: 0.64, y: 0.4, r: 8 },
  { x: 0.36, y: 0.6, r: -10 },
  { x: 0.62, y: 0.64, r: 5 },
  { x: 0.38, y: 0.36, r: 10 },
  { x: 0.5, y: 0.3, r: -3 },
];

export interface EditorProps {
  view: RoomView;
  templateId: string;
  /** faux si le gabarit a disparu (image perso supprimée, gabarit inconnu) */
  templateOk: boolean;
  usedJoker: boolean;
  values: Record<string, string>;
  stickers: Sticker[];
  onValue: (fieldId: string, value: string) => void;
  onStickers: (stickers: Sticker[]) => void;
  /** absent en mode « même image » */
  onChangeTemplate?: () => void;
  onSubmit: () => void;
  busy: boolean;
  clock: TimePressure;
  /** donne le focus au premier champ à l'ouverture (on arrive du sélecteur) */
  autoFocus: boolean;
  notify: (text: string, tone?: "warn" | "info") => void;
}

interface NameChip {
  name: string;
  kind: "prof" | "player" | "extra";
}

// ------------------------------------------------------------------ un champ

interface FieldInputProps {
  field: TemplateField;
  value: string;
  active: boolean;
  missing: boolean;
  locked: boolean;
  last: boolean;
  register: (id: string, el: HTMLTextAreaElement | null) => void;
  registerBlock: (id: string, el: HTMLDivElement | null) => void;
  onChange: (id: string, value: string) => void;
  onFocus: (id: string) => void;
  onNext: (id: string) => void;
}

const FieldInput = memo(function FieldInput({ field, value, active, missing, locked, last, register, registerBlock, onChange, onFocus, onNext }: FieldInputProps) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const len = value.length;
  const near = len >= Math.floor(field.maxLength * 0.9);
  const inputId = `meme-field-${field.id}`;

  // hauteur automatique : le champ grandit avec le texte
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + (el.offsetHeight - el.clientHeight)}px`;
  }, [value]);

  const change = (raw: string) => {
    let v = raw;
    let wantsNext = false;
    if (!field.multiline && /[\r\n]/.test(v)) {
      // clavier qui insère un retour malgré tout : on le prend pour « suivant »
      wantsNext = /[\r\n]$/.test(v);
      v = v.replace(/\s*[\r\n]+\s*/g, " ").replace(/^ | $/g, "");
    }
    if (v.length > field.maxLength) v = v.slice(0, field.maxLength);
    onChange(field.id, v);
    if (wantsNext) onNext(field.id);
  };

  return (
    <div ref={(el) => registerBlock(field.id, el)} className="pt-2.5" data-field-block={field.id}>
      <div className="mb-1 flex items-baseline justify-between gap-2 px-0.5">
        <label htmlFor={inputId} className={`min-w-0 truncate font-display text-[0.9rem] font-extrabold leading-tight ${missing ? "text-fluo-orange" : active ? "text-fluo-green" : "text-paper"}`}>
          {field.label}
          {field.optional ? <span className="ml-1.5 text-[0.72rem] font-semibold text-muted">facultatif</span> : null}
          {missing ? <span className="ml-1.5 text-[0.72rem] font-bold">à remplir</span> : null}
        </label>
        <span className={`flex-none font-display text-[0.74rem] font-bold tabular-nums ${len >= field.maxLength ? "text-fluo-pink" : near ? "text-fluo-orange" : "text-muted"}`} aria-hidden>
          {len}/{field.maxLength}
        </span>
      </div>
      <textarea
        ref={(el) => {
          ref.current = el;
          register(field.id, el);
        }}
        id={inputId}
        data-field-input={field.id}
        rows={1}
        value={value}
        maxLength={field.maxLength}
        placeholder={field.placeholder}
        readOnly={locked}
        enterKeyHint={field.multiline ? "enter" : last ? "done" : "next"}
        autoComplete="off"
        autoCapitalize="sentences"
        spellCheck={false}
        onChange={(e) => change(e.target.value)}
        onFocus={() => onFocus(field.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing && !field.multiline) {
            e.preventDefault();
            onNext(field.id);
          }
        }}
        className={`field block resize-none overflow-hidden leading-snug transition-shadow ${active ? "!shadow-[0_0_0_4px_var(--color-fluo-green)]" : missing ? "!shadow-[0_0_0_4px_var(--color-fluo-orange)]" : ""}`}
      />
    </div>
  );
});

// ------------------------------------------------------------------ l'éditeur

export function Editor({ view, templateId, templateOk, usedJoker, values, stickers, onValue, onStickers, onChangeTemplate, onSubmit, busy, clock, autoFocus, notify }: EditorProps) {
  const create = view.create;
  const settings = view.settings;
  const fields = useMemo(() => (templateOk ? getMemeFields(templateId) : []), [templateId, templateOk]);
  const locked = clock.up;

  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputs = useRef(new Map<string, HTMLTextAreaElement>());
  const blocks = useRef(new Map<string, HTMLDivElement>());
  const lastSel = useRef<{ id: string; start: number; end: number } | null>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeId, setActiveId] = useState<string | null>(() => fields.find((f) => !(values[f.id] ?? "").trim())?.id ?? fields[0]?.id ?? null);
  const [fieldFocused, setFieldFocused] = useState(false);
  const [panel, setPanel] = useState<"stickers" | null>(null);
  const [showMissing, setShowMissing] = useState(false);

  const box = useViewportBox(rootRef);
  const wide = box ? box.w >= WIDE_MIN_W && box.w > box.full : false;
  const compact = box ? box.h < (wide ? WIDE_COMPACT_BELOW : COMPACT_BELOW) : false;
  const theme = create?.theme ?? null;
  const themeH = theme ? (compact ? 34 : 52) : 0;
  const previewH = box ? Math.max(84, Math.min(Math.round(box.full * 0.42), Math.round(box.h * 0.5), box.h - themeH - 156 - (compact ? 0 : FOOTER_H))) : null;

  const meme = useMemo<Meme>(() => ({ templateId, values, stickers }), [templateId, values, stickers]);

  const activeField = fields.find((f) => f.id === activeId) ?? fields[0] ?? null;
  const missing = fields.filter((f) => !f.optional && !(values[f.id] ?? "").trim());
  const hasText = fields.some((f) => (values[f.id] ?? "").trim());
  const ready = templateOk && fields.length > 0 && missing.length === 0 && hasText;

  // ---------------------------------------------------------------- noms en un tap
  const playersKey = view.players.map((p) => p.name).join("\u0001");
  const profsKey = settings.profs.join("\u0001");
  const extraKey = settings.extraNames.join("\u0001");
  const myName = view.players.find((p) => p.id === view.me?.id)?.name ?? "";
  const names = useMemo<NameChip[]>(() => {
    const seen = new Set<string>();
    const out: NameChip[] = [];
    const add = (raw: string, kind: NameChip["kind"]) => {
      const name = raw.trim();
      const key = name.toLocaleLowerCase("fr");
      if (!name || seen.has(key)) return;
      seen.add(key);
      out.push({ name, kind });
    };
    for (const n of profsKey ? profsKey.split("\u0001") : []) add(n, "prof");
    const players = playersKey ? playersKey.split("\u0001") : [];
    for (const n of players) if (n !== myName) add(n, "player");
    if (myName) add(myName, "player");
    for (const n of extraKey ? extraKey.split("\u0001") : []) add(n, "extra");
    return out;
  }, [playersKey, profsKey, extraKey, myName]);

  // ---------------------------------------------------------------- focus
  const register = useCallback((id: string, el: HTMLTextAreaElement | null) => {
    if (el) inputs.current.set(id, el);
    else inputs.current.delete(id);
  }, []);
  const registerBlock = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) blocks.current.set(id, el);
    else blocks.current.delete(id);
  }, []);

  /** Fait défiler la liste (et elle seule) pour que le champ soit entièrement visible. */
  const reveal = useCallback((id: string) => {
    const sc = scrollRef.current;
    const blk = blocks.current.get(id);
    if (!sc || !blk) return;
    const top = blk.offsetTop - 2;
    const bottom = blk.offsetTop + blk.offsetHeight + 10;
    if (bottom - top >= sc.clientHeight || top < sc.scrollTop) sc.scrollTop = top;
    else if (bottom > sc.scrollTop + sc.clientHeight) sc.scrollTop = bottom - sc.clientHeight;
  }, []);

  const focusField = useCallback((id: string, caret?: number) => {
    const el = inputs.current.get(id);
    if (!el) return;
    el.focus({ preventScroll: true });
    const at = caret ?? el.value.length;
    try {
      el.setSelectionRange(at, at);
    } catch {
      /* champ pas encore prêt : sans gravité */
    }
  }, []);

  const onFieldFocus = useCallback(
    (id: string) => {
      setActiveId(id);
      reveal(id);
    },
    [reveal],
  );

  const onNext = useCallback(
    (id: string) => {
      const i = fields.findIndex((f) => f.id === id);
      const next = fields[i + 1];
      if (next) focusField(next.id);
      else inputs.current.get(id)?.blur();
    },
    [fields, focusField],
  );

  // le premier champ a le focus dès l'ouverture (dans le geste qui a choisi le gabarit)
  useLayoutEffect(() => {
    if (!autoFocus || locked) return;
    const first = fields.find((f) => !(values[f.id] ?? "").trim()) ?? fields[0];
    if (first) focusField(first.id);
    // uniquement au montage
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // le champ actif reste visible quand la zone change de taille (clavier) ou que le texte grandit
  const activeValue = activeId ? (values[activeId] ?? "") : "";
  useLayoutEffect(() => {
    if (fieldFocused && activeId) reveal(activeId);
  }, [fieldFocused, activeId, activeValue, box, reveal]);

  // temps écoulé : on range le clavier
  useEffect(() => {
    if (!locked) return;
    const el = document.activeElement;
    if (el instanceof HTMLElement && rootRef.current?.contains(el)) el.blur();
  }, [locked]);

  useEffect(
    () => () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
    },
    [],
  );

  const isFieldEl = (t: EventTarget | null): t is HTMLTextAreaElement => t instanceof HTMLTextAreaElement && t.dataset.fieldInput !== undefined;
  const onFocusCapture = (e: FocusEvent) => {
    if (!isFieldEl(e.target)) return;
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setFieldFocused(true);
  };
  const onBlurCapture = (e: FocusEvent) => {
    if (!isFieldEl(e.target)) return;
    const el = e.target;
    lastSel.current = { id: el.dataset.fieldInput ?? "", start: el.selectionStart ?? el.value.length, end: el.selectionEnd ?? el.value.length };
    if (blurTimer.current) clearTimeout(blurTimer.current);
    // petit délai : un tap sur une étiquette rend le focus aussitôt, inutile de clignoter
    blurTimer.current = setTimeout(() => setFieldFocused(false), 160);
  };

  // ---------------------------------------------------------------- insertion de texte
  const insert = (text: string, kind: "name" | "situation") => {
    if (locked) return;
    const field = activeField;
    if (!field) return;
    const el = inputs.current.get(field.id);
    const cur = values[field.id] ?? "";
    let start = cur.length;
    let end = cur.length;
    if (el && document.activeElement === el) {
      start = el.selectionStart ?? cur.length;
      end = el.selectionEnd ?? cur.length;
    } else if (lastSel.current?.id === field.id) {
      start = Math.min(lastSel.current.start, cur.length);
      end = Math.min(Math.max(lastSel.current.end, start), cur.length);
    }
    const wasFocused = fieldFocused || (el !== undefined && document.activeElement === el);
    let next: string;
    let caret: number;
    if (kind === "situation" && !cur.trim()) {
      // champ vide : la carte remplace tout (coupée proprement si elle est trop longue)
      let t = text;
      if (t.length > field.maxLength) {
        t = t.slice(0, field.maxLength - 1);
        const cut = t.lastIndexOf(" ");
        t = `${(cut > field.maxLength * 0.6 ? t.slice(0, cut) : t).replace(/[\s,;:]+$/, "")}…`;
      }
      next = t;
      caret = t.length;
    } else {
      const before = cur.slice(0, start);
      const after = cur.slice(end);
      let ins = text;
      if (before && !/[\s(«'’\-/]$/.test(before)) ins = ` ${ins}`;
      if (after && !/^[\s.,;:!?)»…'’\-/]/.test(after)) ins = `${ins} `;
      next = before + ins + after;
      caret = (before + ins).length;
    }
    if (next.length > field.maxLength) {
      sfx.play("error");
      notify(kind === "name" ? "Plus de place dans ce champ pour ce nom." : "Cette idée est trop longue pour ce qu'il reste de place.");
      if (wasFocused) focusField(field.id, start);
      return;
    }
    sfx.play("tap");
    lastSel.current = { id: field.id, start: caret, end: caret };
    flushSync(() => onValue(field.id, next));
    // si le clavier était ouvert, on rend la main au champ, curseur juste après le texte inséré
    if (wasFocused && panel === null) focusField(field.id, caret);
  };

  // ---------------------------------------------------------------- stickers
  const addSticker = (emojiId: string) => {
    if (locked) return;
    if (stickers.length >= MAX_STICKERS) {
      sfx.play("error");
      notify(`${MAX_STICKERS} stickers max ! Enlève-en un d'abord.`);
      return;
    }
    sfx.play("pop");
    const spot = STICKER_SPOTS[stickers.length % STICKER_SPOTS.length];
    onStickers([...stickers, { e: emojiId, x: spot.x, y: spot.y, s: 0.24, r: spot.r }]);
  };

  const openStickers = () => {
    sfx.play("tap");
    const el = document.activeElement;
    if (el instanceof HTMLElement) el.blur();
    setPanel("stickers");
  };

  // ---------------------------------------------------------------- validation
  const trySubmit = () => {
    if (busy || locked) return;
    if (!ready) {
      sfx.play("error");
      setShowMissing(true);
      const target = missing[0] ?? fields[0];
      if (!templateOk || !target) notify("Ce gabarit n'est plus disponible : choisis-en un autre.");
      else if (missing.length > 0) notify(missing.length === 1 ? `Il manque juste : ${missing[0].label}.` : `Il manque encore : ${missing.map((f) => f.label).join(", ")}.`);
      else notify("Écris au moins un texte, même tout petit.");
      if (target) {
        setPanel(null);
        focusField(target.id);
      }
      return;
    }
    const el = document.activeElement;
    if (el instanceof HTMLElement) el.blur();
    onSubmit();
  };

  const onPreviewClick = (e: MouseEvent<HTMLDivElement>) => {
    // toucher l'aperçu en dehors d'une zone de texte range le clavier
    const t = e.target as Element | null;
    if (t?.closest?.("[data-field],[data-sticker]")) return;
    const el = document.activeElement;
    if (el instanceof HTMLElement && rootRef.current?.contains(el)) el.blur();
  };

  const onFieldTap = (id: string) => {
    if (locked) return;
    setPanel(null);
    focusField(id);
  };

  const nameWanted = activeField?.kind === "name";
  // cartes d'inspiration masquées à la demande de l'utilisateur
  const situations: string[] = [];
  const submitLabel = busy ? "Envoi…" : "Valider mon mème";
  const perso = isPersoTemplateId(templateId);

  return (
    <div ref={rootRef} className="relative h-full w-full overflow-hidden" data-testid="editor" data-compact={compact ? "1" : "0"} data-wide={wide ? "1" : "0"} onFocusCapture={onFocusCapture} onBlurCapture={onBlurCapture}>
      <div
        className={`absolute inset-x-0 mx-auto flex w-full ${wide ? "max-w-[1240px] flex-row gap-3 px-4" : "max-w-[600px] flex-col md:max-w-[42rem]"}`}
        style={{ top: box?.shift ?? 0, height: box ? box.h : "100%", paddingLeft: wide ? "max(1rem, env(safe-area-inset-left))" : undefined }}
      >
        <div className={wide ? "flex min-h-0 min-w-0 flex-1 flex-col" : "contents"}>
        {theme ? (
          <div className="flex-none px-3 pt-1.5" style={{ height: themeH }}>
            <ThemeBanner theme={theme} compact style={{ height: "100%" }} />
          </div>
        ) : null}

        {/* ------------------------------------------------ aperçu */}
        <div className={`relative px-3 pt-2 ${wide ? "min-h-0 flex-1 pb-4" : "flex-none pb-1"}`} style={wide ? undefined : { height: previewH ?? "42%" }} onClick={onPreviewClick} data-testid="preview">
          <div className="relative h-full w-full" style={{ filter: "drop-shadow(4px 5px 0 rgba(0,0,0,0.5))" }}>
            <MemeView
              meme={meme}
              mode="edit"
              fit="contain"
              activeField={fieldFocused && panel === null ? activeId : null}
              onFieldTap={onFieldTap}
              editableStickers={settings.stickers && !locked}
              onStickersChange={onStickers}
            />
          </div>
          {usedJoker && templateOk ? (
            <span className="pointer-events-none absolute left-2 top-1.5 flex -rotate-3 items-center gap-1 rounded-lg border-2 border-ink bg-fluo-pink px-1.5 py-0.5 font-display text-[0.7rem] font-extrabold uppercase tracking-wide text-ink shadow-hard-light">
              <Emoji id="joker" size={16} />
              Joker
            </span>
          ) : null}
          <AnimatePresence>
            {clock.secs !== null && !clock.up ? (
              <motion.span
                key={clock.secs}
                initial={{ scale: 1.5, rotate: 8 }}
                animate={{ scale: 1, rotate: 4 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 600, damping: 18 }}
                className={`pointer-events-none absolute right-2 top-1.5 flex h-11 min-w-11 items-center justify-center rounded-full border-[3px] border-ink px-1 font-display text-xl font-extrabold shadow-hard-light ${
                  clock.alert ? "bg-red-pen text-paper" : "bg-fluo-yellow text-ink"
                }`}
                aria-hidden
                data-testid="countdown"
              >
                {clock.secs}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </div>
        </div>

        {/* ------------------------------------------------ bas (ou colonne de droite) : champs, noms, actions (+ feuille stickers par-dessus) */}
        <div className={`relative flex min-h-0 flex-col ${wide ? "w-[min(31rem,45%)] flex-none border-l-2 border-paper/10 bg-ink/40" : "flex-1"}`}>
          <div ref={scrollRef} className="no-scrollbar relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3" data-testid="fields">
            {!templateOk ? (
              <div className="card mt-3 p-4 text-center">
                <Emoji id={perso ? "framed-picture" : "puzzle-piece"} size={44} className="mx-auto" />
                <p className="mt-1.5 font-display text-[1.05rem] font-extrabold leading-tight">{perso ? "Cette image vient d'être retirée du pack." : "Ce gabarit est introuvable."}</p>
                <p className="mt-1 text-sm font-medium text-ink/70">{onChangeTemplate ? "Tes textes sont gardés : choisis juste un autre gabarit." : "Rien de grave : tu joueras la prochaine manche."}</p>
                {onChangeTemplate ? (
                  <button type="button" onClick={onChangeTemplate} className="btn btn-blue mt-3 w-full">
                    Choisir un autre gabarit
                  </button>
                ) : null}
              </div>
            ) : null}

            {fields.map((f, i) => (
              <FieldInput
                key={f.id}
                field={f}
                value={values[f.id] ?? ""}
                active={fieldFocused && activeId === f.id}
                missing={showMissing && !f.optional && !(values[f.id] ?? "").trim()}
                locked={locked}
                last={i === fields.length - 1}
                register={register}
                registerBlock={registerBlock}
                onChange={onValue}
                onFocus={onFieldFocus}
                onNext={onNext}
              />
            ))}
            {isCaptionTemplate(templateId) && templateOk ? <p className="mt-1.5 px-0.5 text-[0.78rem] font-medium text-muted">Un seul des deux textes suffit.</p> : null}

            {situations.length > 0 && fields.length > 0 ? (
              <section className="mt-4" aria-label="Idées de situations">
                <h3 className="flex items-center gap-1.5 font-display text-[0.95rem] font-extrabold leading-none text-paper">
                  <Emoji id="light-bulb" size={20} />
                  Besoin d&apos;inspi ?<span className="text-[0.76rem] font-semibold text-muted">Touche une carte.</span>
                </h3>
                <div className="no-scrollbar -mx-4 flex snap-x gap-3.5 overflow-x-auto px-4 pb-3 pt-3.5">
                  {situations.map((s, i) => (
                    <SituationCard key={s} text={s} index={i} onUse={(t) => insert(t, "situation")} />
                  ))}
                </div>
              </section>
            ) : null}

            {compact && templateOk ? (
              <div className="mt-2 flex gap-2.5">
                {onChangeTemplate ? (
                  <button type="button" onClick={onChangeTemplate} disabled={locked || busy} className="btn btn-sm btn-paper !min-h-[44px] flex-1">
                    Changer de gabarit
                  </button>
                ) : null}
                {settings.stickers ? (
                  <button type="button" onClick={openStickers} disabled={locked || busy} className="btn btn-sm btn-paper !min-h-[44px] flex-1">
                    Stickers
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* rangée des noms, juste au-dessus du clavier */}
          {fields.length > 0 ? (
            <div
              className={`flex flex-none items-center gap-2 border-t-2 pl-3 transition-colors ${nameWanted ? "border-fluo-yellow/70 bg-fluo-yellow/15" : "border-paper/10 bg-ink-2/90"}`}
              style={{ height: QUICK_H }}
              data-testid="quickbar"
            >
              <span className={`flex-none font-display text-[0.72rem] font-extrabold uppercase leading-none tracking-wide ${nameWanted ? "rounded-md bg-fluo-yellow px-1.5 py-1 text-ink" : "text-muted"}`}>{nameWanted ? "Un nom ?" : "Noms"}</span>
              <div className="no-scrollbar flex h-full min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pr-3" role="group" aria-label="Insérer un nom dans le champ en cours">
                {names.map((n) => (
                  <button
                    key={n.name}
                    type="button"
                    {...keepFocus}
                    onClick={() => insert(n.name, "name")}
                    disabled={locked}
                    data-name-chip={n.name}
                    className={`flex h-11 flex-none touch-manipulation items-center whitespace-nowrap rounded-full border-[2.5px] border-ink px-3 font-display text-[0.9rem] font-extrabold text-ink outline-none transition-transform focus-visible:ring-4 focus-visible:ring-fluo-blue active:scale-95 ${
                      n.kind === "prof" ? "bg-fluo-yellow" : n.kind === "extra" ? "bg-fluo-blue" : "bg-paper"
                    }`}
                  >
                    {n.name}
                  </button>
                ))}
              </div>
              {compact ? (
                ready ? (
                  <button type="button" {...keepFocus} onClick={trySubmit} disabled={busy || locked} className="btn btn-sm btn-green mr-2 flex-none !min-h-[44px] !px-3" data-testid="submit-compact">
                    {busy ? <Spinner size={18} /> : <Icon name="check" size={18} stroke={3.4} />}
                    Valider
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.activeElement;
                      if (el instanceof HTMLElement) el.blur();
                    }}
                    className="btn btn-sm btn-paper mr-2 flex-none !min-h-[44px] !px-3"
                    aria-label="Ranger le clavier"
                    data-testid="hide-keyboard"
                  >
                    <Icon name="down" size={20} stroke={3} />
                  </button>
                )
              ) : null}
            </div>
          ) : null}

          {!compact ? (
            <div className="flex flex-none items-stretch gap-2 border-t-2 border-paper/10 bg-ink px-3 pt-2" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }} data-testid="editor-footer">
              {onChangeTemplate ? (
                <button type="button" onClick={onChangeTemplate} disabled={locked || busy} className="btn btn-paper w-[64px] flex-none flex-col !gap-0.5 !px-0 !py-1 !text-[0.66rem]" aria-label="Changer de gabarit (tes textes sont gardés)" data-testid="change-template">
                  <Emoji id="counterclockwise-arrows-button" size={24} />
                  Gabarit
                </button>
              ) : null}
              {settings.stickers ? (
                <button type="button" onClick={openStickers} disabled={locked || busy || !templateOk} className="btn btn-paper relative w-[64px] flex-none flex-col !gap-0.5 !px-0 !py-1 !text-[0.66rem]" aria-label="Ajouter des stickers" data-testid="open-stickers">
                  <Emoji id="star-struck" size={24} />
                  Stickers
                  {stickers.length > 0 ? <span className="absolute -right-1.5 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-ink bg-fluo-pink px-1 text-[0.7rem] leading-none">{stickers.length}</span> : null}
                </button>
              ) : null}
              <button
                type="button"
                onClick={trySubmit}
                disabled={busy || locked}
                className={`btn min-w-0 flex-1 whitespace-nowrap !px-2 ${ready ? "btn-green" : "!bg-paper-2 !text-ink/55"}`}
                data-testid="submit"
                data-ready={ready ? "1" : "0"}
              >
                {busy ? <Spinner /> : ready ? <Icon name="check" size={22} stroke={3.4} /> : null}
                {submitLabel}
              </button>
            </div>
          ) : null}

          <AnimatePresence>{panel === "stickers" ? <StickerPanel key="stickers" count={stickers.length} onAdd={addSticker} onClose={() => setPanel(null)} /> : null}</AnimatePresence>
        </div>
      </div>
    </div>
  );
}
