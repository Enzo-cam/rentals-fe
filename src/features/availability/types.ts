import type { components } from "@/api/schema";

export type ItemAvailability = components["schemas"]["ItemAvailability"];

/**
 * What the screen asks the API for. `from` and `to` are what a `datetime-local` field holds (`2030-03-08T08:00`, Argentina
 * time) and are `null` when they are missing or not a real date and time; `q` is `null` when it is empty.
 */
export type AvailabilityFilters = {
  from: string | null;
  to: string | null;
  q: string | null;
};
