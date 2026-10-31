import { skipToken, useInfiniteQuery } from "@tanstack/react-query";

import { availabilityKeys } from "../api/keys";
import { listAvailability } from "../api/requests";
import type { AvailabilityFilters } from "../types";

/**
 * It asks only with a complete period (`skipToken` leaves the query disabled otherwise). The availability is always
 * asked again and never updated by hand: `staleTime: 0` (docs/architecture.md §4.3). The cursors live in the page
 * params and not in the URL: after a reload the list starts again at the first page.
 */
export function useAvailability(filters: AvailabilityFilters) {
  const { from, to, q } = filters;
  return useInfiniteQuery({
    queryKey: availabilityKeys.list(filters),
    queryFn:
      from === null || to === null
        ? skipToken
        : ({ pageParam }) => listAvailability({ from, to, q }, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 0,
  });
}
