import { unwrap } from "@/api/api-failure";
import { browserApi } from "@/api/browser-client";
import type { paths } from "@/api/schema";
import { startOfTodayInstant } from "@/lib/format/date-time";

import type { BookingFilters } from "../types";
import type { CreateBookingBody, UpdateBookingBody } from "./booking-body";

/**
 * The cursor belongs to the status and the `from` it came with; `limit` is never sent, so the API picks the page size.
 * Unless the list is `all`, `from` is the start of today, taken on each request and so also on "Ver más" (a chosen
 * rule): a page asked across midnight can be answered with `invalid_cursor`, and a reload starts the list again.
 * AC-12 (rentals-be#29)
 */
export function listBookings(filters: BookingFilters, cursor: string | null) {
  const query: NonNullable<paths["/bookings"]["get"]["parameters"]["query"]> =
    {};
  if (filters.status !== null) query.status = filters.status;
  if (!filters.all) query.from = startOfTodayInstant();
  if (cursor !== null) query.cursor = cursor;
  return unwrap(browserApi.GET("/bookings", { params: { query } }));
}

export function getBooking(id: string) {
  return unwrap(browserApi.GET("/bookings/{id}", { params: { path: { id } } }));
}

/**
 * The active items to pick from, each with the list price that fills its line. It is a thin read of `GET /items` of its
 * own, and the items feature does not export `useItems`, because items already imports this feature
 * (`archive-actions`) and the cycle is an error of `no-circular` in dependency-cruiser. The cursor belongs to the `q`
 * it came with; `limit` is never sent, so the API picks the page size.
 * AC-1 (rentals-be#29)
 */
export function listActiveItems(q: string | null, cursor: string | null) {
  const query: NonNullable<paths["/items"]["get"]["parameters"]["query"]> = {
    status: "active",
  };
  if (q !== null) query.q = q;
  if (cursor !== null) query.cursor = cursor;
  return unwrap(browserApi.GET("/items", { params: { query } }));
}

/**
 * The key of the intent goes in `Idempotency-Key` (a UUID, required): the same key with the same body answers the
 * booking that was saved, and with another body a 422 `idempotency_key_reused`. A rejected save does not keep the key.
 * AC-1 (rentals-be#29)
 */
export function createBooking(body: CreateBookingBody, idempotencyKey: string) {
  return unwrap(
    browserApi.POST("/bookings", {
      params: { header: { "idempotency-key": idempotencyKey } },
      body,
    }),
  );
}

/**
 * The edit carries no `Idempotency-Key`: the contract has none for this endpoint, because the values are absolute and
 * the same body twice leaves the booking as it was.
 * @see src/api/schema.d.ts (`PATCH /bookings/{id}`)
 * AC-15 (rentals-be#29)
 */
export function updateBooking(id: string, body: UpdateBookingBody) {
  return unwrap(
    browserApi.PATCH("/bookings/{id}", { params: { path: { id } }, body }),
  );
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
