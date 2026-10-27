import type { Page } from "@playwright/test";

import type { components } from "../../src/api/schema";

type Item = components["schemas"]["Item"];
type ItemWithPrice = components["schemas"]["ItemWithPrice"];

/** Same data as `items-fixtures.json`. */
export const ITEM_IDS = {
  silla: "bbbbbbbb-0000-4000-8000-000000000001",
  copa: "bbbbbbbb-0000-4000-8000-000000000002",
  tablon: "bbbbbbbb-0000-4000-8000-000000000003",
  living: "bbbbbbbb-0000-4000-8000-000000000004",
  sillaNegra: "bbbbbbbb-0000-4000-8000-000000000005",
};

export const SILLA = "Silla Tiffany blanca";
export const COPA = "Copa de vino";
export const TABLON =
  "Tablón rectangular de 2,40 m con caballetes plegables para eventos al aire libre en Corrientes y Resistencia";
export const LIVING = "Living blanco";

export const silla = {
  id: ITEM_IDS.silla,
  name: SILLA,
  totalStock: 120,
  outOfService: 4,
  category: "Mobiliario",
  code: "SIL-01",
  description: null,
  archived: false,
  priceCents: 150000,
} satisfies ItemWithPrice;

export const copa = {
  id: ITEM_IDS.copa,
  name: COPA,
  totalStock: 300,
  outOfService: 0,
  category: "Vajilla",
  code: null,
  description: null,
  archived: false,
  priceCents: 35000,
} satisfies ItemWithPrice;

export const tablon = {
  id: ITEM_IDS.tablon,
  name: TABLON,
  totalStock: 25,
  outOfService: 0,
  category: null,
  code: null,
  description: null,
  archived: false,
  priceCents: 0,
} satisfies ItemWithPrice;

/** What the API sends to the roles that cannot view prices. */
export function withoutPrice(item: ItemWithPrice): Item {
  return {
    id: item.id,
    name: item.name,
    totalStock: item.totalStock,
    outOfService: item.outOfService,
    category: item.category,
    code: item.code,
    description: item.description,
    archived: item.archived,
  };
}

export function pageOf(
  items: ItemWithPrice[],
  nextCursor: string | null,
): components["schemas"]["ItemPageWithPrices"] {
  return { items, nextCursor };
}

export function pageWithoutPrices(
  items: ItemWithPrice[],
  nextCursor: string | null,
): components["schemas"]["ItemPage"] {
  return { items: items.map(withoutPrice), nextCursor };
}

/**
 * Opens a screen of the items and waits until it knows who the user is, so a button that must be missing is
 * missing because of the role and not because `GET /me` has not arrived. Not `networkidle`: the rows come from a
 * query, so they only show once the page is hydrated, and a link to a page that does not exist yet never settles.
 */
export async function openItemsScreen(page: Page, path: string) {
  const me = page.waitForResponse((response) =>
    response.url().endsWith("/api/me"),
  );
  await page.goto(path);
  await me;
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}
