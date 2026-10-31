import type { AvailabilityFilters } from "../types";

export const availabilityKeys = {
  all: ["availability"] as const,
  list: (filters: AvailabilityFilters) =>
    [...availabilityKeys.all, "list", filters] as const,
};
