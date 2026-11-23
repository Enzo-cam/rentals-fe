import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { ROUTES } from "@/lib/routes";

import type { UpdateBookingBody } from "../api/booking-body";
import { formFailureOf } from "../api/failures";
import { bookingKeys } from "../api/keys";
import { updateBooking } from "../api/requests";

/**
 * No `Idempotency-Key`: the contract has none for the edit (`updateBooking` has the why), so this is a plain mutation.
 * `submitOnce` asks the cache and not the render: two fast submits can arrive before React re-renders. The booking is
 * the answer of the API and it is not written anywhere else; the lists are asked again, and the person goes to the
 * detail. A 409 that says the edit no longer fits (the status, a price or the deposit changed on another phone) asks for
 * the booking again, so the screen follows the status that comes back.
 * AC-15, AC-21 (rentals-be#29)
 */
export function useUpdateBooking(id: string) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutationKey = bookingKeys.update(id);
  const mutation = useMutation({
    mutationKey,
    mutationFn: (body: UpdateBookingBody) => updateBooking(id, body),
    onSuccess: (booking) => {
      queryClient.setQueryData(bookingKeys.detail(booking.id), booking);
      void queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      router.push(ROUTES.booking(booking.id));
    },
    onError: (error) => {
      if (formFailureOf(error)?.kind === "editRejected") {
        void queryClient.invalidateQueries({
          queryKey: bookingKeys.detail(id),
        });
      }
    },
  });
  function submitOnce(body: UpdateBookingBody) {
    if (queryClient.isMutating({ mutationKey }) > 0) return;
    mutation.mutate(body);
  }
  return { ...mutation, submitOnce };
}
