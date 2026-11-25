#!/usr/bin/env node
/**
 * Simulateur de joueurs pour tester une partie.
 *
 *   node scripts/bots.mjs --code ABCD --n 6            # 6 robots rejoignent la salle ABCD et jouent tout seuls
 *   node scripts/bots.mjs --create --n 8               # crée une salle (le 1er robot est l'hôte), affiche le code,
 *                                                      # lance la partie quand tout le monde est là, rejoue en boucle
 *   options : --base http://localhost:3102   --submit-after 6 (secondes avant de valider un mème)
 *             --vote-after 2 (secondes avant de voter)   --start-after 8 (--create : délai avant "start")
 *             --mode classique|meme-image|theme   --rounds 3   --create-seconds 60   --vote-seconds 12
 *             --no-again (--create : ne relance pas de partie après le podium)   --quiet
 */
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? def : args[i + 1];
};
const flag = (name) => args.includes(`--${name}`);
const BASE = opt("base", "http://localhost:3102");
const N = Number(opt("n", 6));
const SUBMIT_AFTER = Number(opt("submit-after", 6)) * 1000;
const VOTE_AFTER = Number(opt("vote-after", 2)) * 1000;
const START_AFTER = Number(opt("start-after", 8)) * 1000;
const QUIET = flag("quiet");
const log = (...a) => { if (!QUIET) console.log(...a); };

