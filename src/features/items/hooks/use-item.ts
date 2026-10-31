import { useQuery } from "@tanstack/react-query";

import { itemKeys } from "../api/keys";
import { getItem } from "../api/requests";

export function useItem(id: string) {
  return useQuery({
    queryKey: itemKeys.detail(id),
    queryFn: () => getItem(id),
  });
}
