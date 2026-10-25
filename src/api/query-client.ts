import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

import { failureOf, type ApiFailure } from "./api-failure";

/**
 * `onFailure` sees every failed query and mutation, so a dead session is handled in one place.
 * A query is retried once, and only when the failure is the network or a 5xx; mutations are never retried
 * (docs/architecture.md §4).
 */
export function createQueryClient(onFailure: (failure: ApiFailure) => void) {
  const report = (error: unknown) => {
    const failure = failureOf(error);
    if (failure) onFailure(failure);
  };
  return new QueryClient({
    queryCache: new QueryCache({ onError: report }),
    mutationCache: new MutationCache({ onError: report }),
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          const failure = failureOf(error);
          return (
            failureCount < 1 &&
            (failure?.kind === "network" || failure?.kind === "unavailable")
          );
        },
      },
      mutations: { retry: false },
    },
  });
}
