import { failureOf } from "@/api/api-failure";

/**
 * The booking is not there for this business: a 404 `booking_not_found`, or a 400 `invalid_request` when the id in the
 * URL is not even a UUID. `business_not_found` is not this: it is the whole business that is gone.
 */
export function isBookingMissing(error: unknown): boolean {
  const failure = failureOf(error);
  return (
    failure?.kind === "rejected" &&
    ((failure.status === 404 && failure.code === "booking_not_found") ||
      (failure.status === 400 && failure.code === "invalid_request"))
  );
}
