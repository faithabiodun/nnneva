import type { Metadata } from "next";
import { Archivo, Inter } from "next/font/google";

import Nav from "@/components/Nav";

import "./globals.css";

/* Inter carries all body and UI text; it never goes above 23px. */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

/* Display face, standing in for Family at 44-68px. */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nnneva — maternal care coordination for community health programmes",
  description:
    "An AI agent that watches over a community health programme's entire antenatal cohort and surfaces to a health worker only the mothers who actually need a human.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${archivo.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <Nav />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
