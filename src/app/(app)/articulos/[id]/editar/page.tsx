import type { Metadata } from "next";

import { EditItemScreen } from "@/features/items";

export const metadata: Metadata = { title: "Editar artículo | Rentals" };

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">Editar artículo</h1>
      <EditItemScreen id={id} />
    </main>
  );
}
