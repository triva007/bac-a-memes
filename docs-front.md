# Brief commun aux agents « écrans » — Bac à Mèmes

Jeu de mèmes multijoueur ORIGINAL, en français, pour une classe de terminale (≈30 joueurs sur téléphone + un écran de classe au vidéoprojecteur). Chacun fabrique un mème à partir d'un gabarit qu'il choisit, tout le monde note chaque mème, classement, podium.

## À lire avant de coder
- `AGENTS.md` (conventions), `src/app/globals.css` (charte : tokens, `.card`, `.btn`, `.btn-pink|green|blue|paper|ghost|sm`, `.field`, `.paper-seyes`, `.hl`, `.bg-grid`, polices `font-display`, `--font-hand`, `--font-meme`…).
- `src/lib/game/types.ts` : LE contrat (vue `RoomView`, actions, limites, `VOTE_OPTIONS`, pack perso). Ne pas le modifier.
- `src/features/game/props.ts` (`PhaseProps`, `GameApi`), `src/features/game/useRoom.ts` (`useRoom`, `useCountdown`, `createRoom`, `roomExists`), `src/features/game/session.ts`. Déjà écrits, ne pas les modifier (si un manque te bloque, signale-le dans ton rapport et contourne localement).
- Mèmes : `src/components/meme/MemeView.tsx` (`MemeView`, `TemplateThumb`, `exportMemePng`, `memeToPngBlob`), `src/components/meme/perso.tsx` (`PersoImagesProvider`, `isPersoTemplateId`), `src/lib/templates/index.ts` (`TEMPLATES`, `getTemplate`, `getMemeFields`), `src/lib/templates/types.ts` (`CATEGORIES`). Un autre agent est encore en train d'ajouter des gabarits : n'y touche pas, le registre grossit tout seul.
- Contenu prêt à l'emploi : `src/lib/content/emoji-lite.ts` (`emojiUrl`, `AVATARS`, `STICKER_GROUPS`), `src/lib/content/emoji.ts` (recherche — lourd, à charger avec `await import()`), `src/lib/content/phrases.ts` (phrases d'ambiance déterministes : `lobbyPhrase`, `creatingPhrase`, `revealPhrase`, `revealRatio`, `roundTitle`, `podiumPhrase`, `lastPlacePhrase`, `tip`, `rotatingSeed`, `randomNickname`…), `src/lib/sfx.ts` (`sfx.play(name, intensity?)`, `sfx.isMuted/toggleMuted/subscribe`), `src/components/ui/Emoji.tsx` (`<Emoji id size />`).

## Comportements du serveur à connaître
- Modèle : le client interroge le serveur ~1 fois/s ; `view` change quand `version` change. Les écrans sont des fonctions pures de `view` + un peu d'état local. Les minuteurs se lisent avec `useCountdown(view.phaseEndsAt, api)`.
- Toutes les actions sont idempotentes ; `api.send` réessaie seul sur coupure réseau et rejette avec `{ error, message }` sinon (`message` est en français, affichable).
- Ne pas comparer `create.myMeme` à ce qu'on a envoyé (le serveur nettoie/coupe) : se fier à `create.submitted` et `vote.myVote`.
- `create.hands` vide alors que `me` est non nul = joueur arrivé en cours de manche : il joue à la manche suivante (un `submit` renverrait `bad_phase`).
- `players[]` contient aussi les joueurs partis (`connected: false`). `players[].score` n'inclut pas le mème en cours de vote.
- En phase vote, afficher les compteurs `vote.votedCount` / `vote.votersCount` (ne pas compter les `done`).
- `skip` (hôte) est ignoré si la phase a commencé il y a moins de 1,5 s ; ne pas le renvoyer en boucle. `removeMeme` (hôte) accepte n'importe quel mème de la partie. `kick` retire aussi les mèmes du joueur.
- Mode "meme-image" : `create.forcedTemplateId` imposé, joker refusé. Mode "theme" : `create.theme` imposé à tous.
- Le joker : envoyer `usedJoker: true` avec `draft`/`submit` quand le gabarit choisi ne vient pas d'une main ; `me.jokersLeft` est décompté une seule fois par manche et rendu si le joueur revient à un gabarit de sa main.
- Pack perso : `view.images`, gabarit `perso:<id>`, champs via `getMemeFields(templateId)` ; envelopper l'arbre avec `<PersoImagesProvider code={view.code} images={view.images}>` pour que `MemeView` sache les afficher (c'est le shell de la page de jeu qui le fait ; l'écran de classe le fait aussi).
- Après un `leave` volontaire, la session locale est effacée par `api.leave()`.

