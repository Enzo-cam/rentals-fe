import { useInfiniteQuery } from "@tanstack/react-query";

import { bookingKeys } from "../api/keys";
import { listActiveItems } from "../api/requests";

/**
 * The items a line can be made of, searched by name (`q` is `null` while nothing is typed). The cursors live in the page
 * params and not in the URL: the picker starts again at the first page each time it opens.
 */
export function useActiveItems(q: string | null) {
  return useInfiniteQuery({
    queryKey: bookingKeys.activeItems(q),
    queryFn: ({ pageParam }) => listActiveItems(q, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
