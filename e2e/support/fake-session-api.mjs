import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

const FIXTURES = JSON.parse(
  readFileSync(new URL("./session-fixtures.json", import.meta.url), "utf8"),
);
const COOKIE_NAME = "__Host-session";
const SESSION_SECONDS = 12 * 60 * 60;
const ALPHANUMERIC = /[\p{L}\p{N}]/u;
const JSON_MEDIA_TYPE = /^application\/json\s*(?:;|$)/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const SESSION_PATHS = new Set([
  "/auth/login",
  "/auth/password",
  "/auth/logout",
  "/auth/select-business",
  "/me",
  "/me/businesses",
]);

function json(res, status, body, headers = {}) {
  res.writeHead(status, { "content-type": "application/json", ...headers });
  res.end(JSON.stringify(body));
}

function fail(res, status, error, headers = {}) {
  return json(res, status, { error }, headers);
}

/** Same rule as `isValidBusinessUserPassword` in rentals-be: 8 to 128 code points, one that is not a letter or digit. */
function isValidPassword(password) {
  const characters = Array.from(password);
  return (
    characters.length >= 8 &&
    characters.length <= 128 &&
    characters.some((character) => !ALPHANUMERIC.test(character))
  );
}

/** `null` unless the body is an object with exactly the `shape` keys and string values within their limits. */
function parseStrictBody(raw, shape) {
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return null;
  }
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }
  const keys = Object.keys(shape);
  if (Object.keys(body).length !== keys.length) return null;
  for (const key of keys) {
    const value = body[key];
    const rule = shape[key];
    if (typeof value !== "string") return null;
    if (value.length < 1 || value.length > rule.max) return null;
    if (rule.uuid && !UUID.test(value)) return null;
  }
  return body;
}

