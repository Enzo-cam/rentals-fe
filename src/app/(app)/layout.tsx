import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SessionProviders } from "@/features/session";

/** @see docs/architecture.md §8 (INV-FE-03) */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: { children: ReactNode }) {
  return <SessionProviders>{children}</SessionProviders>;
}
