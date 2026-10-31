import type { Metadata } from "next";

import { BookingDetail } from "@/features/bookings";

export const metadata: Metadata = { title: "Reserva | Rentals" };

export default async function BookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">Reserva</h1>
      <BookingDetail id={id} />
    </main>
  );
}
