import type { Metadata } from "next";

import { CustomersScreen, parseCustomerFilters } from "@/features/customers";

export const metadata: Metadata = { title: "Clientes | Rentals" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">Clientes</h1>
      <CustomersScreen filters={parseCustomerFilters(await searchParams)} />
    </main>
  );
}
