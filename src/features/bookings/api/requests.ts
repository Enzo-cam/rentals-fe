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

/**
 * The four actions send no body and a JSON content type (the API refuses any other on a write), and the key of the
 * intent in `Idempotency-Key`: a repeat with the same key answers 200 with the booking as it is.
 */
export function confirmBooking(id: string, idempotencyKey: string) {
  return unwrap(
    browserApi.POST("/bookings/{id}/confirm", {
      params: { path: { id }, header: { "idempotency-key": idempotencyKey } },
      headers: { "content-type": "application/json" },
    }),
  );
}

export function deliverBooking(id: string, idempotencyKey: string) {
  return unwrap(
    browserApi.POST("/bookings/{id}/deliver", {
      params: { path: { id }, header: { "idempotency-key": idempotencyKey } },
      headers: { "content-type": "application/json" },
    }),
  );
}

export function returnBooking(id: string, idempotencyKey: string) {
  return unwrap(
    browserApi.POST("/bookings/{id}/return", {
      params: { path: { id }, header: { "idempotency-key": idempotencyKey } },
      headers: { "content-type": "application/json" },
    }),
  );
}

export function cancelBooking(id: string, idempotencyKey: string) {
  return unwrap(
    browserApi.POST("/bookings/{id}/cancel", {
      params: { path: { id }, header: { "idempotency-key": idempotencyKey } },
      headers: { "content-type": "application/json" },
    }),
  );
}
