import { useQuery } from "@tanstack/react-query";

import { sessionKeys } from "../api/keys";
import { listMyBusinesses } from "../api/requests";

export function useMyBusinesses() {
  return useQuery({
    queryKey: sessionKeys.businesses(),
    queryFn: listMyBusinesses,
  });
}
