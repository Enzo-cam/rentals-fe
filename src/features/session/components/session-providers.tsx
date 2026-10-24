"use client";

import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { createQueryClient } from "@/api/query-client";
import { ROUTES } from "@/lib/routes";

function makeQueryClient(): QueryClient {
  const client = createQueryClient((failure) => {
    if (failure.kind === "unauthenticated") {
      client.clear();
      window.location.replace(ROUTES.signIn);
    } else if (
      failure.kind === "rejected" &&
      failure.code === "business_not_selected"
    ) {
      client.clear();
      window.location.replace(ROUTES.selectBusiness);
    }
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
