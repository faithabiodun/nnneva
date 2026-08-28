import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";

import "./globals.css";

/**
 * Manrope carries everything. One family, two weights in practice (500 for
 * interface text, 600 for headings) — the brief asks for a restrained set, and
 * Manrope's tight apertures hold up at the 92px display sizes without needing a
 * second display face.
 */
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Nnneva — maternal care coordination",
    template: "%s · Nnneva",
  },
  description:
    "An AI agent that watches over a community health programme's entire antenatal cohort — tracking who is due, who has fallen out of care, and who has just reported something that cannot wait — and surfaces to a human health worker only the mothers who actually need a human.",
};

export const viewport: Viewport = {
  themeColor: "#052c2c",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={manrope.variable}>
      <body>{children}</body>
    </html>
  );
}
