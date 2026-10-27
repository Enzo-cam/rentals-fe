import { readFileSync } from "node:fs";

const FIXTURES = JSON.parse(
  readFileSync(new URL("./items-fixtures.json", import.meta.url), "utf8"),
);
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
export function createItemsApi({ accessOf }) {
  let store;
  function reset() {
    store = structuredClone(FIXTURES.items);
  }
  reset();

  function handle(req, res, path) {
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
    const id = path.match(/^\/items\/([^/]+)$/)?.[1];
    if (req.method === "GET" && id !== undefined) {
      if (!UUID.test(id)) return fail(res, 400, "invalid_request");
      const found = store.find(
        (item) => item.id === id && item.businessId === access.businessId,
      );
      if (!found) return fail(res, 404, "item_not_found");
      return json(res, 200, withoutBusiness(found));
    }
    return fail(res, 404, "not_found");
  }

  return { handle, reset };
}
