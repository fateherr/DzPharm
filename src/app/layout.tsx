import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/dzpharm/providers";

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
        </Providers>
      </body>
    </html>
  );
}
