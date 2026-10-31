import type { Metadata } from "next";

import {
  AvailabilityScreen,
  parseAvailabilityFilters,
} from "@/features/availability";

export const metadata: Metadata = { title: "Disponibilidad | Rentals" };

export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">Disponibilidad</h1>
      <AvailabilityScreen
        filters={parseAvailabilityFilters(await searchParams)}
      />
    </main>
  );
}
