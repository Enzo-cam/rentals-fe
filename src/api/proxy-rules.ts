import { isIP } from "node:net";

/** @see docs/adr/0001-sesion-y-proxy-bff.md */
const REQUEST_HEADER_ALLOWLIST = [
  "cookie",
  "content-type",
  "accept",
  "idempotency-key",
  "origin",
  "user-agent",
] as const;

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

/** Defaults to `no-store` so a per-session answer is never cached when the API says nothing. */
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

/** @see docs/adr/0001-sesion-y-proxy-bff.md (CSRF) */
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

/** Trusting the rightmost entry assumes the hosting edge sets it: pending until hosting is chosen. */
export function clientIpFrom(headers: Headers): string | undefined {
  const last = headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  return last && isIP(last) !== 0 ? last : undefined;
}
