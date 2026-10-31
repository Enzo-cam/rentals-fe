import type { Metadata } from "next";

import { AccountSummary } from "@/features/session";

export const metadata: Metadata = { title: "Tu cuenta | Rentals" };

export default function AccountPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">Tu cuenta</h1>
      <AccountSummary />
    </main>
  );
}
