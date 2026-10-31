import type { components } from "@/api/schema";

export type BookingStatus = components["schemas"]["BookingRef"]["status"];
export type BookingRef = components["schemas"]["BookingRef"];

/** What the API sends for the role: with line prices, freight and deposit (`BookingWithPrices`) or without them. */
export type Booking =
  components["schemas"]["BookingWithPrices"] | components["schemas"]["Booking"];

/** What the list asks the API for: `status` only when it is not `null`. */
export type BookingFilters = {
  status: BookingStatus | null;
};
