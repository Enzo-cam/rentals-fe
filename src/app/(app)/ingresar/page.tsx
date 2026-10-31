import type { Metadata } from "next";

import { BrandMark } from "@/components/ui/brand-mark";
import { SignInForm } from "@/features/session";

export const metadata: Metadata = { title: "Entrar | Rentals" };

export default function SignInPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-8">
      <BrandMark className="h-14 w-auto self-start" />
      <h1 className="text-3xl">Entrar</h1>
      <SignInForm />
    </main>
  );
}
