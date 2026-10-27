import { ROUTES } from "@/lib/routes";

import {
  DEFAULT_ITEM_FILTERS,
  type ItemFilters,
  type ItemStatusFilter,
} from "../types";

const STATUSES: readonly ItemStatusFilter[] = ["active", "archived", "all"];
const MAX_Q = 100;
const MAX_CATEGORY = 60;

function textOf(
  value: string | string[] | undefined,
  max: number,
): string | null {
  const text = (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
  if (text === "" || Array.from(text).length > max) return null;
  return text;
}

/**
 * The filters come from the URL, which anybody can type: a value that the API would answer with a 400 (an unknown
 * status, a `q` or a `category` over its limit) never goes through, so the URL cannot break the list.
 */
export function parseItemFilters(
  params: Record<string, string | string[] | undefined>,
): ItemFilters {
  const status = textOf(params.status, MAX_Q);
  return {
    status:
      STATUSES.find((known) => known === status) ?? DEFAULT_ITEM_FILTERS.status,
    category: textOf(params.category, MAX_CATEGORY),
    q: textOf(params.q, MAX_Q),
  };
}

/** The URL of the list for some filters, without the ones that are the default. */
export function itemsHref(filters: ItemFilters): string {
  const params = new URLSearchParams();
  if (filters.q !== null) params.set("q", filters.q);
  if (filters.category !== null) params.set("category", filters.category);
  if (filters.status !== DEFAULT_ITEM_FILTERS.status)
    params.set("status", filters.status);
  const query = params.toString();
  return query === "" ? ROUTES.items : `${ROUTES.items}?${query}`;
}
