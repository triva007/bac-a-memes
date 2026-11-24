import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/inter";
import "@fontsource-variable/caveat";
import "@fontsource/patrick-hand";
import "@fontsource/anton";
import "@fontsource/special-elite";
import "@fontsource/playfair-display/700.css";
import "@fontsource/playfair-display/900.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bac à Mèmes — le jeu de mèmes de la classe",
  description:
    "Chacun fabrique son mème, tout le monde vote, le plus drôle gagne. À jouer en classe, sur téléphone.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#14132b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full">
      <body className="bg-grid min-h-full flex flex-col">{children}</body>
    </html>
  );
}
