import type { Metadata } from "next";

import { ItemDetail } from "@/features/items";

export const metadata: Metadata = { title: "Artículo | Rentals" };

export default async function ItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">Artículo</h1>
      <ItemDetail id={id} />
    </main>
  );
}
