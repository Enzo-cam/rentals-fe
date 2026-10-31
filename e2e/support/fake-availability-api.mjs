import { readFileSync } from "node:fs";

const FIXTURES = JSON.parse(
  readFileSync(
    new URL("./availability-fixtures.json", import.meta.url),
    "utf8",
  ),
);

/** `true` for `/availability`, the only path this fake answers. */
export function isAvailabilityPath(path) {
  return path === "/availability";
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
 * Stand-in for `GET /availability` of rentals-be (contract 2d5e46d). It does not validate the period or filter by `q`
 * and it answers the same numbers for any period: what a test needs beyond the fixed pages (a filtered list, a 400)
 * comes from an override. The pages are cut by `pageSize` of the fixtures, with the cursor `a-<offset>`, over the items
 * of the business in the order of the fixtures. `accessOf(req)` is the one of the session fake: the same 401, 403 and
 * 404, and every role can read it, also when the business is read only.
 */
export function createAvailabilityApi({ accessOf }) {
  function handle(req, res, path) {
    const access = accessOf(req);
    if (access.failure)
      return fail(res, access.failure.status, access.failure.error);

    if (req.method === "GET" && path === "/availability") {
      const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
      const offset = Number(
        url.searchParams.get("cursor")?.replace("a-", "") ?? 0,
      );
      const own = FIXTURES.items.filter(
        (item) => item.businessId === access.businessId,
      );
      const items = own
        .slice(offset, offset + FIXTURES.pageSize)
        .map(withoutBusiness);
      const next = offset + FIXTURES.pageSize;
      return json(res, 200, {
        items,
        nextCursor: next < own.length ? `a-${next}` : null,
      });
    }
    return fail(res, 404, "not_found");
  }

  return { handle };
}
