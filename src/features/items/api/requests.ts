import { unwrap } from "@/api/api-failure";
import { browserApi } from "@/api/browser-client";
import type { paths } from "@/api/schema";

import type { ItemFilters } from "../types";
import type { CreateItemBody, UpdateItemBody } from "./item-body";

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

/** The most the API gives in one page, so the select of categories rarely needs a second one. */
export function listItemCategories(cursor: string | null) {
  return unwrap(
    browserApi.GET("/item-categories", {
      params: {
        query: cursor === null ? { limit: 100 } : { limit: 100, cursor },
      },
    }),
  );
}

export function updateItem(id: string, body: UpdateItemBody) {
  return unwrap(
    browserApi.PATCH("/items/{id}", { params: { path: { id } }, body }),
  );
}
