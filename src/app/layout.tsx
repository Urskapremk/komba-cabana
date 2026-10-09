import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const sourceSans = Source_Sans_3({
  variable: "--font-source",
  subsets: ["latin", "latin-ext"],
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Kalkulacije cen · Komba Cabana",
  description:
    "Primerjava izhodiščnih cen 2026 in predloga Optima Plus za 2027. Cene bungalovov Komba Cabana urejaš v tabelah.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="sl"
      className={`${sourceSans.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
