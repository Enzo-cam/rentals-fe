import { ROUTES } from "@/lib/routes";

import type { BookingFilters, BookingStatus } from "../types";

/** The values of the API, in the order the select offers them. */
export const BOOKING_STATUSES: readonly BookingStatus[] = [
  "hold",
  "confirmed",
  "delivered",
  "returned",
  "cancelled",
];

/**
 * The filters come from the URL, which anybody can type: a status that is not one of the API's would be answered with
 * a 400, so it never goes through and the list shows every booking.
 */
export function parseBookingFilters(
  params: Record<string, string | string[] | undefined>,
): BookingFilters {
  const value = Array.isArray(params.status) ? params.status[0] : params.status;
  return { status: BOOKING_STATUSES.find((known) => known === value) ?? null };
}

/** The URL of the list for some filters, without the ones that are the default. */
export function bookingsHref(filters: BookingFilters): string {
  if (filters.status === null) return ROUTES.bookings;
  return `${ROUTES.bookings}?${new URLSearchParams({ status: filters.status })}`;
}
