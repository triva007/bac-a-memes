/**
 * CONTRAT PARTAGÉ — gabarits de mèmes
 * ------------------------------------------------------------------
 * Un gabarit est un composant React dessiné dans un canevas VIRTUEL de
 * taille fixe (width × height, en px CSS). `MemeView` le met à l'échelle
 * avec un transform CSS pour remplir son conteneur : le rendu est donc
 * identique sur tous les écrans, et un mème n'est que du JSON.
 *
 * RÈGLES pour les fichiers de gabarits :
 *  - PAS de "use client" et PAS de hooks dans les fichiers de gabarits
 *    (le serveur importe le registre pour lire ids/champs). Tout ce qui a
 *    besoin de hooks vit dans le kit (`src/components/meme/kit.tsx`).
 *  - Dessiner uniquement en px dans le canevas virtuel (pas de vw/vh/rem).
 *  - Images : uniquement /emoji/*.webp (Fluent Emoji 3D, licence MIT) et
 *    du SVG/CSS original. Aucune image de mème connue, aucune marque.
 */
import type { ComponentType } from "react";

export type CategoryId =
  /** scènes de réaction (emojis expressifs dans un décor) */
  | "reactions"
  /** formats scolaires détournés : bulletin, copie, carnet, tableau... */
  | "ecole"
  /** faux écrans : conversation de groupe, notification, story, recherche... */
  | "ecrans"
  /** formats à plusieurs cases : avant/après, attentes/réalité, escalade... */
  | "cases"
  /** affiches, unes de journal, panneaux, avis de recherche... */
  | "affiches";

export const CATEGORIES: { id: CategoryId; label: string; emoji: string }[] = [
  { id: "reactions", label: "Réactions", emoji: "face-with-tears-of-joy" },
  { id: "ecole", label: "Au lycée", emoji: "school" },
  { id: "ecrans", label: "Écrans", emoji: "mobile-phone" },
  { id: "cases", label: "En cases", emoji: "bar-chart" },
  { id: "affiches", label: "Affiches", emoji: "newspaper" },
];

export interface TemplateField {
  id: string;
  /** libellé court affiché au-dessus du champ dans l'éditeur, ex. "Texte du haut" */
  label: string;
  /** exemple grisé affiché dans le champ ET dans l'aperçu tant que c'est vide */
  placeholder: string;
  maxLength: number;
  multiline?: boolean;
  /** si vrai, le mème est valide même si ce champ est vide */
  optional?: boolean;
  /** type de contenu attendu : sert à proposer les noms en un tap dans l'éditeur */
  kind?: "text" | "name" | "note";
}

export interface TemplateRenderProps {
  values: Record<string, string>;
  /**
   * "edit" : les champs vides affichent leur placeholder en grisé.
   * "final" : les champs vides n'affichent rien.
   */
  mode: "edit" | "final";
  /** champ en cours d'édition (pour le surligner dans l'aperçu), sinon null */
  activeField?: string | null;
}

export interface MemeTemplate {
  id: string;
  /** nom affiché dans le sélecteur, ex. "Le bulletin" */
  name: string;
  category: CategoryId;
  /** largeur du canevas virtuel — toujours 1000 */
  width: 1000;
  /** hauteur du canevas virtuel, entre 560 et 1400 */
  height: number;
  fields: TemplateField[];
  Render: ComponentType<TemplateRenderProps>;
}
