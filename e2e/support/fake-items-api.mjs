import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

const FIXTURES = JSON.parse(
  readFileSync(new URL("./items-fixtures.json", import.meta.url), "utf8"),
);
const JSON_MEDIA_TYPE = /^application\/json\s*(?:;|$)/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `true` for `/items`, `/items/...` and `/item-categories`, the paths this fake answers. */
export function isItemsPath(path) {
  return (
    path === "/items" ||
    path.startsWith("/items/") ||
    path === "/item-categories"
  );
}

function json(res, status, body, headers = {}) {
  res.writeHead(status, { "content-type": "application/json", ...headers });
  res.end(JSON.stringify(body));
}

function fail(res, status, error) {
  return json(res, status, { error });
}

function withoutBusiness(item) {
  return Object.fromEntries(
    Object.entries(item).filter(([key]) => key !== "businessId"),
  );
}

/**
 * In-memory stand-in for the item endpoints of rentals-be (contract ae5d79c). It does not validate, project or filter:
 * what a test needs from the API beyond the fixed pages (the crew's shape, a 409, a preview) comes from an override.
 * `accessOf(req)` is the one of the session fake: the same 401, 403 and 404 guards.
 */
export function createItemsApi({ accessOf, frontOrigin }) {
  let store;
  function reset() {
    store = structuredClone(FIXTURES.items);
  }
  reset();

  /** `rawBody` is the request body, already read by the caller. */
  function handle(req, res, path, rawBody) {
    const access = accessOf(req);
    if (access.failure)
      return fail(res, access.failure.status, access.failure.error);
    if (req.method === "GET" && path === "/items") {
      const items = FIXTURES.items
        .filter(
          (item) => item.businessId === access.businessId && !item.archived,
        )
        .map(withoutBusiness);
      return json(res, 200, { items, nextCursor: null });
    }
    if (req.method === "GET" && path === "/item-categories") {
      const names = FIXTURES.categories[access.businessId] ?? [];
      return json(res, 200, {
        items: names.map((name) => ({ name })),
        nextCursor: null,
      });
    }
    if (req.method === "POST" || req.method === "PATCH") {
      if (!JSON_MEDIA_TYPE.test(req.headers["content-type"] ?? "")) {
        return fail(res, 415, "unsupported_media_type");
      }
      if (req.headers.origin !== frontOrigin) {
        return fail(res, 403, "origin_not_allowed");
      }
      if (path === "/items") {
        const created = {
          ...JSON.parse(rawBody),
          id: randomUUID(),
          businessId: access.businessId,
          archived: false,
        };
        store.push(created);
        return json(res, 201, withoutBusiness(created));
      }
    }
    const id = path.match(/^\/items\/([^/]+)$/)?.[1];
    if ((req.method === "GET" || req.method === "PATCH") && id !== undefined) {
      if (!UUID.test(id)) return fail(res, 400, "invalid_request");
      const found = store.find(
        (item) => item.id === id && item.businessId === access.businessId,
      );
      if (!found) return fail(res, 404, "item_not_found");
      if (req.method === "PATCH") Object.assign(found, JSON.parse(rawBody));
      return json(res, 200, withoutBusiness(found));
    }
    const action = path.match(/^\/items\/([^/]+)\/(archive|reactivate)$/);
    if (req.method === "POST" && action) {
      const found = store.find(
        (item) =>
          item.id === action[1] && item.businessId === access.businessId,
      );
      if (!found) return fail(res, 404, "item_not_found");
      found.archived = action[2] === "archive";
      return json(res, 200, withoutBusiness(found));
    }
    return fail(res, 404, "not_found");
  }

  return { handle, reset };
}
