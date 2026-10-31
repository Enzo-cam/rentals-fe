import type { Metadata } from "next";

import { ItemsScreen, parseItemFilters } from "@/features/items";

export const metadata: Metadata = { title: "Artículos | Rentals" };

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">Artículos</h1>
      <ItemsScreen filters={parseItemFilters(await searchParams)} />
    </main>
  );
}
