import type { Metadata, Viewport } from "next";
import { Outfit, Playfair_Display } from "next/font/google";

import "./globals.css";
import { NoDrag } from "@/components/NoDrag";

/* Outfit carries all interface text; Playfair carries display sizes. */
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Nnneva — your maternal-care agent",
    template: "%s · Nnneva",
  },
  description:
    "Nnneva takes the repetitive coordination work out of pregnancy — remembering context, turning goals into tasks and reminders, and knowing when a decision belongs to a professional.",
};

export const viewport: Viewport = {
  themeColor: "#fbf7f4",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${outfit.variable} ${playfair.variable}`} suppressHydrationWarning>
      <head>
        {/* Runs before paint: without it a dark-mode reader gets a white flash
            on every navigation, which at night is genuinely unpleasant. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("nnneva_theme");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t)}catch(e){}`,
          }}
        />
      </head>
      <body>
        <NoDrag />
        {children}
      </body>
    </html>
  );
}
