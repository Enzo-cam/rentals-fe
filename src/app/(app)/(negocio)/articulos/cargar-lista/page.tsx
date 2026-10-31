import type { Metadata } from "next";

import { ItemImportScreen } from "@/features/items";

export const metadata: Metadata = { title: "Cargar lista | Rentals" };

export default function ImportItemsPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">Cargar lista</h1>
      <ItemImportScreen />
    </main>
  );
}
