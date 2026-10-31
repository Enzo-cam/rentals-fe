import type { Page } from "@playwright/test";

import type { components } from "../../src/api/schema";

type BookingRef = components["schemas"]["BookingRef"];
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

type Me = components["schemas"]["Me"];

/** The `GET /me` that a test forces to change who the user is after the page loaded. */
export function meOf(
  user: { id: string; name: string; email: string },
  business: { id: string; name: string },
  role: Me["role"],
  readOnly: boolean,
): Me {
  return {
    user,
    role,
    business: { id: business.id, name: business.name, readOnly },
  };
}

type ItemImportPreview = components["schemas"]["ItemImportPreview"];
type ItemImportRejected = components["schemas"]["ItemImportRejected"];

/** A pasted list with a header, a blank line and a price with a comma: the front sends it as it is. */
export const IMPORT_TEXT =
  "Nombre;Cantidad;Precio\nSilla Tiffany blanca;10;1500\nCopa de agua;200;1,50\nCopa de agua;50;300\n\nMantel cuadrado;20;$ 2.800";

function row(
  line: number,
  name: string,
  totalStock: number,
  priceCents: number | null,
  errors: ItemImportPreview["rows"][number]["errors"] = [],
): ItemImportPreview["rows"][number] {
  return {
    line,
    name,
    totalStock,
    priceCents,
    category: null,
    code: null,
    description: null,
    errors,
  };
}

/** What the API makes of `IMPORT_TEXT`: three rows with errors and one without. */
export const markedPreview = {
  header: { line: 1, cells: ["Nombre", "Cantidad", "Precio"] },
  rows: [
    row(2, SILLA, 10, 150000, [
      {
        code: "name_taken",
        item: { id: ITEM_IDS.silla, name: SILLA, archived: false },
      },
    ]),
    row(3, "Copa de agua", 200, null, [{ code: "price_invalid" }]),
    row(4, "Copa de agua", 50, 30000, [
      { code: "name_repeated", otherLine: 3 },
    ]),
    row(6, "Mantel cuadrado", 20, 280000),
  ],
  valid: false,
} satisfies ItemImportPreview;

/** The list of a preview with no errors: three rows. */
export const VALID_IMPORT_TEXT =
  "Mesa;30;12.000\nSilla;100;1.500\nManto;50;800";

export const validPreview = {
  header: null,
  rows: [
    row(1, "Mesa", 30, 1200000),
    row(2, "Silla", 100, 150000),
    row(3, "Manto", 50, 80000),
  ],
  valid: true,
} satisfies ItemImportPreview;

/** The 422 of a confirmation: the same list, with the second row marked as taken by Copa de vino. */
export const rejectedImport = {
  error: "import_rejected",
  preview: {
    header: null,
    rows: [
      row(1, "Mesa", 30, 1200000),
      row(2, "Silla", 100, 150000, [
        {
          code: "name_taken",
          item: { id: ITEM_IDS.copa, name: COPA, archived: false },
        },
      ]),
      row(3, "Manto", 50, 80000),
    ],
    valid: false,
  },
} satisfies ItemImportRejected;

/**
 * Two bookings in 2030, so the year always shows: the confirmed one reads `vie 8 mar 2030, 08:00 → dom 10 mar 2030,
 * 17:00` and the hold `sáb 9 mar 2030, 11:30 → sáb 9 mar 2030, 19:00` in Argentina time.
 */
export const reservedBookings = [
  {
    id: "cccccccc-0000-4000-8000-000000000001",
    status: "confirmed",
    deliveryAt: "2030-03-08T11:00:00Z",
    pickupAt: "2030-03-10T20:00:00Z",
    quantity: 5,
    customerName: "Lucía Benítez",
  },
  {
    id: "cccccccc-0000-4000-8000-000000000002",
    status: "hold",
    deliveryAt: "2030-03-09T14:30:00Z",
    pickupAt: "2030-03-09T22:00:00Z",
    quantity: 3,
    customerName: "Bar El Molino",
  },
] satisfies BookingRef[];
