import type { Metadata } from "next";

import { DefinePasswordForm } from "@/features/session";

export const metadata: Metadata = {
  title: "Definí tu contraseña | Rentals",
  referrer: "no-referrer",
};

export default function DefinePasswordPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">Definí tu contraseña</h1>
      <DefinePasswordForm />
    </main>
  );
}
