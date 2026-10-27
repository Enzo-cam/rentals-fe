import { unwrap } from "@/api/api-failure";
import { browserApi } from "@/api/browser-client";
import type { paths } from "@/api/schema";

import type { ItemFilters } from "../types";
import type { CreateItemBody } from "./item-body";

/** The cursor belongs to the filters it came with; `limit` is never sent, so the API picks the page size. */
export function listItems(filters: ItemFilters, cursor: string | null) {
  const query: NonNullable<paths["/items"]["get"]["parameters"]["query"]> = {
    status: filters.status,
  };
  if (filters.category !== null) query.category = filters.category;
  if (filters.q !== null) query.q = filters.q;
  if (cursor !== null) query.cursor = cursor;
  return unwrap(browserApi.GET("/items", { params: { query } }));
}

export function getItem(id: string) {
  return unwrap(browserApi.GET("/items/{id}", { params: { path: { id } } }));
}

export function createItem(body: CreateItemBody) {
  return unwrap(browserApi.POST("/items", { body }));
}
