import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bac à Mèmes",
    short_name: "Bac à Mèmes",
    description: "Le jeu de mèmes de la classe : chacun fabrique le sien, tout le monde note.",
    lang: "fr",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#14132b",
    theme_color: "#14132b",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