## Organisation (plusieurs agents en parallèle dans le même dossier)
- Tu ne modifies QUE les fichiers listés dans ta mission. Aucune commande git. Pas de `next build`.
- Un serveur de dev tourne déjà : http://localhost:3102 (rechargement à chaud). Ne le tue jamais, n'en lance pas un deuxième. S'il ne répond pas : attends 20 s et réessaie ; s'il est toujours mort au bout d'une minute, relance-le en arrière-plan avec `npx next dev -p 3102`.
- Une erreur de compilation passagère peut venir du fichier d'un autre agent : attends et réessaie, ne corrige pas les fichiers des autres (signale-le dans ton rapport si ça persiste).
- Composants partagés : l'agent « accueil et salon » crée en parallèle des primitives dans `src/components/ui/` ; tu ne peux pas compter dessus. Crée ce dont tu as besoin dans TON dossier.
- Robots de test (indispensables pour atteindre ta phase) : `node scripts/bots.mjs --code ABCD --n 6` (des robots rejoignent ta salle et jouent seuls) ou `node scripts/bots.mjs --create --n 8` (crée une salle animée par des robots, affiche le code, relance des parties en boucle). Options en tête du fichier (`--submit-after`, `--vote-after`, `--mode`, `--rounds`, `--create-seconds`, `--vote-seconds`…). Lance-les en arrière-plan et arrête-les à la fin.

## Exigence de qualité
- Mobile d'abord : 360×640 et 390×844 ; aussi 1280×800. Hauteurs en `dvh`, marges de sécurité (`env(safe-area-inset-*)`), cibles tactiles ≥ 44 px, champs en 16 px mini, rien qui déborde horizontalement, pas de saut de mise en page.
- Style : celui de la charte, assumé — encre nuit, cartes papier à bord épais et ombre dure, surligneurs fluo, légères rotations, typographie display très grasse. Ludique, net, lisible. Pas de dégradés violets génériques, pas d'UI « dashboard ».
- Du mouvement utile avec `motion` (`import { motion, AnimatePresence } from "motion/react"`), respect de `prefers-reduced-motion`. Des sons aux bons moments via `sfx`.
- Textes en français, ton lycéen, drôles mais bon enfant ; tutoiement ; libellés de boutons clairs.
- Accessibilité de base : vrais `<button>`, `aria-label` sur les boutons-icônes, focus visibles, contrastes corrects.
- VÉRIFIE VISUELLEMENT : pilote une vraie partie avec Playwright (pré-installé : `require('playwright')`, `chromium.launch()` sans option, `deviceScaleFactor: 1`) + les robots, capture chaque état de tes écrans aux tailles ci-dessus et REGARDE les captures avec l'outil Read. Corrige ce qui est laid, mal aligné, tronqué ou confus, puis recapture. Vérifie la console (aucune erreur, aucun avertissement React).
- Fini quand : `npx tsc --noEmit` sans erreur, `npx eslint <tes dossiers>` sans erreur, états vérifiés en captures. Rapport final concis : fichiers, ce qui est vérifié, ce qui ne l'est pas, problèmes rencontrés hors de ton périmètre.
