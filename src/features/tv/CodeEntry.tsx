"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { roomExists } from "@/features/game/useRoom";
import { sfx } from "@/lib/sfx";
import { Stage } from "./stage";
import { DISPLAY, Emo, FLUO, HAND, INK, PAPER, hard } from "./ui";

const clean = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);

/** Champ « code de la salle » en px de maquette (dans le cadre de l'écran de classe). */
export function CodeForm({ initialError }: { initialError?: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (code.length < 3) {
      setError("Tape le code affiché sur le téléphone de l'hôte.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (await roomExists(code)) {
        sfx.play("start");
        router.push(`/tv/${code}`);
        return;
      }
      sfx.play("error");
      setError(`Aucune salle « ${code} ». Vérifie le code sur le téléphone de l'hôte.`);
    } catch {
      sfx.play("error");
      setError("Connexion impossible. Vérifie le réseau et réessaie.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
      <label htmlFor="tv-code" style={{ ...DISPLAY, fontSize: 40, color: INK }}>
        Code de la salle
      </label>
      <div style={{ display: "flex", gap: 24, alignItems: "stretch" }}>
        <input
          id="tv-code"
          value={code}
          onChange={(e) => {
            setCode(clean(e.target.value));
            setError(null);
          }}
          autoFocus
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          inputMode="text"
          placeholder="ABCD"
          aria-describedby={error ? "tv-code-error" : undefined}
          aria-invalid={error ? true : undefined}
          className="focus-visible:shadow-[0_0_0_8px_var(--color-fluo-blue)] placeholder:text-[#c9c6dc]"
          style={{
            ...DISPLAY,
            width: 520,
            height: 150,
            textAlign: "center",
            fontSize: 110,
            letterSpacing: "0.12em",
            color: INK,
            background: "#fff",
            border: `6px solid ${INK}`,
            borderRadius: 28,
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={busy}
          className="cursor-pointer transition-transform active:translate-x-[5px] active:translate-y-[5px] focus-visible:outline-[6px] focus-visible:outline-offset-4 focus-visible:outline-[var(--color-fluo-blue)] disabled:opacity-60"
          style={{
            ...DISPLAY,
            padding: "0 56px",
            fontSize: 52,
            color: INK,
            background: FLUO.yellow,
            border: `6px solid ${INK}`,
            borderRadius: 28,
            boxShadow: hard(8),
          }}
        >
          {busy ? "On cherche…" : "Afficher"}
        </button>
      </div>
      <div id="tv-code-error" role="alert" style={{ minHeight: 44, fontSize: 32, fontWeight: 700, color: "#c1121f", textAlign: "center" }}>
        {error}
      </div>
    </form>
  );
}

/** Page `/tv` : on saisit le code de la salle à projeter. */
export function CodeEntryScreen() {
  return (
    <Stage>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
        <div
          style={{
            width: 1180,
            padding: "56px 64px 40px",
            background: PAPER,
            border: `6px solid ${INK}`,
            borderRadius: 40,
            boxShadow: hard(14),
            transform: "rotate(-0.6deg)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <Emo id="television" size={120} />
            <h1 style={{ ...DISPLAY, fontSize: 92, lineHeight: 1, color: INK, margin: 0 }}>
              Écran de{" "}
              <span style={{ background: `linear-gradient(transparent 52%, ${FLUO.yellow} 52%)`, padding: "0 0.12em" }}>classe</span>
            </h1>
          </div>
          <p style={{ ...HAND, fontSize: 48, lineHeight: 1.1, color: "#4a4870", margin: "0 0 20px", textAlign: "center" }}>
            À ouvrir sur l&apos;ordinateur relié au vidéoprojecteur. Les téléphones font le reste.
          </p>
          <CodeForm />
        </div>
      </div>
    </Stage>
  );
}
