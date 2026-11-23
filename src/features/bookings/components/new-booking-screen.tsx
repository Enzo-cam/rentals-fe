"use client";

import { createBodyOf } from "../api/booking-body";
import { useCreateBooking } from "../hooks/use-create-booking";
import { BookingForm } from "./booking-form";
import { BookingGate } from "./booking-gate";

/**
 * The mutation lives here and not in the form or in a sheet: the screen is what stays mounted while the person fixes
 * the form after a 409 or a 502, and it holds the `Idempotency-Key` of the save. If the key were lost, a retry after a
 * 201 that never arrived would make a second booking.
 * AC-6, AC-10 (rentals-be#29)
 */
export function NewBookingScreen() {
  const create = useCreateBooking();

  return (
    <BookingGate>
      <BookingForm
        onSubmit={(values) => create.submitOnce(createBodyOf(values))}
        busy={create.isPending || create.isSuccess}
        error={create.error}
      />
    </BookingGate>
  );
}
