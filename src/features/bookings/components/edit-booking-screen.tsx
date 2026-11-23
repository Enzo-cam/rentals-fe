"use client";

import Link from "next/link";
import { redirect } from "next/navigation";

import { failureOf, isLeavingSession } from "@/api/api-failure";
import { describeError } from "@/api/failure-message";
import { Button, buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";

import { formValuesOf, patchOf } from "../api/booking-body";
import { bookingEditOf } from "../api/edit";
import { isBookingMissing } from "../api/failures";
import { useBooking } from "../hooks/use-booking";
import { useUpdateBooking } from "../hooks/use-update-booking";
import { BookingForm } from "./booking-form";
import { BookingGate } from "./booking-gate";
import {
  BOOKING_DETAIL_TEXTS,
  BOOKING_FORM_TEXTS,
  BOOKINGS_TEXTS,
} from "./texts";

/**
 * The form mounts only with the booking that was just asked for (`isFetchedAfterMount`): one from the cache may be an old
 * status, and what the person can change depends on it. It is keyed by the booking, so another one starts from its own
 * values and nothing is copied by an effect (INV-FE-06). A booking that can no longer be edited (returned or cancelled)
 * sends the person to its detail, in the render and with no `PATCH`. The rules come from the status of the booking
 * as the API sent it, also after a 409 that asks for it again.
 * AC-15, AC-16, AC-20 (rentals-be#29)
 */
function EditForm({ id }: { id: string }) {
  const booking = useBooking(id);
  const update = useUpdateBooking(id);
  const leaving = isLeavingSession(failureOf(booking.error));

  if (booking.data) {
    const rules = bookingEditOf(booking.data.status);
    if (rules === null) redirect(ROUTES.booking(id));
    if (booking.isFetchedAfterMount) {
      return (
        <BookingForm
          key={booking.data.id}
          edit={{ defaultValues: formValuesOf(booking.data), rules }}
          onSubmit={(values, opened) => {
            const patch = patchOf(opened, values, rules);
            if (Object.keys(patch).length === 0) {
              return BOOKING_FORM_TEXTS.unchanged;
            }
            update.submitOnce(patch);
          }}
          busy={update.isPending || update.isSuccess}
          error={update.error}
        />
      );
    }
  }
  if (booking.data || booking.isPending) {
    return <p role="status">{BOOKING_DETAIL_TEXTS.loading}</p>;
  }
  if (isBookingMissing(booking.error)) {
    return (
      <div className="flex flex-col gap-2">
        <p role="alert">{BOOKING_DETAIL_TEXTS.missing}</p>
        <Link
          href={ROUTES.bookings}
          className={buttonVariants({ variant: "outline" })}
        >
          {BOOKING_DETAIL_TEXTS.back}
        </Link>
      </div>
    );
  }
  if (leaving) return null;
  return (
    <div className="flex flex-col gap-2">
      <p role="alert">{describeError(booking.error)}</p>
      <Button variant="outline" onClick={() => booking.refetch()}>
        {BOOKINGS_TEXTS.retry}
      </Button>
    </div>
  );
}

/** The booking is only asked for once the gate knows that the person can manage: who cannot never sees the form. */
export function EditBookingScreen({ id }: { id: string }) {
  return (
    <BookingGate>
      <EditForm id={id} />
    </BookingGate>
  );
}
