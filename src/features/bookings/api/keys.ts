import type { BookingFilters } from "../types";

export const bookingKeys = {
  all: ["bookings"] as const,
  list: (filters: BookingFilters) =>
    [...bookingKeys.all, "list", filters] as const,
  detail: (id: string) => [...bookingKeys.all, "detail", id] as const,
};
