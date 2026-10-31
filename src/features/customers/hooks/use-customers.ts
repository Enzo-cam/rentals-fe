import { useInfiniteQuery } from "@tanstack/react-query";

import { customerKeys } from "../api/keys";
import { listCustomers } from "../api/requests";
import type { CustomerFilters } from "../types";

/** The cursors live in the page params and not in the URL: after a reload the list starts again at the first page. */
export function useCustomers(filters: CustomerFilters) {
  return useInfiniteQuery({
    queryKey: customerKeys.list(filters),
    queryFn: ({ pageParam }) => listCustomers(filters, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
