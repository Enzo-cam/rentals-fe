import Link from "next/link";

import { formatDateTime } from "@/lib/format/date-time";
import { ROUTES } from "@/lib/routes";

import type { Booking } from "../types";
import { BookingStatusBadge } from "./booking-status-badge";
import { BOOKINGS_TEXTS } from "./texts";

/** The balance is the one of the API (INV-FE-01); `holdExpired` is its word too and only changes the pill. */
export function BookingRow({ booking }: { booking: Booking }) {
  return (
    <li>
      <Link
        href={ROUTES.booking(booking.id)}
        className="flex flex-col gap-1 rounded-lg border p-3"
      >
        <div className="flex items-start justify-between gap-3">
          <span className="min-w-0 break-words font-medium">
            {booking.customer.name}
          </span>
          <BookingStatusBadge
            status={booking.status}
            holdExpired={booking.holdExpired}
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {formatDateTime(booking.deliveryAt)} →{" "}
          {formatDateTime(booking.pickupAt)}
        </span>
        <span>{BOOKINGS_TEXTS.balance(booking.balanceDueCents)}</span>
      </Link>
    </li>
  );
}
