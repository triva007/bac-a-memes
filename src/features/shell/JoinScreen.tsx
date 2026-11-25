"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Avatar } from "@/components/ui/Avatar";
import { Emoji } from "@/components/ui/Emoji";
import { Logo } from "@/components/ui/Logo";
import type { ApiFailure } from "@/features/game/props";
import { ProfileEditor, tidyName, useProfile } from "@/features/home/ProfileEditor";
import { LIMITS, type RoomView } from "@/lib/game/types";
import { sfx } from "@/lib/sfx";

const MAX_FACES = 7;

function joinErrorMessage(f: Partial<ApiFailure>): string {
  switch (f.error) {
    case "room_full":
      return `La salle est pleine (${LIMITS.maxPlayers} joueurs max). Demande à l'hôte de faire un peu de place.`;
    case "kicked":
      return "L'hôte t'a retiré de cette salle : tu ne peux plus y entrer.";
    case "room_not_found":
      return "Cette salle vient de fermer. Demande un nouveau code.";
    case "network":
      return "Connexion perdue. Vérifie ton réseau et réessaie.";
    default:
      return f.message || "Impossible de rejoindre. Réessaie.";
  }
}

function WhoIsHere({ view }: { view: RoomView }) {
  const here = view.players.filter((p) => p.connected);
  const host = view.players.find((p) => p.isHost);
  const faces = here.slice(0, MAX_FACES);
  const more = here.length - faces.length;
  return (
    <div className="flex items-center gap-3">
      {here.length > 0 ? (
        <div className="flex flex-none items-center pl-2">
          {faces.map((p) => (
            <Avatar key={p.id} avatar={p.avatar} color={p.color} size={34} className="-ml-2" />
          ))}
          {more > 0 ? (
            <span className="-ml-2 grid h-[34px] min-w-[34px] place-items-center rounded-full border-2 border-ink bg-ink px-1.5 text-[0.78rem] font-bold text-paper">
              +{more}
            </span>
          ) : null}
        </div>
      ) : null}
      <p className="min-w-0 text-[0.9rem] font-semibold leading-snug text-ink/75">
        {here.length === 0
          ? "Personne pour l'instant : à toi d'ouvrir le bal."
          : here.length === 1
            ? `${here[0].name} t'attend.`
            : `${here.length} joueurs sont déjà là${host ? `, ${host.name} tient la salle` : ""}.`}
      </p>
    </div>
  );
}

/** Écran « rejoindre » : la salle existe mais ce navigateur n'y a pas (encore) de joueur. */
export function JoinScreen({ view, join }: { view: RoomView; join: (name: string, avatar: string) => Promise<void> }) {
  const { profile, update } = useProfile();
  const [busy, setBusy] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const inGame = view.phase !== "lobby";

  const submit = async () => {
    if (busy) return;
    const name = tidyName(profile.name);
    if (!name) {
      sfx.play("error");
      setNameError("Choisis un pseudo pour entrer (le dé t'en trouve un).");
      nameRef.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      sfx.unlock();
      await join(name, profile.avatar);
      sfx.play("join");
      // pas de setBusy(false) : l'écran est remplacé par la salle
    } catch (e) {
      sfx.play("error");
      setError(joinErrorMessage(e as Partial<ApiFailure>));
      setBusy(false);
    }
  };

  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-[460px] flex-col px-4"
      style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
    >
      <div className="flex justify-center">
        <Link href="/" aria-label="Bac à Mèmes, retour à l'accueil" className="rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-fluo-blue">
          <Logo variant="compact" as="div" />
        </Link>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className="card mt-5 p-4"
        aria-labelledby="titre-salle"
      >
        <div className="flex items-end justify-between gap-3">
          <h1 id="titre-salle" className="font-display text-[1.25rem] font-extrabold leading-tight">
            Tu rejoins la salle
          </h1>
          <span className="-mb-1 -rotate-2 rounded-xl border-[3px] border-ink bg-fluo-yellow px-2.5 py-1 font-display text-[1.9rem] font-extrabold leading-none tracking-[0.08em] shadow-[3px_3px_0_0_var(--color-ink)]">
            {view.code}
          </span>
        </div>
        <div className="mt-3 border-t-2 border-dashed border-ink/20 pt-3">
          <WhoIsHere view={view} />
        </div>
        {inGame ? (
          <p className="mt-3 flex items-start gap-2 rounded-xl border-[2.5px] border-ink bg-fluo-orange/35 px-3 py-2 text-[0.9rem] font-bold leading-snug">
            <Emoji id="hourglass-not-done" size={22} />
            <span>
              {view.phase === "final"
                ? "La partie se termine : entre maintenant, tu seras là pour la prochaine."
                : "La partie est déjà lancée : entre maintenant, tu joueras à partir de la manche suivante."}
            </span>
          </p>
        ) : null}
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 26, delay: 0.06 }}
        className="card mt-4 p-4"
        aria-label="Ton profil"
      >
        <ProfileEditor
          name={profile.name}
          avatar={profile.avatar}
          nameRef={nameRef}
          error={nameError}
          onSubmit={submit}
          onChange={(patch) => {
            if (patch.name !== undefined) setNameError(null);
            update(patch);
          }}
        />
      </motion.section>

      <div className="min-h-4 flex-1" />

      <div
        className="sticky bottom-0 -mx-4 bg-gradient-to-t from-ink from-70% to-transparent px-4 pt-5"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        {error ? (
          <p role="alert" className="mb-2.5 rounded-xl border-[2.5px] border-ink bg-fluo-pink px-3 py-2 text-[0.92rem] font-bold leading-snug text-ink">
            {error}
          </p>
        ) : null}
        <button type="button" className="btn btn-green w-full !min-h-[58px] !text-[1.2rem]" onClick={submit} disabled={busy}>
          {busy ? "On t'ouvre la porte…" : "Rejoindre la salle"}
        </button>
      </div>
    </main>
  );
}
