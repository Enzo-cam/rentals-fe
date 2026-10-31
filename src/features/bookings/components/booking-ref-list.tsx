import { formatDateTime } from "@/lib/format/date-time";
import { formatWholeNumber } from "@/lib/format/whole-number";

import type { BookingRef } from "../types";
import { BookingStatusBadge } from "./booking-status-badge";
import { BOOKING_REF_TEXTS } from "./texts";

/**
 * The bookings that a 409 names, as the API sends them (`hasMore`: the list is cut). Customer and quantity, delivery
 * and pickup in the business time, and the status.
 */
export function BookingRefList({
  bookings,
  hasMore,
}: {
  bookings: BookingRef[];
  hasMore: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {bookings.map((booking) => (
          <li
            key={booking.id}
            className="flex flex-col gap-1 rounded-lg border p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0 break-words font-medium">
                {booking.customerName} · {formatWholeNumber(booking.quantity)}
              </span>
              <BookingStatusBadge status={booking.status} />
            </div>
            <span className="text-sm text-muted-foreground">
              {formatDateTime(booking.deliveryAt)} →{" "}
              {formatDateTime(booking.pickupAt)}
            </span>
          </li>
        ))}
      </ul>
      {hasMore && <p className="text-sm">{BOOKING_REF_TEXTS.hasMore}</p>}
    </div>
  );
}
