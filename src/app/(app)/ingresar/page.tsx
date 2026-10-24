import type { Metadata } from "next";

import { SignInForm } from "@/features/session";

export const metadata: Metadata = { title: "Entrar | Rentals" };

export default function SignInPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">Entrar</h1>
      <SignInForm />
    </main>
  );
}
