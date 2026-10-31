import { useInfiniteQuery } from "@tanstack/react-query";

import { bookingKeys } from "../api/keys";
import { listBookings } from "../api/requests";
import type { BookingFilters } from "../types";

/**
 * The state of a booking is always asked again and never updated by hand: `staleTime: 0` (docs/architecture.md §4.3).
 * The cursors live in the page params and not in the URL: after a reload the list starts again at the first page.
 */
export function useBookings(filters: BookingFilters) {
  return useInfiniteQuery({
    queryKey: bookingKeys.list(filters),
    queryFn: ({ pageParam }) => listBookings(filters, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 0,
  });
}
