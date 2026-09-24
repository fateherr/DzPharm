import type { Metadata } from "next";
import { Inter, Noto_Sans_Arabic, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/dzpharm/providers";
import { PwaProvider } from "@/components/dzpharm/pwa-provider";
import { AnalyticsProvider } from "@/components/dzpharm/analytics-provider";
import { ErrorBoundary } from "@/components/dzpharm/error-boundary";
import { PLATFORM_STATS, formatAmmCount } from "@/lib/constants/stats";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const notoArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  display: "swap",
  variable: "--font-noto-arabic",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

const defaultDescription =
  `Plateforme d'intelligence pharmaceutique algérienne : répertoire officiel de ${formatAmmCount(PLATFORM_STATS.TOTAL_DRUGS)} médicaments, contrôle d'interactions médicamenteuses, copilote IA et statistiques du marché national.`;

export const metadata: Metadata = {
  metadataBase: new URL("https://dzpharm.dz/"),
  title: "DzPharm — Référentiel Pharmaceutique Algérien",
  description: defaultDescription,
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
    description: defaultDescription,
    locale: "fr_DZ",
    type: "website",
    url: "https://dzpharm.dz/",
    siteName: "DzPharm",
  },
  twitter: {
    card: "summary_large_image",
    title: "DzPharm — Référentiel Pharmaceutique Algérien",
    description: defaultDescription,
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
      description: defaultDescription,
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
    <html
      lang="fr"
      className={`${inter.variable} ${notoArabic.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
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
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
          <AnalyticsProvider />
          <Toaster />
          <PwaProvider />
          {/* P1-08 — Global aria-live region for non-urgent status announcements */}
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
