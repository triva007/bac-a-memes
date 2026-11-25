"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import type { CustomImage, Meme, Sticker } from "@/lib/game/types";
import { TEMPLATES, getMemeFields } from "@/lib/templates";
import { CATEGORIES, type MemeTemplate, type TemplateField } from "@/lib/templates/types";
import { MemeView, TemplateThumb, exportMemePng, memeToPngBlob } from "@/components/meme/MemeView";
import { PersoImagesProvider } from "@/components/meme/perso";
import { DecorShowcase } from "./DecorShowcase";

export type Fill = "vide" | "court" | "long";

const SHORT_TEXTS = ["Ok.", "Trop bien", "Bof", "Jamais", "Oui chef", "Non."];
const LONG_TEXT =
  "Hexakosioihexekontahexaphobie : l'élève s'est endormi(e) çà et là 😭🔥 pendant l'interro surprise de philosophie — où est passée ma trousse ?! Œuvre complète à réviser pour demain 8 h, évidemment… Anticonstitutionnellement vôtre, le délégué qui n'a rien suivi depuis la rentrée.";
const LONG_NAME = "Jean-Christophe-Emmanuel de la Bourdonnaye-Villeneuve";

/** Texte de test pour un champ, selon l'état de remplissage. */
export function testValue(field: TemplateField, index: number, fill: Fill): string {
  if (fill === "vide") return "";
  if (fill === "court") {
    if (field.kind === "name") return ["Léa", "M. Roy", "Zoé"][index % 3];
    if (field.kind === "note") return ["7", "2", "19"][index % 3];
    return SHORT_TEXTS[index % SHORT_TEXTS.length].slice(0, field.maxLength);
  }
  if (field.kind === "name") return LONG_NAME.slice(0, field.maxLength);
  if (field.kind === "note") return "19,75/20 (coef. 16)".slice(0, field.maxLength);
  let s = LONG_TEXT;
  while (s.length < field.maxLength) s += " " + LONG_TEXT;
  return s.slice(0, field.maxLength);
}

export function testMeme(templateId: string, fill: Fill): Meme {
  const values: Record<string, string> = {};
  getMemeFields(templateId).forEach((f, i) => {
    const v = testValue(f, i, fill);
    if (v) values[f.id] = v;
  });
  return { templateId, values, stickers: [] };
}

// ------------------------------------------------------------------ images factices du pack perso

const FAKE_IMAGES: CustomImage[] = [
  { id: "portrait", w: 720, h: 1280, by: "dev", byName: "Dev" },
  { id: "carre", w: 900, h: 900, by: "dev", byName: "Dev" },
  { id: "paysage", w: 1280, h: 720, by: "dev", byName: "Dev" },
  { id: "panorama", w: 1600, h: 400, by: "dev", byName: "Dev" },
];

