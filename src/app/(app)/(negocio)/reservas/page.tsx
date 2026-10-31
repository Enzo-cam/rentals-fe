import type { Metadata } from "next";

import { BookingsScreen, parseBookingFilters } from "@/features/bookings";

export const metadata: Metadata = { title: "Reservas | Rentals" };

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">Reservas</h1>
      <BookingsScreen filters={parseBookingFilters(await searchParams)} />
    </main>
  );
}
