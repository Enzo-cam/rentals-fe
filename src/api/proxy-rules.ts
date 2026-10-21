import { isIP } from "node:net";

/** Headers the proxy forwards to the API (ADR-0001). Everything else is dropped. */
const REQUEST_HEADER_ALLOWLIST = [
  "cookie",
  "content-type",
  "accept",
  "idempotency-key",
  "origin",
  "user-agent",
] as const;

/** Headers the proxy returns to the browser, besides every `set-cookie`. */
const RESPONSE_HEADER_ALLOWLIST = [
  "content-type",
  "cache-control",
  "retry-after",
] as const;

const SAFE_METHODS = new Set(["GET", "HEAD"]);

export function pickRequestHeaders(source: Headers): Headers {
  const picked = new Headers();
  for (const name of REQUEST_HEADER_ALLOWLIST) {
    const value = source.get(name);
    if (value !== null) picked.set(name, value);
  }
  return picked;
}

/** Allowlisted headers and every `set-cookie`; without `cache-control`, `no-store`. */
export function pickResponseHeaders(source: Headers): Headers {
  const picked = new Headers();
  for (const name of RESPONSE_HEADER_ALLOWLIST) {
    const value = source.get(name);
    if (value !== null) picked.set(name, value);
  }
  if (!picked.has("cache-control")) picked.set("cache-control", "no-store");
  for (const cookie of source.getSetCookie()) {
    picked.append("set-cookie", cookie);
  }
  return picked;
}

/**
 * CSRF check: GET and HEAD always pass. A mutation passes only if its Origin is
 * the front's own origin or, without Origin, if `Sec-Fetch-Site: same-origin`.
 */
export function passesCsrfCheck(
  method: string,
  origin: string | null,
  secFetchSite: string | null,
  frontOrigin: string,
): boolean {
  if (SAFE_METHODS.has(method.toUpperCase())) return true;
  if (origin !== null) return origin === frontOrigin;
  return secFetchSite === "same-origin";
}

/**
 * Rightmost X-Forwarded-For entry, if it is an IP. Trusting it assumes the
 * hosting edge overwrites or appends that entry itself: pending until the
 * hosting is chosen.
 */
export function clientIpFrom(headers: Headers): string | undefined {
  const last = headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  return last && isIP(last) !== 0 ? last : undefined;
}