const NAMES = ["Inès", "Yanis", "Léa", "Mathis", "Sarah", "Enzo", "Jade", "Rayan", "Chloé", "Noah", "Lina", "Hugo", "Maëlys", "Adam", "Manon", "Sofiane", "Camille", "Lucas", "Nour", "Théo", "Emma", "Bilal", "Zoé", "Kylian", "Anaïs", "Ilyes", "Louise", "Nathan", "Aya", "Tom", "Clara", "Mehdi", "Juliette", "Axel", "Salomé", "Ethan", "Romane", "Malik", "Eva", "Gabin"];
const AVATARS = ["fox", "frog", "octopus", "panda", "ghost", "alien", "robot", "unicorn", "penguin", "owl", "tiger-face", "koala", "skull", "clown-face", "nerd-face", "moai", "pizza", "avocado", "cactus", "hamster"];
const TEXTS = ["Moi à 8 h le lundi", "Quand le prof dit « sortez une feuille »", "0 révision, 100 % confiance", "La classe quand le prof est absent", "Perte d'aura", "Il a cuisiné", "C'est une dinguerie", "Mme Dupont", "M. Bernard", "4/20", "Peut mieux faire", "Bavarde trop", "Le délégué", "T'es cuit", "Personne : / Le prof de maths :", "Masterclass", "Encore en retard", "J'ai oublié mon sac", "Le self à 12 h 01", "Parcoursup : en attente", "PNJ du fond de la classe", "Le wifi du lycée", "Exposé commencé à 7 h 40", "+1000 aura", "Storytime : j'ai eu 2", "Un texte volontairement beaucoup plus long pour vérifier que tout tient correctement dans la zone prévue"];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function http(path, body, method) {
  const res = await fetch(BASE + path, body ? { method: method ?? "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : { method: method ?? "GET" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(json.message || res.statusText); e.code = json.error; e.status = res.status; throw e; }
  return json;
}

const catalog = await http("/api/dev/catalog");
const FIELDS = new Map(catalog.map((t) => [t.id, t.fields]));

function makeMeme(view) {
  const c = view.create;
  const hand = c.hands[Math.floor(Math.random() * c.hands.length)] ?? [];
  const templateId = c.forcedTemplateId ?? pick(hand);
  if (!templateId) return null;
  const fields = FIELDS.get(templateId) ?? [{ id: "haut", maxLength: 90 }, { id: "bas", maxLength: 90 }];
  const values = {};
  for (const f of fields) values[f.id] = (Math.random() < 0.25 && c.situations.length ? pick(c.situations) : pick(TEXTS)).slice(0, f.maxLength);
  const stickers = Math.random() < 0.4 ? [{ e: pick(["skull", "moai", "clown-face", "fire", "nerd-face"]), x: 0.2 + Math.random() * 0.6, y: 0.2 + Math.random() * 0.6, s: 0.18, r: Math.round(Math.random() * 40 - 20) }] : [];
  return { templateId, values, stickers };
}

async function runBot(code, i, isHost, session) {
  const name = NAMES[i % NAMES.length] + (i >= NAMES.length ? i : "");
  let token = session?.token;
  if (!token) {
    const res = await http(`/api/rooms/${code}`, { type: "join", name, avatar: AVATARS[i % AVATARS.length] });
    token = res.token;
  }
  log(`[${name}] dans la salle ${code}${isHost ? " (hôte)" : ""}`);
  const act = (a) => http(`/api/rooms/${code}`, { ...a, token }).catch((e) => { if (e.code !== "bad_phase") log(`[${name}] ${a.type}: ${e.code ?? e.message}`); });
  let phaseKey = "", phaseSince = Date.now(), version, lobbySince = Date.now();
  for (;;) {
    await sleep(600 + Math.random() * 300);
    let view;
    try {
      const res = await http(`/api/rooms/${code}?token=${token}${version != null ? `&v=${version}` : ""}`);
      if (res.unchanged) { view = runBot.last?.[token]; } else { view = res; version = res.version; (runBot.last ??= {})[token] = res; }
    } catch (e) {
      if (e.code === "kicked" || e.code === "room_not_found") { log(`[${name}] ${e.code}, arrêt`); return; }
      if (e.code === "bad_token") { log(`[${name}] bad_token, arrêt`); return; }
      continue;
    }
    if (!view) continue;
    const key = `${view.phase}:${view.round}:${view.vote?.memeId ?? ""}`;
    if (key !== phaseKey) { phaseKey = key; phaseSince = Date.now(); if (view.phase === "lobby") lobbySince = Date.now(); if (isHost) log(`— phase ${key}`); }
    const waited = Date.now() - phaseSince;
    if (view.phase === "lobby" && isHost && view.players.filter((p) => p.connected).length >= Math.min(N, 2) && Date.now() - lobbySince > START_AFTER) {
      const patch = {};
      if (opt("mode")) patch.mode = opt("mode");
      if (opt("rounds")) patch.rounds = Number(opt("rounds"));
      if (opt("create-seconds")) patch.createSeconds = Number(opt("create-seconds"));
      if (opt("vote-seconds")) patch.voteSeconds = Number(opt("vote-seconds"));
      if (Object.keys(patch).length) await act({ type: "settings", patch });
      await act({ type: "start" });
    }
    if (view.phase === "create" && view.create && !view.create.submitted && view.create.hands.length && waited > SUBMIT_AFTER * (0.6 + Math.random() * 0.8)) {
      const meme = makeMeme(view);
      if (meme) await act({ type: "submit", meme });
    }
    if (view.phase === "vote" && view.vote && !view.vote.isMine && view.vote.myVote == null && waited > VOTE_AFTER * (0.5 + Math.random())) {
      const r = Math.random();
      await act({ type: "vote", memeId: view.vote.memeId, score: r < 0.15 ? 0 : r < 0.45 ? 1 : r < 0.8 ? 2 : 3 });
    }
    if (view.phase === "final" && isHost && !flag("no-again") && flag("create") && waited > 25000) await act({ type: "again" });
  }
}

let code = opt("code");
const bots = [];
if (flag("create")) {
  const res = await http("/api/rooms", { name: NAMES[0], avatar: AVATARS[0] });
  code = res.code;
  console.log(`SALLE ${code}  →  ${BASE}/r/${code}   écran de classe : ${BASE}/tv/${code}`);
  bots.push(runBot(code, 0, true, res));
  for (let i = 1; i < N; i++) { await sleep(150); bots.push(runBot(code, i, false)); }
} else {
  if (!code) { console.error("Il faut --code ABCD ou --create"); process.exit(1); }
  code = code.toUpperCase();
  for (let i = 0; i < N; i++) { await sleep(150); bots.push(runBot(code, i + 1, false)); }
}
await Promise.all(bots);
