# Gabarits de mèmes — mode d'emploi

Un mème n'est jamais une image : c'est `{ templateId, values, stickers }`. Chaque gabarit est un
composant React dessiné dans un **canevas virtuel de 1000 px de large** (hauteur 560 à 1400) que
`MemeView` met à l'échelle. Tout se mesure donc en px du canevas : à 340 px de large sur téléphone,
1 px écran ≈ 3 px canevas.

Contrat : `types.ts` (ne pas modifier). Registre : `index.ts`. Kit : `@/components/meme/kit`.

## Anatomie d'un gabarit

Un fichier par gabarit : `library/<catégorie>/<id>.tsx`, export par défaut = `MemeTemplate`.

```tsx
import type { MemeTemplate } from "../../types";
import { Blackboard, Classroom, Emo, SchoolDesk, T, WallClock } from "@/components/meme/kit";
import { C } from "@/components/meme/palette"; // constantes : OK au niveau module

function Render() {
  return (
    <>
      {/* 1. décor : remplit tout le canevas */}
      <Classroom w={1000} h={1000} floorY={0.68} />
      {/* 2. conteneur = repère local : les enfants se placent depuis SON coin haut-gauche */}
      <Blackboard x={50} y={46} w={760} h={420}>
        <T id="tableau" x={26} y={20} w={672} h={344} font="hand2" color={C.chalk} max={104} min={44} />
      </Blackboard>
      <WallClock x={846} y={56} size={118} time="08:02" />
      {/* 3. acteurs : l'emoji AVANT le meuble qui le masque en partie */}
      <Emo id="melting-face" x={92} y={452} size={360} />
      <SchoolDesk x={30} y={742} w={490} />
      {/* 4. légende de mème classique : blanc, contour noir, majuscules */}
      <T id="bas" x={40} y={806} w={920} h={176} font="meme" max={88} min={40} upper outline valign="bottom" />
    </>
  );
}

const template: MemeTemplate = {
  id: "interro-surprise", // kebab-case, unique, DÉFINITIF (les parties en cours le référencent)
  name: "L'annonce au tableau",
  category: "reactions", // reactions | ecole | ecrans | cases | affiches
  width: 1000,
  height: 1000,
  fields: [
    { id: "tableau", label: "Écrit au tableau", placeholder: "Interro surprise, sortez une feuille", maxLength: 70 },
    { id: "bas", label: "Légende du bas", placeholder: "Moi qui ai révisé le mauvais chapitre", maxLength: 80 },
  ],
  Render,
};
export default template;
```

Puis dans `index.ts` : un `import` + une ligne dans `TEMPLATES` (au-dessus des lots).

### Règles dures

