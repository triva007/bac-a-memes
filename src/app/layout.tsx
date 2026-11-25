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
  applicationName: "Bac à Mèmes",
  appleWebApp: { capable: true, title: "Bac à Mèmes", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    title: "Bac à Mèmes",
    description: "Le jeu de mèmes de la classe : chacun fabrique le sien, tout le monde note.",
    locale: "fr_FR",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // nécessaire pour que env(safe-area-inset-*) vaille quelque chose sur les téléphones à encoche
  viewportFit: "cover",
  themeColor: "#14132b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full">
      <body className="bg-grid min-h-full flex flex-col">{children}</body>
    </html>
  );
}
