import { useQueryClient } from "@tanstack/react-query";

import { useIdempotentMutation } from "@/api/use-idempotent-mutation";

import type { BookingAction } from "../api/actions";
import { isInvalidTransition } from "../api/failures";
import { bookingKeys } from "../api/keys";
import {
  cancelBooking,
  confirmBooking,
  deliverBooking,
  returnBooking,
} from "../api/requests";

const REQUESTS = {
  confirm: confirmBooking,
  deliver: deliverBooking,
  return: returnBooking,
  cancel: cancelBooking,
};

/**
 * One key per booking and action, kept after any failure and released on a success (`useIdempotentMutation`), so a tap
 * repeated after a cut connection cannot act twice. Mount it in the screen that owns the buttons, not in the dialog
 * that closes. The status is never written to the cache: the booking is asked again (docs/architecture.md §4.3), and
 * also when it changed on another phone (`invalid_transition`). `onSuccess` returns the invalidations so the buttons
 * stay disabled until the new status is on screen: a tap on the old button would send a stale action with a new key.
 */
export function useBookingAction(id: string) {
  const queryClient = useQueryClient();
  return useIdempotentMutation({
    intentOf: (action: BookingAction) => `${id}:${action}`,
    mutationFn: (action: BookingAction, idempotencyKey) =>
      REQUESTS[action](id, idempotencyKey),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id) }),
        queryClient.invalidateQueries({ queryKey: bookingKeys.lists() }),
      ]),
    onError: (error) => {
      if (isInvalidTransition(error)) {
        void queryClient.invalidateQueries({
          queryKey: bookingKeys.detail(id),
        });
      }
    },
  });
}
