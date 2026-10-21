import type { Metadata } from "next";
import { Geist } from "next/font/google";

import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Rentals",
  description:
    "Rentals: sistema para negocios que alquilan cosas para eventos.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={geist.variable}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
