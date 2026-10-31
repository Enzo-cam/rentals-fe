import { unwrap } from "@/api/api-failure";
import { browserApi } from "@/api/browser-client";
import type { paths } from "@/api/schema";

import type { BookingFilters } from "../types";

/** The cursor belongs to the status it came with; `limit` is never sent, so the API picks the page size. */
export function listBookings(filters: BookingFilters, cursor: string | null) {
  const query: NonNullable<paths["/bookings"]["get"]["parameters"]["query"]> =
    {};
  if (filters.status !== null) query.status = filters.status;
  if (cursor !== null) query.cursor = cursor;
  return unwrap(browserApi.GET("/bookings", { params: { query } }));
}

export function getBooking(id: string) {
  return unwrap(browserApi.GET("/bookings/{id}", { params: { path: { id } } }));
}
