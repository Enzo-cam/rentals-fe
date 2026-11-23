import type { AvailabilityFilters } from "../types";

export const availabilityKeys = {
  all: ["availability"] as const,
  list: (filters: AvailabilityFilters) =>
    [...availabilityKeys.all, "list", filters] as const,
  free: (from: string, to: string, ids: string[]) =>
    [...availabilityKeys.all, "free", { from, to, ids }] as const,
};
