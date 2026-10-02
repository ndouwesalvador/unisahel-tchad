import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "UniSahel — Gestion de la scolarité et des parcours académiques",
  description: "Organisez la structure académique, les dossiers étudiants, les évaluations, les délibérations et les documents de votre établissement avec UniSahel.",
  keywords: ["UniSahel", "gestion universitaire", "scolarité", "étudiants", "notes", "délibérations", "documents académiques"],
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
      <body className="antialiased bg-background text-foreground">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
