import type { Metadata } from "next";

import { EditBookingScreen } from "@/features/bookings";

export const metadata: Metadata = { title: "Editar reserva | Rentals" };

export default async function EditBookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">Editar reserva</h1>
      <EditBookingScreen id={id} />
    </main>
  );
}
