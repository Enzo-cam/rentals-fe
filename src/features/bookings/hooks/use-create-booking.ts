import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { useIdempotentMutation } from "@/api/use-idempotent-mutation";
import { ROUTES } from "@/lib/routes";

import type { CreateBookingBody } from "../api/booking-body";
import { bookingKeys } from "../api/keys";
import { createBooking } from "../api/requests";

/**
 * One key for the whole form, kept after any failure and released on a success (`useIdempotentMutation`): a retry after
 * a 409, a 502 or a cut connection carries the same key, and after a 201 that never arrived it gets the booking that
 * was saved instead of a second one. Mount it in the screen and not in the form or a sheet, because it is the screen
 * that stays while the person fixes the form. `submitOnce` asks the cache and not the render: two fast submits can
 * arrive before React re-renders. The booking is the answer of the API and it is not written anywhere else; the lists
 * are asked again, and the form is left for the detail, so the next save is another action.
 * AC-1, AC-6, AC-10 (rentals-be#29)
 */
export function useCreateBooking() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutationKey = bookingKeys.create();
  const mutation = useIdempotentMutation({
    mutationKey,
    mutationFn: (body: CreateBookingBody, idempotencyKey) =>
      createBooking(body, idempotencyKey),
    onSuccess: (booking) => {
      queryClient.setQueryData(bookingKeys.detail(booking.id), booking);
      void queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      router.replace(ROUTES.booking(booking.id));
    },
  });
  function submitOnce(body: CreateBookingBody) {
    if (queryClient.isMutating({ mutationKey }) > 0) return;
    mutation.mutate(body);
  }
  return { ...mutation, submitOnce };
}
