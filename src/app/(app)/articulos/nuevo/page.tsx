import type { Metadata } from "next";

import { NewItemScreen } from "@/features/items";

export const metadata: Metadata = { title: "Nuevo artículo | Rentals" };

export default function NewItemPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">Nuevo artículo</h1>
      <NewItemScreen />
    </main>
  );
}
