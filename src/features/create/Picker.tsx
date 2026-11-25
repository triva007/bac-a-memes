"use client";

/** Étape 1 — choisir son gabarit dans sa main (relances, joker, cartes d'inspiration). */

import { Emoji } from "@/components/ui/Emoji";
import type { RoomView } from "@/lib/game/types";
import { sfx } from "@/lib/sfx";
import { SituationCard, TemplateCard, templateName } from "./cards";
import { templateExists } from "./draft";
import { Icon, Marker, ThemeBanner } from "./ui";

export interface PickerProps {
  view: RoomView;
  handIndex: number;
  /** main la plus lointaine déjà découverte */
  revealed: number;
  onHand: (index: number) => void;
  selectedId: string | null;
  onPick: (templateId: string) => void;
  /** retour à l'éditeur sans changer de gabarit (présent si un gabarit est déjà choisi) */
  onBack?: () => void;
  canJoker: boolean;
  onOpenLibrary: () => void;
  locked: boolean;
}

export function Picker({ view, handIndex, revealed, onHand, selectedId, onPick, onBack, canJoker, onOpenLibrary, locked }: PickerProps) {
  const create = view.create;
  const hands = create?.hands ?? [];
  const lastHand = hands.length - 1;
  const hand = (hands[handIndex] ?? []).filter((id) => templateExists(id, view.images));
  const removed = (hands[handIndex]?.length ?? 0) - hand.length;
  const rerollsLeft = Math.max(0, lastHand - revealed);
  const canGoNext = handIndex < lastHand;
  const isReroll = handIndex >= revealed;
  const jokersLeft = view.me?.jokersLeft ?? 0;
  const situations = create?.situations ?? [];

  const next = () => {
    if (!canGoNext) return;
    sfx.play("pop");
    onHand(handIndex + 1);
  };
  const prev = () => {
    if (handIndex <= 0) return;
    sfx.play("tap");
    onHand(handIndex - 1);
  };

  const showFooter = hands.length > 1 || canJoker;

  return (
    <div className="mx-auto flex h-full w-full max-w-[720px] flex-col" data-testid="picker">
      <header className="flex flex-none items-center gap-2 px-4 pb-2 pt-3">
        {onBack ? (
          <button type="button" onClick={onBack} className="btn btn-sm btn-paper flex-none !min-h-[44px] !px-3" aria-label="Revenir à mon mème sans changer de gabarit">
            <Icon name="left" size={18} />
            Mon mème
          </button>
        ) : null}
        <h2 className="min-w-0 flex-1 font-display text-[1.45rem] font-extrabold leading-none text-paper">
          {onBack ? "Change de " : "Choisis ton "}
          <Marker>gabarit</Marker>
        </h2>
        {hands.length > 1 ? (
          <div className="flex flex-none items-center gap-1.5" aria-label={`Main ${handIndex + 1} sur ${hands.length}`} role="img">
            {hands.map((_, i) => (
              <span
                key={i}
                className={`block rounded-full border-2 transition-all ${
                  i === handIndex ? "h-3.5 w-6 border-ink bg-fluo-yellow" : i <= revealed ? "h-3 w-3 border-paper/70 bg-paper/70" : "h-3 w-3 border-paper/35 bg-transparent"
                }`}
              />
            ))}
          </div>
        ) : null}
      </header>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5 pt-1">
        {create?.theme ? <ThemeBanner theme={create.theme} style={{ marginBottom: 12, rotate: "-0.6deg" }} /> : null}

        {hand.length > 0 ? (
          <div key={handIndex} className="grid grid-cols-2 gap-x-3 gap-y-3.5 sm:grid-cols-3" data-testid="hand">
            {hand.map((id, i) => (
              <TemplateCard
                key={id}
                templateId={id}
                name={templateName(id, view.images)}
                index={i}
                eager
                deal
                selected={id === selectedId}
                disabled={locked}
                onPick={onPick}
              />
            ))}
          </div>
        ) : (
          <div className="card mx-auto mt-6 max-w-sm p-5 text-center">
            <Emoji id="framed-picture" size={56} className="mx-auto" />
            <p className="mt-2 font-display text-lg font-extrabold leading-tight">Cette main est vide</p>
            <p className="mt-1 text-sm font-medium text-ink/70">Ses images ont été retirées du pack. {canGoNext ? "Relance pour en voir d'autres." : handIndex > 0 ? "Reviens à la main d'avant." : "Sors ton joker !"}</p>
          </div>
        )}
        {removed > 0 && hand.length > 0 ? <p className="mt-3 text-center text-[0.8rem] font-medium text-muted">{removed > 1 ? `${removed} images ont été retirées` : "Une image a été retirée"} du pack entre-temps.</p> : null}

        {situations.length > 0 ? (
          <section className="mt-6" aria-label="Idées de situations">
            <h3 className="flex items-center gap-1.5 font-display text-[1.05rem] font-extrabold leading-none text-paper">
              <Emoji id="light-bulb" size={22} />
              Besoin d&apos;inspi ?
            </h3>
            <p className="mt-1 text-[0.8rem] font-medium text-muted">Tes cartes situation — tu les retrouves dans l&apos;éditeur.</p>
            <div className="no-scrollbar -mx-4 mt-1 flex snap-x gap-3.5 overflow-x-auto px-4 pb-3 pt-3">
              {situations.map((s, i) => (
                <SituationCard key={s} text={s} index={i} />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {showFooter ? (
        <footer className="flex flex-none items-stretch gap-2.5 border-t-2 border-paper/10 bg-ink/85 px-4 pt-2.5 backdrop-blur-sm" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
          {hands.length > 1 && handIndex > 0 ? (
            <button type="button" onClick={prev} className="btn btn-paper flex-none !px-3" aria-label="Revenir à la main précédente">
              <Icon name="left" size={22} />
            </button>
          ) : null}
          {hands.length > 1 ? (
            <button type="button" onClick={next} disabled={!canGoNext || locked} className="btn btn-blue min-w-0 flex-1 !px-3" data-testid="reroll">
              {!canGoNext ? (
                "Plus de relance"
              ) : isReroll ? (
                <>
                  <Icon name="refresh" size={20} />
                  Relancer
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-ink px-1.5 text-[0.8rem] text-fluo-blue" aria-label={`${rerollsLeft} relance${rerollsLeft > 1 ? "s" : ""} restante${rerollsLeft > 1 ? "s" : ""}`}>
                    {rerollsLeft}
                  </span>
                </>
              ) : (
                <>
                  Main suivante
                  <Icon name="right" size={20} />
                </>
              )}
            </button>
          ) : null}
          {canJoker ? (
            <button type="button" onClick={onOpenLibrary} disabled={locked} className="btn btn-pink min-w-0 flex-1 !px-3" data-testid="joker">
              <Emoji id="joker" size={26} />
              Joker
              {jokersLeft > 0 ? (
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-ink px-1.5 text-[0.8rem] text-fluo-pink" aria-label={`${jokersLeft} joker${jokersLeft > 1 ? "s" : ""} restant${jokersLeft > 1 ? "s" : ""}`}>
                  {jokersLeft}
                </span>
              ) : null}
            </button>
          ) : null}
        </footer>
      ) : null}
    </div>
  );
}
