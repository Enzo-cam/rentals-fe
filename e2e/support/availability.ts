import type { APIRequestContext } from "@playwright/test";

import type { components } from "../../src/api/schema";
import { apiRequests } from "./fake-api-control";

type ItemAvailability = components["schemas"]["ItemAvailability"];

/** Same data as `availability-fixtures.json`. */
export const COPA_ROW = "Copa de vino";
export const LIVING_ROW = "Living blanco";
export const SILLA_ROW = "Silla Tiffany blanca";
export const TABLON_ROW =
  "Tablón rectangular de 2,40 m con caballetes plegables para eventos al aire libre en Corrientes y Resistencia";
export const ZOCALO_ROW = "Zócalo de madera";

export const copaRow = {
  itemId: "bbbbbbbb-0000-4000-8000-000000000002",
  name: COPA_ROW,
  totalStock: 1200,
  outOfService: 0,
  reserved: 120,
  available: 1080,
} satisfies ItemAvailability;

export const sillaRow = {
  itemId: "bbbbbbbb-0000-4000-8000-000000000001",
  name: SILLA_ROW,
  totalStock: 120,
  outOfService: 4,
  reserved: 30,
  available: 86,
} satisfies ItemAvailability;

export const zocaloRow = {
  itemId: "bbbbbbbb-0000-4000-8000-000000000007",
  name: ZOCALO_ROW,
  totalStock: 10,
  outOfService: 2,
  reserved: 3,
  available: 5,
} satisfies ItemAvailability;

/**
 * A period in 2030, so the year always shows: `FROM` is a Friday and `TO` a Sunday. The fields and the URL hold them as
 * local time, and the API gets them in Argentina time.
 */
export const FROM = "2030-03-08T08:00";
export const TO = "2030-03-10T19:00";
export const FROM_INSTANT = "2030-03-08T08:00:00-03:00";
export const TO_INSTANT = "2030-03-10T19:00:00-03:00";
export const PERIOD_TEXT =
  "Del vie 8 mar 2030, 08:00 al dom 10 mar 2030, 19:00";
export const PATH = `/disponibilidad?from=${FROM}&to=${TO}`;

export function pageOf(
  items: ItemAvailability[],
  nextCursor: string | null,
): components["schemas"]["AvailabilityPage"] {
  return { items, nextCursor };
}

/** The query strings of the calls to `GET /availability` the page made, in order. */
export async function availabilityCalls(request: APIRequestContext) {
  const calls = (await apiRequests(request)).filter(
    (call) => call.method === "GET" && call.path === "/availability",
  );
  return calls.map((call) => new URLSearchParams(call.query));
}