const fakeCache = new Map<string, string>();
function fakeImageUrl(id: string): string {
  const cached = fakeCache.get(id);
  if (cached) return cached;
  const meta = FAKE_IMAGES.find((i) => i.id === id);
  if (!meta || typeof document === "undefined") return "";
  const c = document.createElement("canvas");
  c.width = meta.w / 2;
  c.height = meta.h / 2;
  const g = c.getContext("2d");
  if (!g) return "";
  const grad = g.createLinearGradient(0, 0, c.width, c.height);
  grad.addColorStop(0, "#ff9a3d");
  grad.addColorStop(0.5, "#ff5fa2");
  grad.addColorStop(1, "#7b5cff");
  g.fillStyle = grad;
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = "rgba(255,255,255,0.25)";
  for (let i = 0; i < 9; i++) {
    g.beginPath();
    g.arc(((i * 197) % 100) * 0.01 * c.width, ((i * 71) % 100) * 0.01 * c.height, 30 + ((i * 37) % 60), 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = "#14132b";
  g.font = `bold ${Math.round(Math.min(c.width, c.height) * 0.11)}px sans-serif`;
  g.textAlign = "center";
  g.fillText(`${id} ${meta.w}×${meta.h}`, c.width / 2, c.height / 2);
  const url = c.toDataURL("image/jpeg", 0.8);
  fakeCache.set(id, url);
  return url;
}

// ------------------------------------------------------------------ morceaux d'interface

function Frame({ width, label, children }: { width: number; label: string; children: ReactNode }) {
  return (
    <div style={{ width }} className="shrink-0">
      <div className="mb-1 text-xs font-semibold text-[#8f8db3]">{label}</div>
      {children}
    </div>
  );
}

function TemplateCard({ tpl, fill, sheet }: { tpl: MemeTemplate; fill: Fill; sheet: boolean }) {
  const [active, setActive] = useState<string | null>(null);
  const memes = useMemo(
    () => ({ vide: testMeme(tpl.id, "vide"), court: testMeme(tpl.id, "court"), long: testMeme(tpl.id, "long") }),
    [tpl.id],
  );
  const problems: string[] = [];
  if (tpl.width !== 1000) problems.push("width ≠ 1000");
  if (tpl.height < 560 || tpl.height > 1400) problems.push("hauteur hors 560–1400");
  if (tpl.fields.length < 1 || tpl.fields.length > 5) problems.push("1 à 5 champs attendus");
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(tpl.id)) problems.push("id pas en kebab-case");
  return (
    <section data-tpl={tpl.id} className="rounded-2xl border-2 border-[#2c2a5a] bg-[#1e1d40] p-4">
      <header className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="font-display text-xl font-extrabold text-[#fbf7ec]">{tpl.name}</h3>
        <code className="text-sm text-[#5df2a0]">{tpl.id}</code>
        <span className="text-xs text-[#8f8db3]">
          1000 × {tpl.height} · {tpl.fields.map((f) => `${f.id}${f.optional ? "?" : ""}(${f.maxLength}${f.kind ? `, ${f.kind}` : ""})`).join(" · ")}
        </span>
        {problems.map((p) => (
          <span key={p} className="rounded bg-[#e5383b] px-2 py-0.5 text-xs font-bold text-white">
            {p}
          </span>
        ))}
      </header>
      {sheet ? (
        <div className="flex items-start gap-3">
          {(["vide", "court", "long"] as Fill[]).map((f) => (
            <Frame key={f} width={340} label={`${f} · 340 px`}>
              <MemeView meme={memes[f]} mode={f === "vide" ? "edit" : "final"} />
            </Frame>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap items-start gap-4">
          <Frame width={340} label="340 px (téléphone)">
            <MemeView meme={memes[fill]} mode={fill === "vide" ? "edit" : "final"} activeField={active} onFieldTap={setActive} />
          </Frame>
          <Frame width={700} label="700 px (écran de classe)">
            <MemeView meme={memes[fill]} mode={fill === "vide" ? "edit" : "final"} />
          </Frame>
        </div>
      )}
    </section>
  );
}

function StickerLab() {
  const first = TEMPLATES[0]?.id ?? "inconnu";
  const [stickers, setStickers] = useState<Sticker[]>([
    { e: "skull", x: 0.3, y: 0.35, s: 0.22, r: -12 },
    { e: "fire", x: 0.72, y: 0.6, s: 0.16, r: 10 },
  ]);
  const [log, setLog] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const meme = useMemo<Meme>(() => ({ ...testMeme(first, "court"), stickers }), [first, stickers]);
  return (
    <section data-section="stickers" className="rounded-2xl border-2 border-[#2c2a5a] bg-[#1e1d40] p-4">
      <h3 className="mb-3 font-display text-xl font-extrabold text-[#fbf7ec]">Stickers éditables + export PNG</h3>
      <div className="flex flex-wrap items-start gap-4">
        <div style={{ width: 340 }}>
          <MemeView ref={ref} meme={meme} mode="edit" editableStickers onStickersChange={setStickers} />
        </div>
        <div className="flex max-w-md flex-col gap-2 text-sm text-[#fbf7ec]">
          <div className="flex flex-wrap gap-2">
            <button type="button" data-testid="add-sticker" className="btn btn-sm" onClick={() => setStickers((s) => [...s, { e: "clown-face", x: 0.5, y: 0.5, s: 0.2, r: 0 }])}>
              + sticker
            </button>
            <button
              type="button"
              data-testid="export"
              className="btn btn-sm btn-green"
              onClick={async () => {
                if (!ref.current) return;
                const t0 = performance.now();
                const blob = await memeToPngBlob(ref.current);
                const bmp = await createImageBitmap(blob);
                setLog(`export ok : ${bmp.width}×${bmp.height}px, ${Math.round(blob.size / 1024)} Ko, ${Math.round(performance.now() - t0)} ms`);
              }}
            >
              Tester l&apos;export
            </button>
            <button type="button" className="btn btn-sm btn-blue" onClick={() => ref.current && exportMemePng(ref.current, "meme-test.png")}>
              Télécharger le PNG
            </button>
          </div>
          <pre data-testid="stickers-json" className="whitespace-pre-wrap rounded bg-[#14132b] p-2 text-xs text-[#5df2a0]">
            {JSON.stringify(stickers)}
          </pre>
          <div data-testid="export-log" className="text-xs text-[#ffe94a]">
            {log}
          </div>
        </div>
      </div>
    </section>
  );
}

function PersoLab({ fill }: { fill: Fill }) {
  return (
    <section data-section="perso" className="rounded-2xl border-2 border-[#2c2a5a] bg-[#1e1d40] p-4">
      <h3 className="mb-3 font-display text-xl font-extrabold text-[#fbf7ec]">Pack perso (images factices)</h3>
      <PersoImagesProvider code="DEV" images={FAKE_IMAGES} resolveUrl={fakeImageUrl}>
        <div className="flex flex-wrap items-start gap-4">
          {FAKE_IMAGES.map((img) => (
            <Frame key={img.id} width={260} label={`perso:${img.id} (${img.w}×${img.h})`}>
              <MemeView meme={testMeme(`perso:${img.id}`, fill)} mode={fill === "vide" ? "edit" : "final"} />
            </Frame>
          ))}
          <Frame width={260} label="perso:supprimee (repli)">
            <MemeView meme={testMeme("perso:supprimee", fill)} />
          </Frame>
          <Frame width={260} label="gabarit inconnu (repli)">
            <MemeView meme={{ templateId: "nexiste-pas", values: {}, stickers: [] }} />
          </Frame>
          <Frame width={160} label="TemplateThumb perso">
            <TemplateThumb templateId="perso:carre" />
          </Frame>
          <Frame width={300} label="fit=contain dans 300×200">
            <div style={{ width: 300, height: 200, background: "#0c0b1a" }}>
              <MemeView meme={testMeme("perso:portrait", "court")} fit="contain" />
            </div>
          </Frame>
        </div>
      </PersoImagesProvider>
    </section>
  );
}

function PerfLab() {
  const list = useMemo(() => Array.from({ length: 20 }, (_, i) => TEMPLATES[i % Math.max(1, TEMPLATES.length)]).filter(Boolean), []);
  return (
    <section data-section="perf" className="rounded-2xl border-2 border-[#2c2a5a] bg-[#1e1d40] p-4">
      <h3 className="mb-3 font-display text-xl font-extrabold text-[#fbf7ec]">Perf : 20 MemeView + vignettes</h3>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {list.map((t, i) => (
          <MemeView key={i} meme={testMeme(t.id, i % 2 ? "long" : "court")} />
        ))}
      </div>
      <h4 className="mb-2 mt-6 text-sm font-bold text-[#fbf7ec]">TemplateThumb (montées à l&apos;approche de l&apos;écran)</h4>
      <div className="grid grid-cols-4 gap-2 md:grid-cols-8">
        {TEMPLATES.map((t) => (
          <TemplateThumb key={t.id} templateId={t.id} />
        ))}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ page

export function Gallery({ initialFill, only, cat, sheet, section }: { initialFill: Fill; only: string[] | null; cat: string | null; sheet: boolean; section: string | null }) {
  const [fill, setFill] = useState<Fill>(initialFill);
  const show = (s: string) => !section || section === s;
  const ids = new Set<string>();
  const dupes = TEMPLATES.filter((t) => (ids.has(t.id) ? true : (ids.add(t.id), false))).map((t) => t.id);
  return (
    <main className="mx-auto flex w-full max-w-[1180px] flex-col gap-6 p-4">
      <header className="sticky top-0 z-50 -mx-4 flex flex-wrap items-center gap-3 bg-[#14132b]/95 px-4 py-3">
        <h1 className="font-display text-2xl font-extrabold">Gabarits ({TEMPLATES.length})</h1>
        <div className="flex gap-2">
          {(["vide", "court", "long"] as Fill[]).map((f) => (
            <button key={f} type="button" data-fill={f} onClick={() => setFill(f)} className={`btn btn-sm ${fill === f ? "" : "btn-ghost"}`}>
              {f === "vide" ? "Vide (placeholders)" : f === "court" ? "Rempli court" : "Rempli très long"}
            </button>
          ))}
        </div>
        {dupes.length ? <span className="rounded bg-[#e5383b] px-2 py-1 text-sm font-bold">ids en double : {dupes.join(", ")}</span> : null}
        <span className="text-xs text-[#8f8db3]">?only=id · ?cat=ecole · ?sheet=1 · ?section=stickers|decors|perso|perf</span>
      </header>

      {show("gabarits")
        ? CATEGORIES.filter((c) => !cat || c.id === cat).map((c) => {
            const list = TEMPLATES.filter((t) => t.category === c.id && (!only || only.includes(t.id)));
            if (!list.length) return null;
            return (
              <div key={c.id} className="flex flex-col gap-4">
                <h2 className="font-display text-3xl font-extrabold text-[#ffe94a]">
                  {c.label} <span className="text-base text-[#8f8db3]">({list.length})</span>
                </h2>
                {list.map((t) => (
                  <TemplateCard key={t.id} tpl={t} fill={fill} sheet={sheet} />
                ))}
              </div>
            );
          })
        : null}

      {show("stickers") && !only ? <StickerLab /> : null}
      {show("perso") && !only ? <PersoLab fill={fill} /> : null}
      {section === "decors" ? <DecorShowcase /> : null}
      {section === "perf" ? <PerfLab /> : null}
    </main>
  );
}
