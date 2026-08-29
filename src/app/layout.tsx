import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/dzpharm/providers";
import { PwaProvider } from "@/components/dzpharm/pwa-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
          <Toaster />
          <PwaProvider />
        </Providers>
      </body>
    </html>
  );
}
