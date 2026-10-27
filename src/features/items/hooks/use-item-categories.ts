import { useInfiniteQuery } from "@tanstack/react-query";

import { itemKeys } from "../api/keys";
import { listItemCategories } from "../api/requests";

export function useItemCategories() {
  return useInfiniteQuery({
    queryKey: itemKeys.categories(),
    queryFn: ({ pageParam }) => listItemCategories(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
