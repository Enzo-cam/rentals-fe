import { readFileSync } from "node:fs";

const FIXTURES = JSON.parse(
  readFileSync(new URL("./bookings-fixtures.json", import.meta.url), "utf8"),
);

/** `true` for `/bookings` and `/bookings/...`, the paths this fake answers. */
export function isBookingsPath(path) {
  return path === "/bookings" || path.startsWith("/bookings/");
}

function json(res, status, body, headers = {}) {
  res.writeHead(status, { "content-type": "application/json", ...headers });
  res.end(JSON.stringify(body));
}

function fail(res, status, error) {
  return json(res, status, { error });
}

function withoutBusiness(booking) {
  return Object.fromEntries(
    Object.entries(booking).filter(([key]) => key !== "businessId"),
  );
}

/**
 * Stand-in for the read endpoints of the bookings of rentals-be (contract 2d5e46d). It always answers the
 * BookingWithPrices shape and it does not validate, filter by `status` or project for the crew: what a test needs
 * beyond the fixed pages (a filtered list, the shape without prices, a 400) comes from an override. The pages are cut by
 * `pageSize` of the fixtures, with the cursor `b-<offset>`, over the bookings of the business in the order of the
 * fixtures (delivery date). `accessOf(req)` is the one of the session fake: the same 401, 403 and 404, and every role
 * can read, also when the business is read only.
 */
export function createBookingsApi({ accessOf }) {
  function handle(req, res, path) {
    const access = accessOf(req);
    if (access.failure)
      return fail(res, access.failure.status, access.failure.error);
    const own = FIXTURES.bookings.filter(
      (booking) => booking.businessId === access.businessId,
    );

    if (req.method === "GET" && path === "/bookings") {
      const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
      const offset = Number(
        url.searchParams.get("cursor")?.replace("b-", "") ?? 0,
      );
      const items = own
        .slice(offset, offset + FIXTURES.pageSize)
        .map(withoutBusiness);
      const next = offset + FIXTURES.pageSize;
      return json(res, 200, {
        items,
        nextCursor: next < own.length ? `b-${next}` : null,
      });
    }

    const id = path.match(/^\/bookings\/([^/]+)$/)?.[1];
    if (req.method === "GET" && id !== undefined) {
      const found = own.find((booking) => booking.id === id);
      if (!found) return fail(res, 404, "booking_not_found");
      return json(res, 200, withoutBusiness(found));
    }
    return fail(res, 404, "not_found");
  }

  return { handle };
}
