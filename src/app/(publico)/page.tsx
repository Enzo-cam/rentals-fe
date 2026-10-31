import type { Metadata } from "next";

import { BrandMark } from "@/components/ui/brand-mark";
import { ApiStatus } from "@/features/health";

export const dynamic = "force-dynamic";

/** noindex and no canonical, sitemap or robots on purpose until the landing exists. */
export const metadata: Metadata = {
  title: "Rentals: estado del sistema",
  description:
    "Rentals, el sistema para negocios que alquilan cosas para eventos. Esta página muestra si la API está respondiendo.",
  robots: { index: false, follow: false },
};

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-8">
      <BrandMark className="h-14 w-auto self-start" />
      <h1 className="text-3xl">Rentals</h1>
      <ApiStatus />
    </main>
  );
}
