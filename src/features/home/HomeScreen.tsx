"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MotionConfig, motion } from "motion/react";
import { Emoji } from "@/components/ui/Emoji";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/ui/Logo";
import { useIsClient } from "@/components/ui/hooks";
import { createRoom, roomExists } from "@/features/game/useRoom";
import type { ApiFailure } from "@/features/game/props";
import { VOTE_OPTIONS } from "@/lib/game/types";
import { sfx } from "@/lib/sfx";
import { CODE_LENGTH, CodeInput } from "./CodeInput";
import { ProfileEditor, tidyName, useProfile } from "./ProfileEditor";

type JoinState = { kind: "idle" } | { kind: "checking" } | { kind: "error"; message: string };

function Actions({ initialCode }: { initialCode: string }) {
  const router = useRouter();
  const { profile, update } = useProfile();
  const [code, setCode] = useState(initialCode);
  const [join, setJoin] = useState<JoinState>({ kind: "idle" });
  const [creating, setCreating] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const joinMsgId = useId();
  const busy = creating || join.kind === "checking";

  useEffect(() => {
    router.prefetch("/r/BCDF");
  }, [router]);

  const goJoin = async (raw: string) => {
    if (busy) return;
    if (raw.length < CODE_LENGTH) {
      sfx.play("error");
      setJoin({ kind: "error", message: "Le code fait 4 lettres. Regarde au tableau\u00a0!" });
      codeRef.current?.focus();
      return;
    }
    setJoin({ kind: "checking" });
    try {
      if (await roomExists(raw)) {
        router.push(`/r/${raw}`);
        return; // on reste en « checking » pendant la navigation
      }
      sfx.play("error");
      setJoin({ kind: "error", message: `Aucune salle « ${raw} ». Vérifie le code (ou la partie est finie).` });
      codeRef.current?.focus();
    } catch {
      sfx.play("error");
      setJoin({ kind: "error", message: "Impossible de joindre le serveur. Vérifie ta connexion et réessaie." });
    }
  };

  const onJoinSubmit = (e: FormEvent) => {
    e.preventDefault();
    void goJoin(code);
  };

  const onCreate = async () => {
    if (busy) return;
    const name = tidyName(profile.name);
    if (!name) {
      sfx.play("error");
      setNameError("Il te faut un pseudo pour créer la partie (le dé t'en trouve un).");
      nameRef.current?.focus();
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const res = await createRoom(name, profile.avatar);
      sfx.play("pop");
      router.push(`/r/${res.code}`);
    } catch (e) {
      sfx.play("error");
      const f = e as Partial<ApiFailure>;
      setCreateError(f.error === "network" || !f.message ? "Impossible de créer la partie. Vérifie ta connexion et réessaie." : f.message);
      setCreating(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-7">
      {/* ------------------------------------------------ rejoindre */}
      <div className="flex min-w-0 flex-col gap-6 lg:order-2">
      <section className="card relative min-w-0 p-4 pb-2.5 lg:rotate-[0.6deg]" aria-labelledby="titre-rejoindre">
        <h2 id="titre-rejoindre" className="font-display text-[1.35rem] font-extrabold leading-tight">
          <span className="hl [--hl:var(--color-fluo-green)]">Rejoindre</span> une partie
        </h2>
        <p className="mt-0.5 text-[0.9rem] font-medium text-ink/65">Tape le code affiché au tableau.</p>
        <form onSubmit={onJoinSubmit} className="mt-3 flex items-stretch gap-2.5">
          <CodeInput
            value={code}
            inputRef={codeRef}
            invalid={join.kind === "error"}
            describedBy={join.kind === "error" ? joinMsgId : undefined}
            onChange={(c) => {
              setCode(c);
              if (join.kind === "error") setJoin({ kind: "idle" });
            }}
            onComplete={(c) => void goJoin(c)}
          />
          <button type="submit" className="btn btn-green min-w-0 flex-1 !px-2" disabled={busy}>
            {join.kind === "checking" ? (
              "…"
            ) : (
              <>
                <span className="max-[350px]:hidden">Go</span>
                <Icon name="arrow-right" size={24} strokeWidth={3} />
              </>
            )}
            <span className="sr-only">Rejoindre la salle</span>
          </button>
        </form>
        <p id={joinMsgId} role="alert" className="mt-2 min-h-[1.15rem] text-[0.9rem] font-bold leading-tight text-red-pen">
          {join.kind === "error" ? join.message : ""}
        </p>
      </section>
      <TvNote className="hidden lg:flex" />
      </div>

      {/* ------------------------------------------------ créer */}
      <section className="card relative min-w-0 p-4 lg:order-1 lg:-rotate-[0.6deg]" aria-labelledby="titre-creer">
        <h2 id="titre-creer" className="font-display text-[1.35rem] font-extrabold leading-tight">
          <span className="hl [--hl:var(--color-fluo-pink)]">Créer</span> une partie
        </h2>
        <p className="mb-3 mt-0.5 text-[0.9rem] font-medium text-ink/65">Choisis ta tête, lance la salle, donne le code à la classe.</p>
        <ProfileEditor
          name={profile.name}
          avatar={profile.avatar}
          nameRef={nameRef}
          error={nameError}
          onSubmit={onCreate}
          onChange={(patch) => {
            if (patch.name !== undefined) setNameError(null);
            update(patch);
          }}
        />
        <button type="button" className="btn mt-4 w-full !min-h-[58px] !text-[1.2rem]" onClick={onCreate} disabled={busy}>
          {creating ? "Création de la salle…" : "Créer une partie"}
          {!creating ? <Emoji id="rocket" size={26} /> : null}
        </button>
        {createError ? (
          <p role="alert" className="mt-2 text-[0.9rem] font-bold text-red-pen">
            {createError}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function ActionsSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:gap-7" aria-hidden>
      <div className="card h-[178px] animate-pulse opacity-60 lg:order-2" />
      <div className="card h-[382px] animate-pulse opacity-60 lg:order-1" />
    </div>
  );
}

const STEPS: { n: number; title: string; text: string; color: string; tilt: string }[] = [
  {
    n: 1,
    title: "Tu pioches",
    text: "Chacun reçoit une main de gabarits\u00a0: faux bulletin, conversation de groupe, affiche… Choisis-en un.",
    color: "var(--color-fluo-yellow)",
    tilt: "-rotate-[1.2deg]",
  },
  {
    n: 2,
    title: "Tu légendes",
    text: "Écris ta meilleure vanne, colle des stickers, charrie (gentiment) tes profs. Le chrono tourne.",
    color: "var(--color-fluo-pink)",
    tilt: "rotate-[0.8deg]",
  },
  {
    n: 3,
    title: "La classe note",
    text: "Chaque mème passe au vote, de « Bof » à « Mort de rire ». Classement, podium, récompenses.",
    color: "var(--color-fluo-green)",
    tilt: "-rotate-[0.6deg]",
  },
];

function StepArt({ n }: { n: number }) {
  if (n === 1) {
    return (
      <div className="relative h-[64px] w-[84px] flex-none" aria-hidden>
        {[
          { e: "school", r: -14, x: 2, bg: "var(--color-fluo-blue)" },
          { e: "mobile-phone", r: 0, x: 24, bg: "var(--color-paper-2)" },
          { e: "newspaper", r: 14, x: 46, bg: "var(--color-fluo-orange)" },
        ].map((c) => (
          <span
            key={c.e}
            className="absolute top-2 grid h-[52px] w-[36px] place-items-center rounded-lg border-[2.5px] border-ink shadow-[2px_2px_0_0_var(--color-ink)]"
            style={{ left: c.x, transform: `rotate(${c.r}deg)`, background: c.bg, transformOrigin: "50% 120%" }}
          >
            <Emoji id={c.e} size={24} />
          </span>
        ))}
      </div>
    );
  }
  if (n === 2) {
    return (
      <div className="relative h-[64px] w-[84px] flex-none" aria-hidden>
        <span className="absolute left-1 top-1.5 flex h-[54px] w-[70px] rotate-[-4deg] flex-col items-center justify-between rounded-lg border-[2.5px] border-ink bg-ink-3 py-1 shadow-[2px_2px_0_0_var(--color-ink)]">
          <span className="font-[family-name:var(--font-meme)] text-[9px] uppercase leading-none tracking-wide text-white">Moi à 8 h</span>
          <Emoji id="sleeping-face" size={26} />
          <span className="h-[5px] w-10 rounded-full bg-white/70" />
        </span>
        <span className="absolute -right-0.5 -top-1 rotate-[18deg] drop-shadow-[2px_2px_0_rgba(0,0,0,0.4)]">
          <Emoji id="pencil" size={34} />
        </span>
      </div>
    );
  }
  return (
    <div className="relative grid h-[64px] w-[84px] flex-none grid-cols-2 place-items-center gap-0.5" aria-hidden>
      {VOTE_OPTIONS.map((o, i) => (
        <span
          key={o.score}
          className="grid h-[30px] w-[38px] place-items-center rounded-lg border-[2.5px] border-ink bg-white shadow-[2px_2px_0_0_var(--color-ink)]"
          style={{ transform: `rotate(${[-5, 4, 3, -4][i]}deg)`, background: i === 3 ? "var(--color-fluo-yellow)" : undefined }}
        >
          <Emoji id={o.emoji} size={21} />
        </span>
      ))}
    </div>
  );
}

function HowItWorks() {
  return (
    <section aria-labelledby="titre-comment" className="mt-10">
      <h2 id="titre-comment" className="mb-4 text-center font-display text-[1.6rem] font-extrabold text-paper">
        Comment{" "}
        <span className="inline-block -rotate-2 rounded-lg border-[3px] border-ink bg-fluo-yellow px-2 text-ink shadow-[3px_3px_0_0_rgba(0,0,0,0.55)]">ça marche</span>
      </h2>
      <ol className="grid gap-3.5 lg:grid-cols-3 lg:gap-5">
        {STEPS.map((s, i) => (
          <motion.li
            key={s.n}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ delay: i * 0.08, type: "spring", stiffness: 260, damping: 22 }}
            className={`card relative flex items-center gap-3 p-3 pl-4 lg:flex-col lg:items-start lg:p-4 ${s.tilt}`}
          >
            <span
              className="absolute -left-2.5 -top-2.5 grid h-9 w-9 place-items-center rounded-full border-[3px] border-ink font-display text-[1.15rem] font-extrabold shadow-[2px_2px_0_0_var(--color-ink)]"
              style={{ background: s.color }}
              aria-hidden
            >
              {s.n}
            </span>
            <StepArt n={s.n} />
            <div className="min-w-0">
              <h3 className="font-display text-[1.15rem] font-extrabold leading-tight">
                <span className="sr-only">Étape {s.n}&nbsp;: </span>
                {s.title}
              </h3>
              <p className="mt-0.5 text-[0.9rem] font-medium leading-snug text-ink/75">{s.text}</p>
            </div>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}

function TvNote({ className = "" }: { className?: string }) {
  return (
    <aside className={`flex items-center gap-3 rounded-2xl border-2 border-dashed border-paper/30 px-4 py-3 text-paper/85 ${className}`}>
      <Emoji id="television" size={34} />
      <p className="text-[0.92rem] font-medium leading-snug">
        <strong className="font-bold text-paper">Un vidéoprojecteur dans la salle&nbsp;?</strong> Une fois la partie créée, ouvre l&apos;
        <strong className="font-bold text-fluo-yellow">écran de classe</strong> sur l&apos;ordi du prof&nbsp;: tout le monde suit les mèmes et le classement en grand.
      </p>
    </aside>
  );
}

export function HomeScreen({ initialCode = "" }: { initialCode?: string }) {
  const isClient = useIsClient();
  return (
    <MotionConfig reducedMotion="user">
      <main
        className="mx-auto w-full max-w-[460px] flex-1 overflow-x-clip px-4 lg:max-w-[980px] lg:px-8"
        style={{
          paddingTop: "max(1.1rem, env(safe-area-inset-top))",
          paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
        }}
      >
        <header className="mb-5 text-center lg:mb-8 lg:mt-4">
          <Logo />
          <p className="mx-auto mt-3 max-w-[30ch] font-display text-[1.15rem] font-bold leading-tight text-paper lg:max-w-none lg:text-[1.45rem]">
            Le jeu de mèmes de la classe.{" "}
            <span className="font-[family-name:var(--font-hand)] text-[1.45rem] font-bold text-fluo-green lg:text-[1.8rem]">
              Chacun fabrique le sien, tout le monde note.
            </span>
          </p>
        </header>

        {isClient ? <Actions initialCode={initialCode} /> : <ActionsSkeleton />}

        <HowItWorks />

        <TvNote className="mx-auto mt-8 max-w-[560px] lg:hidden" />

        <footer className="mt-8 text-center font-[family-name:var(--font-hand)] text-[1.25rem] text-muted">
          Ici on charrie, on n&apos;humilie pas.
        </footer>
      </main>
    </MotionConfig>
  );
}
