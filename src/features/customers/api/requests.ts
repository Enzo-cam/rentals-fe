import { unwrap } from "@/api/api-failure";
import { browserApi } from "@/api/browser-client";
import type { paths } from "@/api/schema";

import type { CustomerFilters } from "../types";
import type { CreateCustomerBody, UpdateCustomerBody } from "./customer-body";

/** The cursor belongs to the `q` it came with; `limit` is never sent, so the API picks the page size. */
export function listCustomers(filters: CustomerFilters, cursor: string | null) {
  const query: NonNullable<paths["/customers"]["get"]["parameters"]["query"]> =
    {};
  if (filters.q !== null) query.q = filters.q;
  if (cursor !== null) query.cursor = cursor;
  return unwrap(browserApi.GET("/customers", { params: { query } }));
}

/** The API does not take an `Idempotency-Key` on customers. */
export function createCustomer(body: CreateCustomerBody) {
  return unwrap(browserApi.POST("/customers", { body }));
}

export function updateCustomer(id: string, body: UpdateCustomerBody) {
  return unwrap(
    browserApi.PATCH("/customers/{id}", { params: { path: { id } }, body }),
  );
}
