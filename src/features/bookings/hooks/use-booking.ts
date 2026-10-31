import { useQuery } from "@tanstack/react-query";

import { bookingKeys } from "../api/keys";
import { getBooking } from "../api/requests";

/** `staleTime: 0`: the state of a booking is always asked again (docs/architecture.md §4.3). */
export function useBooking(id: string) {
  return useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn: () => getBooking(id),
    staleTime: 0,
  });
}
