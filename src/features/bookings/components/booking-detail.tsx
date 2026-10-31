"use client";

import Link from "next/link";

import { failureOf, isLeavingSession } from "@/api/api-failure";
import { describeError } from "@/api/failure-message";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatCalendarDate, formatDateTime } from "@/lib/format/date-time";
import { formatCents } from "@/lib/format/money";
import { formatWholeNumber } from "@/lib/format/whole-number";
import { ROUTES } from "@/lib/routes";

import { isBookingMissing } from "../api/failures";
import { useBooking } from "../hooks/use-booking";
import type { Booking } from "../types";
import { BookingStatusBadge } from "./booking-status-badge";
import { BOOKING_DETAIL_TEXTS, BOOKINGS_TEXTS } from "./texts";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="break-words">{value}</dd>
    </div>
  );
}

/**
 * What shows depends on the fields the response carries, never on the role (INV-FE-01): the API leaves out the line
 * prices, the freight and the deposit for the roles that cannot view prices, and sends `null` for a date or a text that
 * the booking does not have. The balance is the one of the API.
 */
function BookingBody({ booking }: { booking: Booking }) {
  const texts = BOOKING_DETAIL_TEXTS;
  return (
    <>
      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 break-words text-lg font-medium">
            {booking.customer.name}
          </h2>
          <BookingStatusBadge
            status={booking.status}
            holdExpired={booking.holdExpired}
          />
        </div>
        <p className="text-muted-foreground">{booking.customer.whatsapp}</p>
      </div>
      <dl className="flex flex-col gap-3">
        <Field
          label={texts.delivery}
          value={formatDateTime(booking.deliveryAt)}
        />
        <Field label={texts.pickup} value={formatDateTime(booking.pickupAt)} />
        {booking.holdExpiresAt !== null && (
          <Field
            label={texts.holdExpires}
            value={formatDateTime(booking.holdExpiresAt)}
          />
        )}
        {booking.deliveredAt !== null && (
          <Field
            label={texts.delivered}
            value={formatDateTime(booking.deliveredAt)}
          />
        )}
        {booking.returnRecordedAt !== null && (
          <Field
            label={texts.returnRecorded}
            value={formatDateTime(booking.returnRecordedAt)}
          />
        )}
        {booking.cancelledAt !== null && (
          <Field
            label={texts.cancelled}
            value={formatDateTime(booking.cancelledAt)}
          />
        )}
        {booking.address !== null && (
          <Field label={texts.address} value={booking.address} />
        )}
        {booking.note !== null && (
          <Field label={texts.note} value={booking.note} />
        )}
      </dl>
      <ul className="flex flex-col gap-2">
        {booking.lines.map((line) => (
          <li
            key={line.id}
            className="flex items-baseline justify-between gap-3 rounded-lg border p-3"
          >
            <span className="min-w-0 break-words">
              {`${line.itemName} × ${formatWholeNumber(line.quantity)}`}
            </span>
            {"priceCents" in line && (
              <span className="shrink-0">
                {`${formatCents(line.priceCents)} ${texts.each}`}
              </span>
            )}
          </li>
        ))}
      </ul>
      {"freightCents" in booking && (
        <dl className="flex flex-col gap-3">
          <Field
            label={texts.freight}
            value={formatCents(booking.freightCents)}
          />
          {booking.deposit !== null && (
            <Field
              label={texts.deposit}
              value={texts.depositOn(
                formatCents(booking.deposit.amountCents),
                formatCalendarDate(booking.deposit.date),
              )}
            />
          )}
        </dl>
      )}
      <div className="flex flex-col">
        <span className="text-sm text-muted-foreground">
          {texts.balanceDue}
        </span>
        <span className="text-3xl font-extrabold">
          {formatCents(booking.balanceDueCents)}
        </span>
      </div>
    </>
  );
}

/** A dead session is not an error here: the session providers are already leaving the screen. */
export function BookingDetail({ id }: { id: string }) {
  const booking = useBooking(id);
  const leaving = isLeavingSession(failureOf(booking.error));

  return (
    <div className="flex flex-col gap-4">
      {booking.data && <BookingBody booking={booking.data} />}
      {booking.isPending && <p role="status">{BOOKING_DETAIL_TEXTS.loading}</p>}
      {booking.isError && isBookingMissing(booking.error) && (
        <p role="alert">{BOOKING_DETAIL_TEXTS.missing}</p>
      )}
      {booking.isError && !isBookingMissing(booking.error) && !leaving && (
        <div className="flex flex-col gap-2">
          <p role="alert">{describeError(booking.error)}</p>
          <Button variant="outline" onClick={() => booking.refetch()}>
            {BOOKINGS_TEXTS.retry}
          </Button>
        </div>
      )}
      <Link
        href={ROUTES.bookings}
        className={buttonVariants({ variant: "outline" })}
      >
        {BOOKING_DETAIL_TEXTS.back}
      </Link>
    </div>
  );
}