- **Pas de `"use client"`, pas de hooks** dans un fichier de gabarit (le serveur importe le registre).
- Le kit est un module client : **n'utiliser ses exports que dans le JSX de `Render`**, jamais au
  niveau module (`const X = <Emo/>` ou `FONT.meme` hors de `Render` casserait l'import côté serveur).
  Les constantes `C` (couleurs), `FONT`, `CANVAS_W` viennent de `@/components/meme/palette`.
- Uniquement des px du canevas (pas de `vw`, `rem`, `%` de fenêtre). Rien d'aléatoire, pas de `Date`.
- Images : `/emoji/<id>.webp` via `<Emo>` + SVG/CSS originaux. Aucune marque, aucun logo, aucune
  personne réelle, aucun personnage ou mème existant ; interfaces génériques.
- 1 à 5 champs. Tout le reste du décor est pré-rempli et drôle en soi.

## API du kit (`@/components/meme/kit`)

### Cœur

| Composant | Rôle |
| --- | --- |
| `<T id … />` | Texte d'un **champ**, taille de police ajustée automatiquement à la boîte. |
| `<T text="…" … />` | Même moteur d'ajustement pour un texte **fixe** du décor. |
| `<Txt size … >texte</Txt>` | Texte fixe simple, sans ajustement (étiquettes, en-têtes). |
| `<Emo id … />` | Emoji 3D positionné. |
| `<Box … />` | Rectangle absolu (fond, bordure, rayon, ombre, `clip`), repère local. |
| `<IfField id [not]>` | Affiche ses enfants seulement si le champ affiche quelque chose (habillage d'un champ optionnel). |
| `useField(id)` / `useMeme()` | Hooks pour écrire de NOUVEAUX composants de kit (pas dans un gabarit). |

`T` — props : `id | text`, `x y w h` (boîte), `font` (`meme` Anton · `display` Bricolage · `sans`
Inter · `hand` Caveat · `hand2` Patrick Hand · `type` Special Elite · `news` Playfair), `max` / `min`
(taille de police, défauts `min(h, 96)` / `30`), `align` (`center` par défaut), `valign`, `upper`,
`color`, `weight`, `italic`, `lh`, `ls`, `outline` (contour de légende : `true` = noir, ou une
couleur), `outlineWidth`, `mark` (fond collé au texte ligne par ligne : surligneur, sous-titres),
`shadow`, `nowrap` (une seule ligne), `rotate`, `flow` (voir ci-dessous), `z`, `style`.

Comportement : plus grande taille entre `min` et `max` qui tient sans couper de mot ; sinon coupe
les mots interminables ; en dernier recours descend jusqu'à `0,6 × min` puis coupe proprement.
Champ vide : placeholder estompé en mode `edit`, **rien** en mode `final`. Le champ actif reçoit un
liseré pointillé vert. Recalcul au changement de texte et au chargement des polices.

`flow` : la boîte épouse le texte au lieu d'être posée en absolu (`w`/`h` = maximums). Pour les
bulles de messagerie, étiquettes, commentaires — à placer dans un conteneur flex.

`Emo` — `id`, `x y`, `size`, `rotate`, `flip`, `shadow` (`"drop"` par défaut, `"ground"`, `"glow"`,
`false`), `opacity`, `filter`, `inline`, `z`. Liste des ids et libellés français :
`src/lib/content/emoji-data.json`.

### Décors (`kit-decors`) — tous paramétriques en `x y w h`

`Classroom`, `Corridor`, `Canteen`, `Yard`, `Gym`, `BedroomNight` (`clock`, `lamp`), `Bus`,
`CpeOffice` (`label`), `ExamHall` (`time`, `sign`), et la pièce générique `Room` (`wall`, `band`,
`floor`, `floorColors`, `light`, `vignette`). `floorY` = ligne de sol en fraction de `h`.
Mobilier : `Blackboard` (`color`, enfants posés sur l'ardoise, surface = `w−36 × h−36`),
`SchoolDesk`, `WallClock` (`time`), `Window` (`sky`), `Lockers`, `WoodTable` (plateau vu de dessus).

Astuce : une scène passe en noir et blanc / sombre en l'enveloppant dans
`<Box style={{ filter: "grayscale(1) brightness(.7)" }}>`.

### Formats papier (`kit-formats`)

`Paper`, `Seyes` (`cell`, `margin`, `holes`), `CopieDouble`, `Bubble` (`kind="speech"|"thought"`,
`tail`), `PostIt`, `Tape`, `Pin`, `Stamp` (`text`, `sub`), `RedCircle`, `Underline`, `Ribbon`,
`Sunburst`, `Halftone`, `Vignette`, `Confetti`.
Stylo : `font="hand"` + `C.bluePen` / `C.redPen` / `C.greenPen` ; craie : `font="hand2"` + `C.chalk`.

### Faux écrans (`kit-ui`) — génériques, sans marque

`StatusBar`, `Phone`, `ChatHeader`, `ChatColumn` (messages collés en bas, le trop-plein disparaît en
haut), `ChatBubble` (`side`, `id | text`, `name | nameId`, `avatar`, `time`, `checks`), `ChatNote`,
`ChatInput`, `Notif`, `VideoUI` (habillage de vidéo verticale : colonne d'actions de 130 px à
droite), `Comment` (`pinned`, `bubble`, `likes`), `LiveBadge`, `NewsBanner` (bandeau d'info, enfants
dans le bandeau blanc), `TierRow`, `Badge`, `Gauge`, `StatBar`, `Avatar`, `Icon` (30 pictos maison).

Pour voir toutes ces briques rendues : `/dev/gabarits?section=decors`.

## Check-list qualité

- [ ] Lisible à **340 px** : texte de joueur ≥ 40 px canevas quand il est court (`min` ≥ 30), décor
      pré-rempli important ≥ 28 px, peu de mots. Lisible aussi au vidéoprojecteur.
- [ ] Les 3 états de la galerie sont propres : vide (placeholders), court, très long — aucun
      débordement, aucun chevauchement, rien de coupé.
- [ ] `maxLength` réaliste : le texte le plus long doit rester ≥ ~34 px canevas dans sa boîte.
- [ ] Placeholders = vrais exemples drôles et bon enfant (ils donnent le ton), sans nom de personne
      réelle ni de marque. `kind: "name"` sur les champs qui attendent un nom, `kind: "note"` pour
      une note, `optional: true` si le mème tient sans.
- [ ] Champ optionnel vide en mode `final` : son habillage disparaît aussi (`IfField`).
- [ ] Le gabarit ressemble au vrai objet (un bulletin à un bulletin, une messagerie à une messagerie).
- [ ] Profondeur : fond + sujet + premier plan, ombres, pas d'aplat triste.
- [ ] `npx tsc --noEmit` et `npx eslint src/lib/templates` sans erreur ; console du navigateur vide.

## Tester dans la galerie de dev

`http://localhost:3102/dev/gabarits` (serveur de dev déjà lancé par l'équipe).

| URL | Effet |
| --- | --- |
| `?only=mon-id,autre-id` | n'affiche que ces gabarits (340 px et 700 px côte à côte) |
| `?cat=ecole` | une catégorie |
| `?fill=vide` \| `court` \| `long` | état de remplissage initial (boutons en haut de page aussi) |
| `?sheet=1` | planche contact : les 3 états côte à côte à 340 px (idéal pour une capture) |
| `?section=decors` \| `stickers` \| `perso` \| `perf` | briques du kit, stickers + export, pack perso, 20 mèmes |

La carte de chaque gabarit signale en rouge : id pas en kebab-case, hauteur hors bornes, nombre de
champs hors 1–5, ids en double. Capture Playwright : `page.locator('[data-tpl="mon-id"]').screenshot()`.
