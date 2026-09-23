import type { Metadata } from "next";
import { Inter, Noto_Sans_Arabic, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/dzpharm/providers";
import { PwaProvider } from "@/components/dzpharm/pwa-provider";

/**
 * QW-01 — Webfonts via next/font/google (audit §04 P1-01).
 * Inter (latin UI), Noto Sans Arabic (Arabic brand/DCI names, Darija),
 * JetBrains Mono (dosages, AMM codes, reg numbers).
 * `display: 'swap'` prevents FOIT; variable fonts keep payload to 1 file each.
 * Feature flag NEXT_PUBLIC_FEATURE_WEBFONTS defaults ON (rollback if LCP regresses).
 */
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});
const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-noto-arabic",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

const webfontsOn = process.env.NEXT_PUBLIC_FEATURE_WEBFONTS !== "false";
const webfontClassName = webfontsOn
  ? `${inter.variable} ${notoSansArabic.variable} ${jetbrainsMono.variable}`
  : "";

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
    <html lang="fr" suppressHydrationWarning className={webfontClassName}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var valid=['porcelain','nordic-linen','zinc-studio','sage-botanical','french-cobalt','sahara-cedar','braun-mineral','polar-indigo','mediterranean-azure','ivory-emerald','design-brutalist','design-liquid-glass','design-compact-dense','design-soft-pebble','design-flat-architect','design-monochrome-braun','design-volumetric-card','design-high-contrast','design-telemetry-hud','design-paper-codex'];var p=localStorage.getItem('dzpharm_palette');var id=valid.includes(p)?p:'porcelain';document.documentElement.setAttribute('data-palette',id);var dm=localStorage.getItem('dzpharm_design_mode');if(dm==='botanique'){document.documentElement.setAttribute('data-design-mode','botanique');}else{document.documentElement.setAttribute('data-design-mode','standard');}}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className="font-sans antialiased bg-background text-foreground"
      >
        <Providers>
          {children}
          <Toaster />
          <PwaProvider />
          {/* P1-08 — Global aria-live region for status announcements.
              Screen readers monitor this region and announce changes. Used for
              non-urgent notifications (e.g. "Référentiel mis à jour", "Mode
              hors-ligne actif"). Polite — never interrupts. The Copilot thinking/
              responded + search result-count regions live in their components. */}
          <div
            id="dzpharm-status-live"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
          />
        </Providers>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </body>
    </html>
  );
}
