import { useInfiniteQuery } from "@tanstack/react-query";

import { itemKeys } from "../api/keys";
import { listItems } from "../api/requests";
import type { ItemFilters } from "../types";

/** The cursors live in the page params and not in the URL: after a reload the list starts again at the first page. */
export function useItems(filters: ItemFilters) {
  return useInfiniteQuery({
    queryKey: itemKeys.list(filters),
    queryFn: ({ pageParam }) => listItems(filters, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
