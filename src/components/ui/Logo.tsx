import { Emoji } from "./Emoji";

/**
 * Logotype « Bac à Mèmes » : étiquette « Bac à » collée de travers sur un
 * gros « MÈMES » surligné au fluo.
 *  - `hero` : grande version de l'accueil, avec autocollants qui flottent ;
 *  - `compact` : version d'en-tête (écran rejoindre, pages d'erreur).
 */
export function Logo({ variant = "hero", as: Tag = "h1" }: { variant?: "hero" | "compact"; as?: "h1" | "div" }) {
  if (variant === "compact") {
    return (
      <Tag className="inline-flex select-none items-center gap-1.5 font-display font-extrabold leading-none" aria-label="Bac à Mèmes">
        <span aria-hidden className="-rotate-6 rounded-md border-2 border-ink bg-paper px-1.5 py-1 text-[0.8rem] uppercase text-ink shadow-[2px_2px_0_0_rgba(0,0,0,0.55)]">
          Bac à
        </span>
        <span aria-hidden className="rotate-1 rounded-lg border-2 border-ink bg-fluo-yellow px-2 py-1 text-[1.15rem] uppercase tracking-tight text-ink shadow-[2px_2px_0_0_rgba(0,0,0,0.55)]">
          Mèmes
        </span>
      </Tag>
    );
  }

  return (
    <div className="relative mx-auto w-fit select-none px-9 pb-3 pt-7">
      <Tag aria-label="Bac à Mèmes" className="relative font-display font-extrabold leading-none">
        <span
          aria-hidden
          className="absolute -top-5 left-0 z-10 -rotate-[7deg] rounded-[10px] border-[3px] border-ink bg-paper px-3 py-1.5 text-[clamp(1.15rem,5.4vw,1.9rem)] uppercase tracking-tight text-ink shadow-[4px_4px_0_0_rgba(0,0,0,0.55)]"
        >
          Bac à
        </span>
        <span
          aria-hidden
          className="relative block -rotate-[2deg] rounded-[18px] border-[4px] border-ink bg-fluo-yellow px-[0.16em] pb-[0.02em] pt-[0.1em] text-[clamp(3.5rem,18.5vw,7.25rem)] uppercase tracking-[-0.045em] text-ink shadow-[7px_7px_0_0_var(--color-fluo-pink)]"
        >
          Mèmes
        </span>
      </Tag>

      {/* autocollants */}
      <span aria-hidden className="absolute -right-1 -top-1 animate-float [--tilt:14deg] drop-shadow-[3px_4px_0_rgba(0,0,0,0.45)]">
        <Emoji id="face-with-tears-of-joy" size={58} />
      </span>
      <span aria-hidden className="absolute -left-2 bottom-0 animate-float [--tilt:-16deg] drop-shadow-[3px_4px_0_rgba(0,0,0,0.45)] [animation-delay:-1.3s]">
        <Emoji id="skull" size={50} />
      </span>
      <span aria-hidden className="absolute -bottom-3 right-3 animate-float [--tilt:10deg] drop-shadow-[3px_4px_0_rgba(0,0,0,0.45)] [animation-delay:-2.6s]">
        <Emoji id="fire" size={42} />
      </span>
    </div>
  );
}
