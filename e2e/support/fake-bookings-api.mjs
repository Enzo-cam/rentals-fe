import { readFileSync } from "node:fs";

const FIXTURES = JSON.parse(
  readFileSync(new URL("./bookings-fixtures.json", import.meta.url), "utf8"),
);

const JSON_MEDIA_TYPE = /^application\/json\s*(?:;|$)/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The state each action needs, the one it leaves, the field it stamps with the moment and who may do it. `manage` is
 * owner and manager; recording a delivery or a return is open to the crew too.
 */
const TRANSITIONS = {
  confirm: {
    from: ["hold"],
    to: "confirmed",
    stamp: null,
    clearsHold: true,
    manage: true,
  },
  deliver: {
    from: ["confirmed"],
    to: "delivered",
    stamp: "deliveredAt",
    clearsHold: false,
    manage: false,
  },
  return: {
    from: ["delivered"],
    to: "returned",
    stamp: "returnRecordedAt",
    clearsHold: false,
    manage: false,
  },
  cancel: {
    from: ["hold", "confirmed"],
    to: "cancelled",
    stamp: "cancelledAt",
    clearsHold: true,
    manage: true,
  },
};

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

/** What the API sends to the roles that cannot view prices (the crew): no line prices, no freight, no deposit. */
function withoutPrices(booking) {
  const shown = { ...booking };
  delete shown.freightCents;
  delete shown.deposit;
  shown.lines = booking.lines.map((line) => {
    const bare = { ...line };
    delete bare.priceCents;
    return bare;
  });
  return shown;
}

/**
 * Stand-in for the endpoints of the bookings of rentals-be (contract 2d5e46d). It validates little and does not
 * filter by `status`: what a test needs beyond the fixed pages (a filtered list, a 400, a stock conflict) comes from an
 * override. The pages are cut by `pageSize` of the fixtures, with the cursor `b-<offset>`, over the bookings of the
 * business in the order of the fixtures (delivery date). The crew gets the shape without prices. The four actions
 * (confirm, deliver, return, cancel) move the booking in memory and the next read shows it; they check the content
 * type, the key (a UUID) and the role, but not the stock, the replay of a key or the hold expiry: the API owns those.
 * `accessOf(req)` is the one of the session fake: the same 401, 403 and 404, and every role can read, also when the
 * business is read only.
 */
export function createBookingsApi({ accessOf }) {
  let store;
  function reset() {
    store = structuredClone(FIXTURES.bookings);
  }
  reset();

  function shownTo(access, booking) {
    const shown = withoutBusiness(booking);
    return access.role === "crew" ? withoutPrices(shown) : shown;
  }

  function act(req, res, access, id, action) {
    const rule = TRANSITIONS[action];
    if (!JSON_MEDIA_TYPE.test(req.headers["content-type"] ?? "")) {
      return fail(res, 415, "unsupported_media_type");
    }
    if (access.readOnly) return fail(res, 403, "read_only");
    if (rule.manage && access.role === "crew") {
      return fail(res, 403, "forbidden");
    }
    if (!UUID.test(req.headers["idempotency-key"] ?? "")) {
      return fail(res, 400, "invalid_request");
    }
    const found = store.find(
      (booking) =>
        booking.id === id && booking.businessId === access.businessId,
    );
    if (!found) return fail(res, 404, "booking_not_found");
    if (!rule.from.includes(found.status)) {
      return fail(res, 409, "invalid_transition");
    }
    found.status = rule.to;
    if (rule.stamp !== null) found[rule.stamp] = new Date().toISOString();
    if (rule.clearsHold) {
      found.holdExpiresAt = null;
      found.holdExpired = false;
    }
    return json(res, 200, shownTo(access, found));
  }

  function handle(req, res, path) {
    const access = accessOf(req);
    if (access.failure)
      return fail(res, access.failure.status, access.failure.error);
    const own = store.filter(
      (booking) => booking.businessId === access.businessId,
    );

    if (req.method === "GET" && path === "/bookings") {
      const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
      const offset = Number(
        url.searchParams.get("cursor")?.replace("b-", "") ?? 0,
      );
      const items = own
        .slice(offset, offset + FIXTURES.pageSize)
        .map((booking) => shownTo(access, booking));
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
      return json(res, 200, shownTo(access, found));
    }

    const action = path.match(
      /^\/bookings\/([^/]+)\/(confirm|deliver|return|cancel)$/,
    );
    if (req.method === "POST" && action) {
      return act(req, res, access, action[1], action[2]);
    }
    return fail(res, 404, "not_found");
  }

  return { handle, reset };
}
