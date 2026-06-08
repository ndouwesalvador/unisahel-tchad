import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UniSahel — Plateforme SaaS de Gestion Universitaire Africaine",
  description: "Digitalisez votre université, institut ou école de santé avec UniSahel. Gestion LMD, inscriptions, notes, délibérations, documents officiels, paiements et plus encore. Conçu pour l'Afrique.",
  keywords: ["UniSahel", "gestion universitaire", "LMD", "Afrique", "Sahel", "école de santé", "SaaS", "scolarité", "délibération"],
  authors: [{ name: "UniSahel" }],
  icons: {
    icon: "/logo.svg",
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
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
