import type { Metadata } from "next";

import { BusinessPicker } from "@/features/session";

export const metadata: Metadata = {
  title: "¿Con qué negocio vas a trabajar? | Rentals",
};

export default function SelectBusinessPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">
        ¿Con qué negocio vas a trabajar?
      </h1>
      <BusinessPicker />
    </main>
  );
}
