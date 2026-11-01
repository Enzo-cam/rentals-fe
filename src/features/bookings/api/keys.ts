import type { BookingFilters } from "../types";

export const bookingKeys = {
  all: ["bookings"] as const,
  lists: () => [...bookingKeys.all, "list"] as const,
  list: (filters: BookingFilters) => [...bookingKeys.lists(), filters] as const,
  detail: (id: string) => [...bookingKeys.all, "detail", id] as const,
};
