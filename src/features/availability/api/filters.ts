import { toApiInstant } from "@/lib/format/date-time";
import { ROUTES } from "@/lib/routes";

import type { AvailabilityFilters } from "../types";

const MAX_Q = 100;

function textOf(
  value: string | string[] | undefined,
  max: number,
): string | null {
  const text = (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
  if (text === "" || Array.from(text).length > max) return null;
  return text;
}

function localOf(value: string | string[] | undefined): string | null {
  const text = textOf(value, 16);
  return text !== null && toApiInstant(text) !== null ? text : null;
}

/**
 * The filters come from the URL, which anybody can type: a date that is not a real day and time, or a `q` that the API
 * would answer with a 400 (over its limit) or that is only spaces never goes through, so the URL cannot break the list.
 */
export function parseAvailabilityFilters(
  params: Record<string, string | string[] | undefined>,
): AvailabilityFilters {
  return {
    from: localOf(params.from),
    to: localOf(params.to),
    q: textOf(params.q, MAX_Q),
  };
}

/** The URL of the screen for some filters, without the ones that are empty. */
export function availabilityHref(filters: AvailabilityFilters): string {
  const query = new URLSearchParams();
  if (filters.from !== null) query.set("from", filters.from);
  if (filters.to !== null) query.set("to", filters.to);
  if (filters.q !== null) query.set("q", filters.q);
  const text = query.toString();
  return text === "" ? ROUTES.availability : `${ROUTES.availability}?${text}`;
}