function sessionCookie(value, maxAge) {
  return `${COOKIE_NAME}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

function readCookie(header) {
  for (const part of (header ?? "").split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE_NAME) return rest.join("=");
  }
  return null;
}

/**
 * In-memory stand-in for the business-user endpoints of rentals-be (contract 5262de0). It rejects what the real API
 * rejects: a mutation without JSON (415), a foreign Origin (403) and a body with more or fewer fields (400).
 */
export function createSessionApi({ frontOrigin }) {
  let state;
  function reset() {
    state = {
      users: structuredClone(FIXTURES.users),
      tokens: structuredClone(FIXTURES.tokens),
      sessions: new Map(),
    };
  }
  reset();

  function businessesOf(userId) {
    return FIXTURES.memberships
      .filter((membership) => membership.userId === userId)
      .map((membership) => {
        const business = FIXTURES.businesses.find(
          (candidate) => candidate.id === membership.businessId,
        );
        return { id: business.id, name: business.name, role: membership.role };
      })
      .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  }

  function currentSession(req) {
    const sid = readCookie(req.headers.cookie);
    return sid ? (state.sessions.get(sid) ?? null) : null;
  }

  function signIn(res, userId) {
    const businesses = businessesOf(userId);
    if (businesses.length === 0) return fail(res, 403, "no_membership");
    const selectedBusinessId =
      businesses.length === 1 ? businesses[0].id : null;
    const sid = randomUUID();
    state.sessions.set(sid, { userId, bid: selectedBusinessId });
    return json(
      res,
      200,
      { selectedBusinessId, businesses },
      {
        "set-cookie": sessionCookie(sid, SESSION_SECONDS),
        "cache-control": "no-store",
      },
    );
  }

  function login(res, raw) {
    const body = parseStrictBody(raw, {
      email: { max: 254 },
      password: { max: 1024 },
    });
    if (!body) return fail(res, 400, "invalid_request");
    const user = state.users.find(
      (candidate) => candidate.email === body.email,
    );
    if (!user || user.password === null || user.password !== body.password) {
      return fail(res, 401, "invalid_credentials");
    }
    return signIn(res, user.id);
  }

  function definePassword(res, raw) {
    const body = parseStrictBody(raw, {
      token: { max: 256 },
      password: { max: 1024 },
    });
    if (!body) return fail(res, 400, "invalid_request");
    if (!isValidPassword(body.password)) {
      return fail(res, 400, "weak_password");
    }
    const link = state.tokens.find(
      (candidate) => candidate.token === body.token,
    );
    if (!link || link.used) return fail(res, 401, "invalid_token");
    link.used = true;
    const user = state.users.find((candidate) => candidate.id === link.userId);
    user.password = body.password;
    return signIn(res, user.id);
  }

  function selectBusiness(req, res, raw) {
    const session = currentSession(req);
    if (!session) return fail(res, 401, "unauthenticated");
    const body = parseStrictBody(raw, { businessId: { max: 36, uuid: true } });
    if (!body) return fail(res, 400, "invalid_request");
    const allowed = businessesOf(session.userId).some(
      (business) => business.id === body.businessId,
    );
    if (!allowed) return fail(res, 404, "business_not_found");
    const sid = randomUUID();
    state.sessions.set(sid, { userId: session.userId, bid: body.businessId });
    res.writeHead(204, {
      "set-cookie": sessionCookie(sid, SESSION_SECONDS),
      "cache-control": "no-store",
    });
    return res.end();
  }

  function logout(res) {
    res.writeHead(204, {
      "set-cookie": sessionCookie("", 0),
      "cache-control": "no-store",
    });
    return res.end();
  }

  /**
   * The same guards for every endpoint of a business: 401 without a session, 403 without a selected business, 404
   * without a membership. `failure` says which; otherwise the business, the role and whether it is read only.
   */
  function accessOf(req) {
    const session = currentSession(req);
    if (!session) return { failure: { status: 401, error: "unauthenticated" } };
    if (session.bid === null) {
      return { failure: { status: 403, error: "business_not_selected" } };
    }
    const membership = businessesOf(session.userId).find(
      (business) => business.id === session.bid,
    );
    if (!membership) {
      return { failure: { status: 404, error: "business_not_found" } };
    }
    const business = FIXTURES.businesses.find(
      (candidate) => candidate.id === session.bid,
    );
    return {
      userId: session.userId,
      businessId: business.id,
      business,
      role: membership.role,
      readOnly: !["trial", "active"].includes(business.status),
    };
  }

  function me(req, res) {
    const access = accessOf(req);
    if (access.failure)
      return fail(res, access.failure.status, access.failure.error);
    const { business, readOnly } = access;
    const user = state.users.find(
      (candidate) => candidate.id === access.userId,
    );
    const shown =
      access.role === "owner"
        ? {
            id: business.id,
            name: business.name,
            readOnly,
            status: business.status,
            expiresAt: business.expiresAt,
          }
        : { id: business.id, name: business.name, readOnly };
    return json(
      res,
      200,
      {
        user: { id: user.id, name: user.name, email: user.email },
        role: access.role,
        business: shown,
      },
      { "cache-control": "no-store" },
    );
  }

  function myBusinesses(req, res) {
    const session = currentSession(req);
    if (!session) return fail(res, 401, "unauthenticated");
    return json(
      res,
      200,
      { businesses: businessesOf(session.userId) },
      { "cache-control": "no-store" },
    );
  }

  /** `rawBody` is the request body, already read by the caller. */
  function handle(req, res, path, rawBody) {
    if (req.method === "GET" && path === "/me") return me(req, res);
    if (req.method === "GET" && path === "/me/businesses") {
      return myBusinesses(req, res);
    }
    if (req.method !== "POST" || path.startsWith("/me")) {
      return fail(res, 404, "not_found");
    }
    if (!JSON_MEDIA_TYPE.test(req.headers["content-type"] ?? "")) {
      return fail(res, 415, "unsupported_media_type");
    }
    if (req.headers.origin !== frontOrigin) {
      return fail(res, 403, "origin_not_allowed");
    }
    if (path === "/auth/login") return login(res, rawBody);
    if (path === "/auth/password") return definePassword(res, rawBody);
    if (path === "/auth/select-business") {
      return selectBusiness(req, res, rawBody);
    }
    return logout(res);
  }

  return { handle, reset, accessOf };
}
