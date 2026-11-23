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

function firstOf(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * The filters come from the URL, which anybody can type: a status that is not one of the API's would be answered with
 * a 400, so it never goes through and the list shows every status. Only `all=1` shows every booking: any other value
 * leaves the list from today.
 * AC-12 (rentals-be#29)
 */
export function parseBookingFilters(
  params: Record<string, string | string[] | undefined>,
): BookingFilters {
  const status = firstOf(params.status);
  return {
    status: BOOKING_STATUSES.find((known) => known === status) ?? null,
    all: firstOf(params.all) === "1",
  };
}

/** The URL of the list for some filters, without the ones that are the default. */
export function bookingsHref(filters: BookingFilters): string {
  const params = new URLSearchParams();
  if (filters.status !== null) params.set("status", filters.status);
  if (filters.all) params.set("all", "1");
  const query = params.toString();
  return query === "" ? ROUTES.bookings : `${ROUTES.bookings}?${query}`;
}
