import Link from "next/link";
import type { ReactNode } from "react";
import { Emoji } from "@/components/ui/Emoji";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/ui/Logo";

/** Gabarit commun des écrans « plein cadre » hors partie : logo, carte centrale, retour à l'accueil. */
export function MessageScreen({
  emoji,
  title,
  children,
  action,
  tilt = "-rotate-1",
}: {
  emoji: string;
  title: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  tilt?: string;
}) {
  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-[460px] flex-col items-center px-5"
      style={{
        paddingTop: "max(1.25rem, env(safe-area-inset-top))",
        paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
      }}
    >
      <Link href="/" aria-label="Bac à Mèmes, retour à l'accueil" className="rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-fluo-blue">
        <Logo variant="compact" as="div" />
      </Link>
      <div className="flex w-full flex-1 flex-col items-center justify-center py-8">
        <div className={`card relative w-full px-5 pb-5 pt-12 text-center ${tilt}`}>
          <span className="absolute -top-9 left-1/2 -translate-x-1/2 drop-shadow-[3px_4px_0_rgba(0,0,0,0.45)]" aria-hidden>
            <Emoji id={emoji} size={72} />
          </span>
          <h1 className="font-display text-[1.7rem] font-extrabold leading-[1.1]">{title}</h1>
          <div className="mt-2 text-[1rem] font-medium leading-snug text-ink/75">{children}</div>
          <div className="mt-5 flex flex-col gap-2.5">
            {action ?? (
              <Link href="/" className="btn w-full">
                <Icon name="home" size={20} />
                Retour à l&apos;accueil
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export function NotFoundScreen({ code }: { code?: string }) {
  return (
    <MessageScreen emoji="ghost" title="Salle introuvable">
      {code ? (
        <>
          La salle <strong className="font-display font-extrabold tracking-wide">«&nbsp;{code}&nbsp;»</strong> n&apos;existe pas, ou plus&nbsp;: une salle s&apos;efface
          toute seule quand plus personne n&apos;y joue.
        </>
      ) : (
        <>Cette salle n&apos;existe pas, ou plus.</>
      )}{" "}
      Vérifie le code au tableau.
    </MessageScreen>
  );
}

export function KickedScreen({ code }: { code: string }) {
  return (
    <MessageScreen emoji="door" title="Tu as été sorti de la salle" tilt="rotate-1">
      L&apos;hôte t&apos;a retiré de la salle <strong className="font-display font-extrabold tracking-wide">{code}</strong>. Ça arrive même aux meilleurs.
    </MessageScreen>
  );
}

export function LeavingScreen() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <div className="mx-auto w-fit animate-wiggle">
          <Emoji id="waving-hand" size={72} />
        </div>
        <p className="mt-3 font-display text-[1.6rem] font-extrabold text-paper">À la prochaine&nbsp;!</p>
      </div>
    </main>
  );
}

/** Squelette sobre pendant la première réponse du serveur. */
export function LoadingScreen({ code }: { code: string }) {
  return (
    <div className="flex h-dvh flex-col" role="status" aria-live="polite">
      <div className="flex-none border-b-[3px] border-black/40 bg-ink-2" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex h-[52px] w-full max-w-[1100px] items-center gap-2 px-2.5">
          <div className="-rotate-2 rounded-[9px] border-[2.5px] border-ink bg-fluo-yellow/70 px-2 py-1 font-display text-[1.15rem] font-extrabold leading-none tracking-[0.06em] text-ink">
            {code}
          </div>
          <div className="h-3 w-24 animate-pulse rounded-full bg-paper/15" />
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col gap-4 p-4">
        <div className="h-36 animate-pulse rounded-[18px] bg-paper/10" />
        <div className="h-11 animate-pulse rounded-2xl bg-paper/10" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-full bg-paper/10" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
        <p className="mt-auto pb-6 text-center font-[family-name:var(--font-hand)] text-[1.4rem] text-muted">On frappe à la porte de la salle…</p>
      </div>
    </div>
  );
}
