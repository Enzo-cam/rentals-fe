import type { Metadata } from "next";

import { NewBookingScreen } from "@/features/bookings";

export const metadata: Metadata = { title: "Nueva reserva | Rentals" };

export default function NewBookingPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">Nueva reserva</h1>
      <NewBookingScreen />
    </main>
  );
}
