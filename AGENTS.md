<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Bac à Mèmes — conventions du projet

Jeu de mèmes multijoueur en français pour une classe de lycée (téléphones + écran de classe).
Jeu ORIGINAL : aucun nom, image, personnage ou habillage repris d'un jeu ou d'un mème existant.

- Contrats partagés (ne pas modifier sans accord) : `src/lib/game/types.ts`, `src/lib/templates/types.ts`.
- Charte graphique : `src/app/globals.css` (tokens Tailwind v4 `@theme`, classes `.card`, `.btn`, `.field`, `.paper-seyes`, `.hl`).
  Polices déjà chargées dans `src/app/layout.tsx` via `@fontsource` (pas de `next/font/google` : pas d'accès réseau au build local).
- Images : uniquement `/public/emoji/*.png` (Fluent Emoji 3D, MIT) + SVG/CSS originaux. Pas d'import de photos par les joueurs.
- Tout le texte visible est en français, ton lycéen, drôle mais bon enfant (on charrie, on n'humilie pas).
- Mobile d'abord (360 px de large), cibles tactiles ≥ 44 px, champs de saisie en 16 px mini.
- Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4. Lire `node_modules/next/dist/docs/` en cas de doute sur une API.
- Stockage serveur : pas de base de données ; voir `src/lib/game/store.ts`.
- Vérifier avant de rendre : `npx tsc --noEmit` et `npm run lint` sans erreur.
