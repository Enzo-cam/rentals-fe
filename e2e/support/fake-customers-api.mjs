import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

const FIXTURES = JSON.parse(
  readFileSync(new URL("./customers-fixtures.json", import.meta.url), "utf8"),
);
const JSON_MEDIA_TYPE = /^application\/json\s*(?:;|$)/i;

/** `true` for `/customers` and `/customers/...`, the paths this fake answers. */
export function isCustomersPath(path) {
  return path === "/customers" || path.startsWith("/customers/");
}

function json(res, status, body, headers = {}) {
  res.writeHead(status, { "content-type": "application/json", ...headers });
  res.end(JSON.stringify(body));
}

function fail(res, status, error) {
  return json(res, status, { error });
}

function withoutBusiness(customer) {
  return Object.fromEntries(
    Object.entries(customer).filter(([key]) => key !== "businessId"),
  );
}

/**
 * In-memory stand-in for the customer endpoints of rentals-be (contract 2d5e46d). It does not validate or filter by
 * `q`: what a test needs from the API beyond the fixed pages (a filtered list, a 409, a 400) comes from an override.
 * The pages are cut by `pageSize` of the fixtures, with the cursor `c-<offset>`, over the customers ordered by name.
 * `accessOf(req)` is the one of the session fake (the same 401, 403 and 404), plus what the API adds here: the crew
 * cannot manage customers, and a business that is read only can read them but not write.
 */
export function createCustomersApi({ accessOf, frontOrigin }) {
  let store;
  function reset() {
    store = structuredClone(FIXTURES.customers);
  }
  reset();

  /** `rawBody` is the request body, already read by the caller. */
  function handle(req, res, path, rawBody) {
    const access = accessOf(req);
    if (access.failure)
      return fail(res, access.failure.status, access.failure.error);
    if (access.role === "crew") return fail(res, 403, "forbidden");

    if (req.method === "GET" && path === "/customers") {
      const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
      const offset = Number(
        url.searchParams.get("cursor")?.replace("c-", "") ?? 0,
      );
      const own = store
        .filter((customer) => customer.businessId === access.businessId)
        .sort((a, b) => a.name.localeCompare(b.name, "es"));
      const items = own
        .slice(offset, offset + FIXTURES.pageSize)
        .map(withoutBusiness);
      const next = offset + FIXTURES.pageSize;
      return json(res, 200, {
        items,
        nextCursor: next < own.length ? `c-${next}` : null,
      });
    }

    if (req.method === "POST" || req.method === "PATCH") {
      if (!JSON_MEDIA_TYPE.test(req.headers["content-type"] ?? "")) {
        return fail(res, 415, "unsupported_media_type");
      }
      if (req.headers.origin !== frontOrigin) {
        return fail(res, 403, "origin_not_allowed");
      }
      if (access.readOnly) return fail(res, 403, "read_only");
      if (req.method === "POST" && path === "/customers") {
        const created = {
          ...JSON.parse(rawBody),
          id: randomUUID(),
          businessId: access.businessId,
        };
        store.push(created);
        return json(res, 201, withoutBusiness(created));
      }
      const id = path.match(/^\/customers\/([^/]+)$/)?.[1];
      if (req.method === "PATCH" && id !== undefined) {
        const found = store.find(
          (customer) =>
            customer.id === id && customer.businessId === access.businessId,
        );
        if (!found) return fail(res, 404, "customer_not_found");
        Object.assign(found, JSON.parse(rawBody));
        return json(res, 200, withoutBusiness(found));
      }
    }
    return fail(res, 404, "not_found");
  }

  return { handle, reset };
}
