/**
 * Petites phrases d'ambiance. Ton lycéen, drôle, jamais méchant : les bides
 * restent tendres, et aucune phrase ne s'accorde en genre avec un joueur.
 *
 * Tirage DÉTERMINISTE : toutes les fonctions prennent une graine (chaîne ou
 * nombre) et renvoient toujours la même phrase pour la même graine, afin que
 * tous les écrans d'une salle affichent la même chose. Graines conseillées :
 *   - lobby / conseils : `rotatingSeed(code, now, 6000)` (change toutes les 6 s) ;
 *   - révélation : `memeId` ;
 *   - annonce de manche : `${code}:${round}` ;
 *   - podium / dernier : `${code}:${playerId}`.
 */

// ---------------------------------------------------------------- hasard déterministe

export type Seed = string | number;

/** Hachage 32 bits (FNV-1a + brassage final), stable d'une machine à l'autre. */
export function hashSeed(seed: Seed): number {
  const s = String(seed);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Générateur pseudo-aléatoire dans [0, 1) à partir d'une graine (mulberry32). */
export function seededRandom(seed: Seed): () => number {
  let a = hashSeed(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Choisit toujours le même élément pour la même graine. */
export function pickSeeded<T>(list: readonly T[], seed: Seed): T {
  return list[hashSeed(seed) % list.length];
}

/** Graine qui change toutes les `everyMs` millisecondes (horloge SERVEUR conseillée). */
export function rotatingSeed(base: Seed, nowMs: number, everyMs = 6000): string {
  return `${base}:${Math.floor(nowMs / Math.max(1, everyMs))}`;
}

function fill(template: string, name: string): string {
  // fonction de remplacement : un pseudo contenant « $& » ne doit pas être interprété
  return template.replace(/\{nom\}/g, () => name);
}

// ---------------------------------------------------------------- lobby

export const LOBBY_PHRASES: readonly string[] = [
  "On attend les retardataires… comme d'habitude.",
  "Échauffe tes pouces, ça va chauffer.",
  "Le prof a dit « cinq minutes ». Ça fait dix.",
  "Ici, les bavardages sont notés. Sur 20.",
  "Dernière chance d'aller aux toilettes.",
  "Qui manque à l'appel ?",
  "Le code est au tableau. Oui, au tableau. Lève les yeux.",
  "Mode avion désactivé, humour activé.",
  "On commence dès que tout le monde a trouvé le wifi.",
  "Sortez une feuille… non, on rigole. Sortez vos vannes.",
  "Rappel : on charrie, on n'humilie pas.",
  "Ça sent le 20 sur 20 en humour.",
  "Installe-toi, choisis ta tête, prépare tes vannes.",
  "Plus on est de fous, plus il y a de mèmes.",
  "Les délégués sont priés de faire moins de bruit.",
  "Chargement de l'aura en cours…",
  "Locked in ? On démarre bientôt.",
  "Laissez cuisiner : la partie se prépare.",
  "Storytime : il était une fois une classe qui attendait le dernier joueur.",
  "Aucune perte d'aura ne sera remboursée.",
  "Ici, tout le monde a la réf. Enfin, normalement.",
  "Pas de PNJ dans cette salle : tout le monde joue.",
  "Quête principale : faire rire la classe.",
  "Lancer la partie : +1000 aura.",
];

export function lobbyPhrase(seed: Seed): string {
  return pickSeeded(LOBBY_PHRASES, seed);
}

// ---------------------------------------------------------------- pendant la création

/** `{nom}` = pseudo d'un joueur qui n'a pas encore validé. */
export const CREATING_PHRASES: readonly string[] = [
  "{nom} cherche encore l'inspiration…",
  "{nom} fixe son écran comme un sujet de philo.",
  "{nom} réécrit sa blague pour la huitième fois.",
  "{nom} hésite entre deux chefs-d'œuvre.",
  "{nom} a un brouillon. C'est déjà ça.",
  "{nom} demande si c'est noté.",
  "{nom} peaufine. Ou dort. Difficile à dire.",
  "{nom} tape, efface, retape, efface…",
  "{nom} attend que l'idée vienne toute seule.",
  "{nom} choisit ses stickers avec un soin infini.",
  "Silence, {nom} est en pleine création.",
  "On attend {nom}. Sans pression. Enfin, un peu.",
  "{nom} ricane devant son propre mème. Bon signe.",
  "Laissez cuisiner {nom}.",
  "{nom} est locked in. Ne pas déranger.",
  "{nom} prépare un banger. Ou un flop. Suspense.",
  "{nom} rend toujours sa copie à la dernière seconde.",
  "{nom} farme de l'aura sur son gabarit.",
  "{nom} : « Deux secondes, j'ai presque fini. »",
  "{nom} relit sa vanne à voix basse.",
];

/** Quand on ne sait pas qui on attend (ou pour varier). */
export const CREATING_GENERIC_PHRASES: readonly string[] = [
  "Silence, ça crée.",
  "Les copies arrivent…",
  "Ça réfléchit fort par ici.",
  "Ça cuisine dans tous les coins.",
  "On entend des ricanements. C'est bon signe.",
  "Le plus court est souvent le plus drôle.",
];

export const ALL_SUBMITTED_PHRASES: readonly string[] = [
  "Tout le monde a rendu sa copie !",
  "Copies ramassées. On passe aux choses sérieuses.",
  "C'est dans la boîte. Place au vote !",
  "Tout le monde a cuisiné. À table.",
];

/**
 * Phrase d'attente pendant la création.
 * `waitingFor` : pseudos des joueurs qui n'ont pas encore validé. Liste vide =
 * tout le monde a rendu ; non fournie = phrase générique.
 */
export function creatingPhrase(seed: Seed, waitingFor?: readonly string[]): string {
  if (!waitingFor) return pickSeeded(CREATING_GENERIC_PHRASES, seed);
  if (waitingFor.length === 0) return pickSeeded(ALL_SUBMITTED_PHRASES, seed);
  const name = pickSeeded(waitingFor, `${seed}:qui`);
  return fill(pickSeeded(CREATING_PHRASES, seed), name);
}

// ---------------------------------------------------------------- révélation

/** 0 = bide total … 4 = carnage. */
export type RevealTier = 0 | 1 | 2 | 3 | 4;

/** Seuils (part des points obtenus sur le maximum possible) : < 15 %, < 40 %, < 65 %, < 85 %, au-delà. */
export const REVEAL_THRESHOLDS: readonly [number, number, number, number] = [0.15, 0.4, 0.65, 0.85];

export const REVEAL_PHRASES: Readonly<Record<RevealTier, readonly string[]>> = {
  // bide total — toujours tendre
  0: [
    "Humour incompris. Les grands artistes le sont toujours.",
    "Le public n'était pas prêt.",
    "Bide historique. On t'aime quand même.",
    "On dira que c'était de l'art contemporain.",
    "Le jury salue la prise de risque.",
    "C'était drôle dans ta tête, et c'est l'essentiel.",
    "Un silence… très respectueux.",
    "En avance sur ton temps, clairement.",
    "Ça arrive aux meilleurs. Surtout aux meilleurs.",
    "Peut mieux faire. Fera mieux.",
    "La blague était bonne. C'est le public qui était fatigué.",
    "Humour de niche. Très, très niche.",
    "−1000 aura… mais +1000 courage.",
    "Flop. Mais un flop assumé, c'est déjà de l'aura.",
    "C'est cuit pour cette manche. Pas pour la suivante.",
    "Personne n'avait la réf. Tant pis pour eux.",
    "L'algorithme de la classe ne t'a pas mis en avant.",
  ],
  // petit sourire
  1: [
    "Un petit sourire en coin, c'est déjà ça.",
    "Ça a soufflé du nez au fond de la salle.",
    "Pas mal. Le jury attend la suite.",
    "Échauffement validé.",
    "Il y avait une idée.",
    "Quelques sourires polis, mais sincères.",
    "Honnête. Comme un 9,5 arrondi à 10.",
    "Ça passe. De justesse, mais ça passe.",
    "Le fond de la classe a apprécié.",
    "Encouragements du conseil de classe.",
    "Ça chatouille, ça ne mord pas encore.",
    "C'est mid. Mais un mid sincère.",
    "Aura stable. Ni perte, ni gain.",
    "Deux ou trois personnes avaient la réf.",
    "La partie 2 sera meilleure, on le sent.",
    "Petit W. On prend.",
  ],
  // bon mème
  2: [
    "Solide. La moyenne est largement là.",
    "Ça a ri, et pas par politesse.",
    "Compliments du conseil de classe.",
    "Du travail sérieux dans la bêtise.",
    "Mention assez bien en humour.",
    "Ça fait le job, et même un peu plus.",
    "On sent le métier.",
    "Belle copie. Très belle copie.",
    "Ça, c'est du mème de terminale.",
    "Validé par la classe.",
    "+100 aura. Proprement.",
    "Ça a cuisiné, tranquillement.",
    "Green flag : ce mème.",
    "La classe avait la réf, et ça se voit.",
    "Gros W. Rien à redire.",
    "Ça mérite un repost.",
  ],
  // très bon
  3: [
    "Excellent. La salle ne s'en remet pas.",
    "Félicitations du conseil de classe.",
    "Mention très bien, option fou rire.",
    "Ça, ça finit en fond d'écran.",
    "Des larmes au premier rang.",
    "On frôle le chef-d'œuvre.",
    "Le niveau vient de monter d'un cran.",
    "Quelqu'un a dû sortir pour respirer.",
    "La concurrence prend des notes.",
    "18 sur 20. Les deux points, c'est pour la marge de progression.",
    "À encadrer au CDI.",
    "Banger. Tout simplement.",
    "+1000 aura.",
    "Ça a cuisiné sévère.",
    "Une dinguerie, ce mème.",
    "Personnage principal de la manche.",
    "Toute la classe réclame la partie 2.",
  ],
  // carnage
  4: [
    "CARNAGE. Plus personne ne respire.",
    "20 sur 20. Le jury est par terre.",
    "Mème de l'année, dossier clos.",
    "On ne s'en relèvera pas.",
    "Légende du lycée, à partir de maintenant.",
    "Félicitations du jury, à l'unanimité et en larmes.",
    "C'est plus un mème, c'est un monument.",
    "Standing ovation jusqu'au fond de la salle.",
    "Ça va finir affiché dans le hall.",
    "Le vidéoprojecteur lui-même a ri.",
    "Carnage. Ça a cuisiné, servi et fait la vaisselle.",
    "Masterclass. Rien à ajouter.",
    "Aura infinie.",
    "Énorme W. La classe est cuite.",
    "Banger absolu. Ça finit en edit.",
    "Tier S, sans débat.",
    "GG. On peut ranger les téléphones.",
  ],
};

/** Palier pour une part de points obtenus (0..1). */
export function revealTier(ratio: number): RevealTier {
  const r = Number.isFinite(ratio) ? ratio : 0;
  if (r < REVEAL_THRESHOLDS[0]) return 0;
  if (r < REVEAL_THRESHOLDS[1]) return 1;
  if (r < REVEAL_THRESHOLDS[2]) return 2;
  if (r < REVEAL_THRESHOLDS[3]) return 3;
  return 4;
}

/**
 * Part des points obtenus (0..1) à partir de la répartition des votes
 * `[bof, pasMal, drôle, mortDeRire]` (cf. `MemeResult.breakdown`).
 * Aucun vote = 0.
 */
export function revealRatio(breakdown: readonly [number, number, number, number]): number {
  const votes = breakdown[0] + breakdown[1] + breakdown[2] + breakdown[3];
  if (votes <= 0) return 0;
  const points = breakdown[1] + 2 * breakdown[2] + 3 * breakdown[3];
  return Math.min(1, Math.max(0, points / (3 * votes)));
}

/** Réaction à la révélation d'un mème. `ratio` = points obtenus / maximum possible (0..1). */
export function revealPhrase(ratio: number, seed: Seed): string {
  return pickSeeded(REVEAL_PHRASES[revealTier(ratio)], seed);
}

// ---------------------------------------------------------------- annonce de manche

export const ROUND_TITLES: readonly string[] = [
  "Sortez une feuille !",
  "Interro surprise !",
  "Contrôle de mèmes",
  "Devoir sur table",
  "À vos stylos",
  "Épreuve de mème, coefficient 16",
  "TP d'humour appliqué",
  "Rangez vos affaires, gardez vos vannes",
  "Silence, ça cuisine",
  "Nouvelle quête disponible",
  "Tout le monde locked in",
  "Partie suivante, même énergie",
];

export const FIRST_ROUND_TITLES: readonly string[] = [
  "C'est parti !",
  "Première heure : mèmes",
  "On ouvre le bal",
  "Échauffement… noté quand même",
];

export const LAST_ROUND_TITLES: readonly string[] = [
  "Dernière manche : tout se joue ici",
  "Dernière ligne droite",
  "L'épreuve finale",
  "Le boss final",
  "Dernière chance de farmer de l'aura",
];

/** Titre d'annonce de manche (`round` commence à 1). */
export function roundTitle(round: number, totalRounds: number, seed: Seed): string {
  if (totalRounds > 1 && round >= totalRounds) return pickSeeded(LAST_ROUND_TITLES, seed);
  if (round <= 1) return pickSeeded(FIRST_ROUND_TITLES, seed);
  return pickSeeded(ROUND_TITLES, seed);
}

// ---------------------------------------------------------------- podium

export type PodiumRank = 1 | 2 | 3;

export const PODIUM_PHRASES: Readonly<Record<PodiumRank, readonly string[]>> = {
  1: [
    "Major de promo du mème.",
    "Mention très bien, félicitations du jury.",
    "Le trône est à toi. Jusqu'à la revanche.",
    "20 sur 20 en humour, coefficient 16.",
    "Admission directe au panthéon de la classe.",
    "En tête de classe, et pour une fois c'est stylé.",
    "On en parlera encore au self demain.",
    "Aura infinie. Le reste de la classe est cuit.",
    "Masterclass du début à la fin.",
    "GOAT officiel de la classe.",
    "Personnage principal de la partie.",
  ],
  2: [
    "Si près du sommet… Mention bien quand même.",
    "L'argent, c'est bien aussi.",
    "À un mème de la gloire.",
    "En embuscade, juste derrière. La revanche s'annonce.",
    "Vice-major, fierté de la classe.",
    "Presque le boss final. Presque.",
    "+500 aura, et une revanche à prendre.",
    "Gros W, à un cheveu du carnage.",
  ],
  3: [
    "Sur le podium, et c'est mérité.",
    "Le bronze, ça brille aussi.",
    "Troisième marche, vue imprenable.",
    "Mention assez bien, option podium.",
    "Juste ce qu'il faut pour être sur la photo.",
    "Podium validé. Les parents seront fiers.",
    "Petit W, grande classe.",
    "Dans le top 3, tranquille, en mode nonchalant.",
  ],
};

export function podiumPhrase(rank: PodiumRank, seed: Seed): string {
  return pickSeeded(PODIUM_PHRASES[rank], seed);
}

// ---------------------------------------------------------------- le dernier (avec affection)

export const LAST_PLACE_PHRASES: readonly string[] = [
  "L'important, c'est de participer. Et tu as participé très fort.",
  "Humour d'avant-garde : le public finira par comprendre.",
  "En bas du classement, tout en haut dans nos cœurs.",
  "Prix du courage artistique.",
  "La marge de progression la plus prometteuse de la classe.",
  "Les grands comiques ont tous débuté par un bide.",
  "On retient l'audace. Vraiment.",
  "Rattrapage en juillet, on y croit.",
  "Sans toi, le classement n'aurait pas de fondations.",
  "Encouragements du jury, et un gros câlin de la classe.",
  "La revanche, c'est maintenant.",
  "Aura en reconstruction. Le glow up arrive.",
  "C'était la partie 1. La partie 2 sera la bonne.",
  "Personne n'avait la réf, c'est tout.",
  "Quête secondaire accomplie : faire sourire le fond de la salle.",
];

export function lastPlacePhrase(seed: Seed): string {
  return pickSeeded(LAST_PLACE_PHRASES, seed);
}

// ---------------------------------------------------------------- conseils

export const TIPS: readonly string[] = [
  "Le plus court est souvent le plus drôle.",
  "Une blague que toute la classe comprend vaut mieux qu'une blague privée.",
  "On charrie, on n'humilie pas.",
  "Un nom de prof bien placé, et c'est gagné.",
  "La chute, toujours à la fin.",
  "Pense à ce qui s'est passé cette semaine en cours.",
  "Un sticker bien posé vaut dix mots.",
  "Trop de texte tue le mème.",
  "Si ça te fait rire, valide. N'y réfléchis pas trop.",
  "Le détail précis fait rire : « 7 h 58 » est plus drôle que « tôt ».",
  "Pas d'inspiration ? Pioche dans les cartes situation.",
  "Rien ne vient ? Relance ta main de gabarits.",
  "Garde ton joker pour LA bonne idée.",
  "Vote avec ton cœur, pas pour ton voisin.",
  "Les majuscules, c'est comme le piment : avec modération.",
  "Une réf que toute la classe a, c'est un banger assuré.",
  "Un bon « POV : » fait la moitié du travail.",
  "Relis-toi : une faute peut ruiner une chute.",
];

export function tip(seed: Seed): string {
  return pickSeeded(TIPS, seed);
}

// ---------------------------------------------------------------- pseudos rigolos

/** Longueur maximale d'un pseudo (= LIMITS.nameMaxLength du contrat partagé). */
export const NICKNAME_MAX_LENGTH = 16;

const NICK_TITLES = [
  "Boss",
  "Pro",
  "Star",
  "Chef",
  "Génie",
  "Agent",
  "As",
  "Sensei",
  "Légende",
  "Ninja",
  "Fantôme",
  "Pilier",
  "GOAT",
  "Sigma",
  "PNJ",
  "Aura",
];

const NICK_PLACES = [
  "du Self",
  "du CDI",
  "du Fond",
  "du Préau",
  "du Bus",
  "du Foyer",
  "du Wifi",
  "du Retard",
  "du Diapo",
  "du Tableau",
  "du Casier",
  "du Couloir",
  "du QCM",
  "du Brouillon",
  "du 9,5",
  "du Bac Blanc",
  "de la Récré",
  "de la Perm",
  "de la Sieste",
  "de la Colle",
  "des Frites",
  "des Exposés",
  "des Vœux",
  "des Annexes",
  "de l'Oral",
];

const NICK_SOLO = [
  // vie du lycée
  "Sans Stylo",
  "Batterie 1 %",
  "Mode Avion",
  "Hors Sujet",
  "Copie Blanche",
  "Coef 16",
  "Mention Sieste",
  "Radiateur VIP",
  "Trousse Vide",
  "Bip Palier 2",
  "DM Oublié",
  "En Attente",
  "Vœu n° 10",
  "Annexe 3",
  "Ticket de Self",
  "Dr Flemme",
  "Demi-Point",
  "Rattrapage",
  "Feutre Sec",
  "Câble HDMI",
  "Aucun Signal",
  "Erreur Syntaxe",
  "Clé USB Perdue",
  "Sac de 9 Kilos",
  "Team Radiateur",
  "Carnet Perdu",
  "Mardi 8 h",
  "SWOT Vivant",
  "Bilan Équilibré",
  "Stylo 4 Couleurs",
  "Dernier Rang",
  "Chaise Bancale",
  "Presque 10",
  "Seuil Rentable",
  "Plan B",
  // culture internet
  "Aura +1000",
  "Aura Négative",
  "Locked In",
  "Delulu du Bac",
  "Flop Assumé",
  "Banger Officiel",
  "Partie 2 ?",
  "Storytime",
  "Le Lore",
  "Quête Annexe",
  "Speedrun du DM",
  "Six-Sept",
  "Cheh",
  "Feur",
  "Askip",
  "Tkt Je Gère",
  "En Vrai",
  "Vu à 23 h 59",
  "Laissé en Vu",
  "Skill Issue",
  "GG la Classe",
  "Boss Final",
  "Chef Cuistot",
  "Bien Cuit",
  "Green Flag",
  "Red Flag",
  "Ratio",
  "C'est Mid",
  "Brainrot",
  "Nonchalant",
  "Masterclass",
  "Dinguerie",
  "Gênance",
  "Énorme W",
  "Tier S",
  "Glow Up",
  "Pour Toi",
  "Vocal de 4 min",
  "Snap de 7 h 58",
  "Jumpscare",
];

/** Tous les pseudos possibles (≤ 16 caractères, sans doublon). */
export const NICKNAMES: readonly string[] = [
  ...new Set([
    ...NICK_SOLO,
    ...NICK_TITLES.flatMap((t) => NICK_PLACES.map((p) => `${t} ${p}`)),
  ]),
].filter((n) => n.length <= NICKNAME_MAX_LENGTH);

const NICK_SOLO_POOL = NICKNAMES.filter((n) => NICK_SOLO.includes(n));
const NICK_COMBO_POOL = NICKNAMES.filter((n) => !NICK_SOLO.includes(n));

/**
 * Pseudo rigolo pour l'écran d'accueil. `rand` renvoie un nombre dans [0, 1)
 * (`Math.random`, ou `seededRandom(graine)` pour un résultat reproductible).
 */
export function randomNickname(rand: () => number): string {
  const at = (pool: readonly string[]) => {
    const r = rand();
    return pool[Math.min(pool.length - 1, Math.max(0, Math.floor((Number.isFinite(r) ? r : 0) * pool.length)))];
  };
  // moitié pseudos écrits à la main, moitié combinaisons « Titre du Lieu »
  return rand() < 0.5 ? at(NICK_SOLO_POOL) : at(NICK_COMBO_POOL);
}
