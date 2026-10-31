import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import "./globals.css";

/** Bricolage Grotesque, la única familia de la marca (docs/brand.md): un archivo variable, del 400 al 800. */
const bricolage = localFont({
  src: "./fonts/bricolage-grotesque-latin.woff2",
  variable: "--font-sans",
  weight: "400 800",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rentals",
  description:
    "Rentals: sistema para negocios que alquilan cosas para eventos.",
};

/** El bosque de la marca tiñe la barra del navegador del celular. */
export const viewport: Viewport = { themeColor: "#10291F" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={bricolage.variable}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
