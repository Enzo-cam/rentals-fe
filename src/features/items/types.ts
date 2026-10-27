import type { components, paths } from "@/api/schema";

type ItemsQuery = NonNullable<paths["/items"]["get"]["parameters"]["query"]>;

export type ItemStatusFilter = NonNullable<ItemsQuery["status"]>;

/** What the list asks the API for: the status always, `category` and `q` only when they are not `null`. */
export type ItemFilters = {
  status: ItemStatusFilter;
  category: string | null;
  q: string | null;
};

export const DEFAULT_ITEM_FILTERS: ItemFilters = {
  status: "active",
  category: null,
  q: null,
};

/** The API sends `priceCents` only to the roles that can view prices, so a page and its items come in two shapes. */
export type ItemPage =
  | components["schemas"]["ItemPageWithPrices"]
  | components["schemas"]["ItemPage"];

export type ListedItem =
  components["schemas"]["ItemWithPrice"] | components["schemas"]["Item"];
