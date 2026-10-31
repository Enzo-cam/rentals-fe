import type { APIRequestContext } from "@playwright/test";

import type { components } from "../../src/api/schema";
import { apiRequests } from "./fake-api-control";

type Customer = components["schemas"]["Customer"];

/** Same data as `customers-fixtures.json`. */
export const CUSTOMER_IDS = {
  ana: "dddddddd-0000-4000-8000-000000000001",
  asociacion: "dddddddd-0000-4000-8000-000000000002",
  bar: "dddddddd-0000-4000-8000-000000000003",
  lucia: "dddddddd-0000-4000-8000-000000000004",
  marcos: "dddddddd-0000-4000-8000-000000000005",
};

export const ANA = "Ana Gómez";
export const ASOCIACION =
  "Asociación de Eventos y Fiestas Infantiles del Noreste Argentino";
export const BAR = "Bar El Molino";
export const LUCIA = "Lucía Benítez";
export const MARCOS = "Marcos Ríos";

export const ana = {
  id: CUSTOMER_IDS.ana,
  name: ANA,
  whatsapp: "3794 123456",
} satisfies Customer;

export const asociacion = {
  id: CUSTOMER_IDS.asociacion,
  name: ASOCIACION,
  whatsapp: "3624 000999",
} satisfies Customer;

export const bar = {
  id: CUSTOMER_IDS.bar,
  name: BAR,
  whatsapp: "3624 987654",
} satisfies Customer;

export const lucia = {
  id: CUSTOMER_IDS.lucia,
  name: LUCIA,
  whatsapp: "3794 555000",
} satisfies Customer;

export function pageOf(
  items: Customer[],
  nextCursor: string | null,
): components["schemas"]["CustomerPage"] {
  return { items, nextCursor };
}

/** The calls to `GET /customers` the page made, in order. */
export async function customerListCalls(request: APIRequestContext) {
  return (await apiRequests(request)).filter(
    (call) => call.method === "GET" && call.path === "/customers",
  );
}

/** The calls that write customers (`POST /customers`, `PATCH /customers/{id}`), in order. */
export async function customerWrites(request: APIRequestContext) {
  return (await apiRequests(request)).filter(
    (call) =>
      call.path.startsWith("/customers") &&
      (call.method === "POST" || call.method === "PATCH"),
  );
}
