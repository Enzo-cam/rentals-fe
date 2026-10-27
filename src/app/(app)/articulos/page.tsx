import type { Metadata } from "next";

import { DEFAULT_ITEM_FILTERS, ItemsScreen } from "@/features/items";

export const metadata: Metadata = { title: "Artículos | Rentals" };

export default function ItemsPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">Artículos</h1>
      <ItemsScreen filters={DEFAULT_ITEM_FILTERS} />
    </main>
  );
}
