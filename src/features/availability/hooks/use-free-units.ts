import { skipToken, useQuery } from "@tanstack/react-query";

import { toApiInstant } from "@/lib/format/date-time";

import { availabilityKeys } from "../api/keys";
import { freeUnitsOf } from "../api/requests";

/**
 * It asks only with two real moments (what the `datetime-local` fields hold) and at least one item: `skipToken` leaves
 * the query disabled otherwise, so a form without its dates asks for nothing. Whether the pickup is after the delivery
 * is the API's: a period turned around gets a 400 that the help ignores. Always asked again and never updated by hand:
 * `staleTime: 0` (docs/architecture.md §4.3).
 * AC-4 (rentals-be#29)
 */
export function useFreeUnits(from: string, to: string, ids: string[]) {
  const ready =
    toApiInstant(from) !== null && toApiInstant(to) !== null && ids.length > 0;
  return useQuery({
    queryKey: availabilityKeys.free(from, to, ids),
    queryFn: ready ? () => freeUnitsOf(from, to, ids) : skipToken,
    staleTime: 0,
  });
}
