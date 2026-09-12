import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/dzpharm/providers";
import { PwaProvider } from "@/components/dzpharm/pwa-provider";

export const metadata: Metadata = {
  metadataBase: new URL("https://dzpharm.dz/"),
  title: "DzPharm — Référentiel Pharmaceutique Algérien",
  description:
    "Plateforme d'intelligence pharmaceutique algérienne : répertoire officiel de 9 555 médicaments, contrôle d'interactions médicamenteuses, copilote IA et statistiques du marché national.",
  keywords: [
    "DzPharm",
    "médicaments Algérie",
    "nomenclature pharmaceutique",
    "AMM Algérie",
    "interactions médicamenteuses",
    "référentiel pharmaceutique",
  ],
  authors: [{ name: "DzPharm" }],
  manifest: "/manifest.webmanifest",
  applicationName: "DzPharm",
  openGraph: {
    title: "DzPharm — Référentiel Pharmaceutique Algérien",
    description:
      "Plateforme d'intelligence pharmaceutique algérienne : répertoire officiel de 9 555 médicaments, contrôle d'interactions médicamenteuses, copilote IA et statistiques du marché national.",
    locale: "fr_DZ",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DzPharm",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

/**
 * Données structurées schema.org (audit 1.6 / P13 — JSON-LD).
 * Déclarations factuelles uniquement : pas de note, d'éditeur inventé
 * ni d'aggregateRating. Une seule page publique (SPA à la racine).
 */
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://dzpharm.dz/#website",
      url: "https://dzpharm.dz/",
      name: "DzPharm",
      description:
        "Plateforme d'intelligence pharmaceutique algérienne : répertoire officiel de 9 555 médicaments, contrôle d'interactions médicamenteuses, copilote IA et statistiques du marché national.",
      inLanguage: "fr",
    },
    {
      "@type": "MedicalWebPage",
      "@id": "https://dzpharm.dz/#webpage",
      url: "https://dzpharm.dz/",
      name: "DzPharm — Référentiel Pharmaceutique Algérien",
      about: "nomenclature pharmaceutique algérienne",
      inLanguage: "fr",
      audience: {
        "@type": "MedicalAudience",
        audienceType: "pharmacien",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className="font-sans antialiased bg-background text-foreground"
      >
        <Providers>
          {children}
          <Toaster />
          <PwaProvider />
        </Providers>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </body>
    </html>
  );
}
