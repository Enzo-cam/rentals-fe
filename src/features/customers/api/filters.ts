import { ROUTES } from "@/lib/routes";

import type { CustomerFilters } from "../types";

const MAX_Q = 100;

function textOf(
  value: string | string[] | undefined,
  max: number,
): string | null {
  const text = (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
  if (text === "" || Array.from(text).length > max) return null;
  return text;
}

/**
 * The filters come from the URL, which anybody can type: a `q` that the API would answer with a 400 (over its limit)
 * or that is only spaces never goes through, so the URL cannot break the list.
 */
export function parseCustomerFilters(
  params: Record<string, string | string[] | undefined>,
): CustomerFilters {
  return { q: textOf(params.q, MAX_Q) };
}

/** The URL of the list for some filters, without the ones that are the default. */
export function customersHref(filters: CustomerFilters): string {
  if (filters.q === null) return ROUTES.customers;
  return `${ROUTES.customers}?${new URLSearchParams({ q: filters.q })}`;
}
