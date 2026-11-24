/**
 * Récompenses de fin de partie. Fonction pure : ne dépend que des mèmes clos
 * et des votes. On ne décerne que ce qui a du sens vu les données, et on évite
 * de récompenser deux fois la même personne tant que c'est possible.
 */
import type { MemeEntry, RoomState } from "./state";
import type { Award } from "./types";

export const MIN_AWARDS = 4;
export const MAX_AWARDS = 6;

export function memePoints(m: MemeEntry): number {
  if (m.removed) return 0;
  let total = 0;
  for (const id in m.votes) total += m.votes[id];
  return total;
}

function pts(n: number): string {
  return `${n} point${n > 1 ? "s" : ""}`;
}

function fr(n: number): string {
  return n.toFixed(1).replace(".", ",");
}

interface Winner {
  playerId: string;
  description: string;
  memeId?: string;
}

interface Candidate {
  id: string;
  title: string;
  emoji: string;
  /** gagnants légitimes (plusieurs en cas d'égalité) */
  winners: Winner[];
}

export function computeAwards(room: RoomState): Award[] {
  const memes = room.memes.filter((m) => m.closed && !m.removed);
  const players = room.players;
  const names = new Map(players.map((p) => [p.id, p.name]));
  const inRoom = (id: string) => names.has(id);
  const scored = memes.filter((m) => inRoom(m.authorId)).map((m) => ({ m, points: memePoints(m) }));
  if (scored.length === 0) return [];

  const candidates: Candidate[] = [];

  // --- 1. meilleur score total
  const totals = new Map<string, number>();
  for (const { m, points } of scored) totals.set(m.authorId, (totals.get(m.authorId) ?? 0) + points);
  const bestTotal = Math.max(...totals.values());
  if (bestTotal > 0) {
    candidates.push({
      id: "major",
      title: "Major de promo",
      emoji: "crown",
      winners: players
        .filter((p) => totals.get(p.id) === bestTotal)
        .map((p) => ({
          playerId: p.id,
          description: `${pts(bestTotal)} au compteur : mention très bien et félicitations du jury.`,
        })),
    });
  }

  // --- 2. meilleur mème
  const bestMeme = Math.max(...scored.map((s) => s.points));
  if (bestMeme > 0) {
    candidates.push({
      id: "meme-or",
      title: "Mème d'or",
      emoji: "trophy",
      winners: scored
        .filter((s) => s.points === bestMeme)
        .map((s) => ({
          playerId: s.m.authorId,
          memeId: s.m.id,
          description: `Le mème le mieux noté de la partie (${pts(bestMeme)}). À afficher en salle des profs.`,
        })),
    });
  }

  // --- 3. humour incompris (tendre)
  const voted = scored.filter((s) => Object.keys(s.m.votes).length > 0);
  if (voted.length >= 2) {
    const worst = Math.min(...voted.map((s) => s.points));
    if (worst < bestMeme) {
      candidates.push({
        id: "incompris",
        title: "Humour incompris",
        emoji: "crystal-ball",
        winners: voted
          .filter((s) => s.points === worst)
          .map((s) => ({
            playerId: s.m.authorId,
            memeId: s.m.id,
            description: "En avance sur son époque : dans dix ans, ce mème sera culte.",
          })),
      });
    }
  }

  // --- 4 & 5. votant le plus généreux / juge le plus sévère
  const given = new Map<string, { sum: number; n: number }>();
  for (const { m } of scored) {
    for (const voterId in m.votes) {
      if (!inRoom(voterId)) continue;
      const g = given.get(voterId) ?? { sum: 0, n: 0 };
      g.sum += m.votes[voterId];
      g.n += 1;
      given.set(voterId, g);
    }
  }
  const maxCast = Math.max(0, ...[...given.values()].map((g) => g.n));
  const minCast = Math.max(2, Math.ceil(maxCast / 2));
  const judges = players
    .filter((p) => (given.get(p.id)?.n ?? 0) >= minCast)
    .map((p) => {
      const g = given.get(p.id)!;
      return { id: p.id, avg: g.sum / g.n };
    });
  if (judges.length >= 2) {
    const hi = Math.max(...judges.map((j) => j.avg));
    const lo = Math.min(...judges.map((j) => j.avg));
    if (hi - lo > 1e-9) {
      candidates.push({
        id: "bon-public",
        title: "Bon public",
        emoji: "clapping-hands",
        winners: judges
          .filter((j) => j.avg === hi)
          .map((j) => ({
            playerId: j.id,
            description: `Rit à tout, même aux blagues du prof de maths (note moyenne donnée : ${fr(hi)}/3).`,
          })),
      });
      candidates.push({
        id: "jury-severe",
        title: "Correcteur du bac",
        emoji: "face-with-monocle",
        winners: judges
          .filter((j) => j.avg === lo)
          .map((j) => ({
            playerId: j.id,
            description: `Note comme un correcteur de philo un lundi matin (moyenne donnée : ${fr(lo)}/3). On l'aime quand même.`,
          })),
      });
    }
  }

  // --- 6. le plus régulier
  const byAuthor = new Map<string, { round: number; points: number; id: string }[]>();
  for (const { m, points } of scored) {
    const list = byAuthor.get(m.authorId) ?? [];
    list.push({ round: m.round, points, id: m.id });
    byAuthor.set(m.authorId, list);
  }
  const regulars = players
    .filter((p) => (byAuthor.get(p.id)?.length ?? 0) >= 2)
    .map((p) => {
      const list = byAuthor.get(p.id)!.map((x) => x.points);
      const min = Math.min(...list);
      const max = Math.max(...list);
      return { id: p.id, min, max, spread: max - min, mean: list.reduce((a, b) => a + b, 0) / list.length };
    })
    .filter((r) => r.mean > 0);
  if (regulars.length >= 2) {
    regulars.sort((a, b) => a.spread - b.spread || b.mean - a.mean);
    const best = regulars[0];
    candidates.push({
      id: "regulier",
      title: "Régulier comme la sonnerie",
      emoji: "alarm-clock",
      winners: regulars
        .filter((r) => r.spread === best.spread && r.mean === best.mean)
        .map((r) => ({
          playerId: r.id,
          description:
            r.min === r.max
              ? `${pts(r.min)} à chaque manche, pile-poil. Une horloge suisse.`
              : `Jamais un mème en dessous des autres : entre ${r.min} et ${pts(r.max)} à chaque manche.`,
        })),
    });
  }

  // --- 7. le plus de « Mort de rire » reçus
  const skulls = new Map<string, number>();
  for (const { m } of scored) {
    let n = 0;
    for (const voterId in m.votes) if (m.votes[voterId] === 3) n++;
    if (n > 0) skulls.set(m.authorId, (skulls.get(m.authorId) ?? 0) + n);
  }
  const maxSkulls = Math.max(0, ...skulls.values());
  if (maxSkulls > 0) {
    candidates.push({
      id: "fou-rire",
      title: "Danger public",
      emoji: "skull",
      winners: players
        .filter((p) => skulls.get(p.id) === maxSkulls)
        .map((p) => ({
          playerId: p.id,
          description: `${maxSkulls} vote${maxSkulls > 1 ? "s" : ""} « Mort de rire » : plus personne n'arrivait à garder son sérieux.`,
        })),
    });
  }

  // --- 8. remontada
  let bestDelta = 0;
  const deltas: { id: string; delta: number }[] = [];
  for (const p of players) {
    const list = (byAuthor.get(p.id) ?? []).slice().sort((a, b) => a.round - b.round);
    if (list.length < 2) continue;
    const delta = list[list.length - 1].points - list[0].points;
    deltas.push({ id: p.id, delta });
    bestDelta = Math.max(bestDelta, delta);
  }
  if (bestDelta > 0) {
    candidates.push({
      id: "remontada",
      title: "Remontada",
      emoji: "rocket",
      winners: deltas
        .filter((d) => d.delta === bestDelta)
        .map((d) => ({
          playerId: d.id,
          description: `Parti doucement, fini en fusée : +${pts(bestDelta)} entre son premier et son dernier mème.`,
        })),
    });
  }

  // --- 9. le plus long mème
  if (scored.length >= 2) {
    const lengths = scored.map((s) => ({
      s,
      len: Object.values(s.m.meme.values).reduce((a, v) => a + v.trim().length, 0),
    }));
    const longest = Math.max(...lengths.map((l) => l.len));
    const shortest = Math.min(...lengths.map((l) => l.len));
    if (longest >= 30 && longest > shortest) {
      candidates.push({
        id: "romancier",
        title: "Prix Goncourt des lycéens",
        emoji: "scroll",
        winners: lengths
          .filter((l) => l.len === longest)
          .map((l) => ({
            playerId: l.s.m.authorId,
            memeId: l.s.m.id,
            description: "Le mème le plus long de la partie. Victor Hugo n'a qu'à bien se tenir.",
          })),
      });
    }
  }

  // --- 10. stickers
  const stickers = new Map<string, number>();
  for (const { m } of scored) {
    if (m.meme.stickers.length > 0) stickers.set(m.authorId, (stickers.get(m.authorId) ?? 0) + m.meme.stickers.length);
  }
  const maxStickers = Math.max(0, ...stickers.values());
  if (maxStickers >= 3) {
    candidates.push({
      id: "stickers",
      title: "Trousse la mieux décorée",
      emoji: "sparkles",
      winners: players
        .filter((p) => stickers.get(p.id) === maxStickers)
        .map((p) => ({
          playerId: p.id,
          description: `${maxStickers} stickers collés sur ses mèmes. L'agenda doit être dans le même état.`,
        })),
    });
  }

  // --- sélection : d'abord une récompense par personne, puis on complète jusqu'à MIN_AWARDS
  const chosen = new Map<string, Winner>();
  const awarded = new Set<string>();
  for (const c of candidates) {
    if (chosen.size >= MAX_AWARDS) break;
    const w = c.winners.find((x) => !awarded.has(x.playerId));
    if (!w) continue;
    chosen.set(c.id, w);
    awarded.add(w.playerId);
  }
  if (chosen.size < MIN_AWARDS) {
    const count = new Map<string, number>();
    for (const w of chosen.values()) count.set(w.playerId, 1);
    for (const c of candidates) {
      if (chosen.size >= MIN_AWARDS) break;
      if (chosen.has(c.id) || c.winners.length === 0) continue;
      const w = c.winners.slice().sort((a, b) => (count.get(a.playerId) ?? 0) - (count.get(b.playerId) ?? 0))[0];
      chosen.set(c.id, w);
      count.set(w.playerId, (count.get(w.playerId) ?? 0) + 1);
    }
  }

  const out: Award[] = [];
  for (const c of candidates) {
    const w = chosen.get(c.id);
    if (!w) continue;
    const award: Award = {
      id: c.id,
      title: c.title,
      description: w.description,
      emoji: c.emoji,
      playerId: w.playerId,
      playerName: names.get(w.playerId) ?? "",
    };
    if (w.memeId) award.memeId = w.memeId;
    out.push(award);
  }
  return out;
}
