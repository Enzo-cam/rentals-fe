import createClient from "openapi-fetch";

import type { paths } from "./schema";

const REQUEST_TIMEOUT_MS = 15_000;

/**
 * The browser talks only to this origin: the `/api` proxy adds the origin secret and forwards the session cookie
 * (ADR-0001). A call that gets no answer in 15 s fails as `network`.
 * @see docs/adr/0001-sesion-y-proxy-bff.md
 */
export const browserApi = createClient<paths>({
  baseUrl: "/api",
  fetch: (request) =>
    fetch(request, {
      signal: AbortSignal.any([
        request.signal,
        AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      ]),
    }),
});
