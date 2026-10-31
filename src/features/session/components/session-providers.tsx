"use client";

import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { isAccessChanged, isLeavingSession } from "@/api/api-failure";
import { createQueryClient } from "@/api/query-client";
import { ROUTES } from "@/lib/routes";

function makeQueryClient(): QueryClient {
  const client = createQueryClient((failure) => {
    if (isAccessChanged(failure)) {
      void client.invalidateQueries();
      return;
    }
    if (!isLeavingSession(failure)) return;
    client.clear();
    window.location.replace(
      failure.kind === "unauthenticated"
        ? ROUTES.signIn
        : ROUTES.selectBusiness,
    );
  });
  return client;
}

let browserClient: QueryClient | undefined;

/** One client per browser tab, so a re-render never drops the cache; on the server, a new one per render. */
function getQueryClient(): QueryClient {
  if (typeof window === "undefined") return makeQueryClient();
  browserClient ??= makeQueryClient();
  return browserClient;
}

/**
 * A 403 `read_only` or `forbidden` means the role or the state of the business changed, so every query is asked again:
 * `GET /me` for the screens to adapt, and the rest so that what a role no longer sees (a price) does not stay cached.
 * A dead session (`401 unauthenticated`) or a session without a business clears the cache and leaves with a full
 * navigation, so no data of the previous session stays in memory (INV-FE-04).
 */
export function SessionProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={getQueryClient()}>
      {children}
    </QueryClientProvider>
  );
}
