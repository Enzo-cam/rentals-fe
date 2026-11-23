import type { components, paths } from "@/api/schema";

export type BookingStatus = components["schemas"]["BookingRef"]["status"];
export type BookingRef = components["schemas"]["BookingRef"];

/** What the API sends for the role: with line prices, freight and deposit (`BookingWithPrices`) or without them. */
export type Booking =
  components["schemas"]["BookingWithPrices"] | components["schemas"]["Booking"];

/** What the list asks the API for: `status` only when it is not `null`. */
export type BookingFilters = {
  status: BookingStatus | null;
};

/** The statuses a booking can be born with: a hold or confirmed, and no other (`POST /bookings`). */
export type NewBookingStatus =
  paths["/bookings"]["post"]["requestBody"]["content"]["application/json"]["status"];

/** The limits of the contract of `POST /bookings`: the quantity of a line and how many lines a booking has. */
export const MAX_QUANTITY = 100_000;
export const MAX_LINES = 100;

/**
 * A line of the form, with the quantity and the price as the text the person typed. `itemName` is only for the screen,
 * and `filledPriceCents` is the price the field was filled with when the line was added (the list price): a price the
 * person did not touch goes as that and is never read from the text, because it may carry cents, which the form cannot
 * parse back. Neither is an input, so the field array has to keep them.
 */
export type BookingLineValues = {
  itemId: string;
  itemName: string;
  quantity: string;
  price: string;
  filledPriceCents: number;
};

/**
 * The booking form, with every field as the text the person typed (dates as a `datetime-local` or a `date` field holds
 * them, in Argentina time). `customerName` and the line names are only for the screen and are never sent. `total` is
 * `null` while the person has not touched it: the field then shows the suggested sum and that is what goes, so a total
 * the person erased is `""` and not `null`. A `holdExpiresAt` left over from a hold that became confirmed is not sent.
 * The same values serve the edit, where the status is the one of the booking and never goes in a patch.
 */
export type BookingFormValues = {
  status: NewBookingStatus;
  customerId: string;
  customerName: string;
  holdExpiresAt: string;
  deliveryAt: string;
  pickupAt: string;
  eventDate: string;
  occasion: string;
  address: string;
  note: string;
  lines: BookingLineValues[];
  freight: string;
  total: string | null;
  depositAmount: string;
  depositDate: string;
};

/** A new booking starts as a hold: the default chosen for rentals-be#29, which the person changes with one tap. */
export const EMPTY_BOOKING_FORM: BookingFormValues = {
  status: "hold",
  customerId: "",
  customerName: "",
  holdExpiresAt: "",
  deliveryAt: "",
  pickupAt: "",
  eventDate: "",
  occasion: "",
  address: "",
  note: "",
  lines: [],
  freight: "",
  total: null,
  depositAmount: "",
  depositDate: "",
};
