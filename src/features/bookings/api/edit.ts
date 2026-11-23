import type { BookingStatus } from "../types";

/**
 * What of a booking can change, by its status: the rules of `PATCH /bookings/{id}` that the screen follows so it does
 * not offer what the API would answer with a 409 `booking_not_editable` or `line_price_locked`. `wholeBooking` is every
 * field (the customer, the period, the lines and the money); without it only the pickup, the address and the note
 * change. `holdExpiry` is the expiry of a hold, and `pricesFixed` says that the price of a line that was already there
 * cannot change. They come from the status the API sent and never from the form. It is a comfort for the screen: the API
 * decides and rejects anyway (INV-FE-01).
 * AC-18, AC-19 (rentals-be#29)
 */
export type BookingEdit = {
  wholeBooking: boolean;
  holdExpiry: boolean;
  pricesFixed: boolean;
};

/**
 * The rules of the edit for a status, or `null` when the booking can no longer be edited (returned or cancelled).
 * AC-18, AC-19, AC-20 (rentals-be#29)
 */
export function bookingEditOf(status: BookingStatus): BookingEdit | null {
  switch (status) {
    case "hold":
      return { wholeBooking: true, holdExpiry: true, pricesFixed: false };
    case "confirmed":
      return { wholeBooking: true, holdExpiry: false, pricesFixed: true };
    case "delivered":
      return { wholeBooking: false, holdExpiry: false, pricesFixed: false };
    case "returned":
    case "cancelled":
      return null;
  }
}
