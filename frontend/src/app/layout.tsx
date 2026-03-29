import type { Metadata } from "next";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jean-Baptiste Chagnat — Ingénieur Cybersécurité",
  description: "Portfolio de Jean-Baptiste Chagnat, Ingénieur Cybersécurité spécialisé en gestion des vulnérabilités et sécurité des systèmes d'information.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  );
}
