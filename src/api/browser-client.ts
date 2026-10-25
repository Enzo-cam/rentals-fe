import createClient from "openapi-fetch";

import type { paths } from "./schema";
import { withTimeout } from "./with-timeout";

const REQUEST_TIMEOUT_MS = 15_000;

/**
 * The browser talks only to this origin: the `/api` proxy adds the origin secret and forwards the session cookie
 * (ADR-0001). A call that gets no answer in 15 s fails as `network`.
 * @see docs/adr/0001-sesion-y-proxy-bff.md
 */
export const browserApi = createClient<paths>({
  baseUrl: "/api",
  fetch: async (request) => {
    const timeout = withTimeout(request.signal, REQUEST_TIMEOUT_MS);
    try {
      return await fetch(request, { signal: timeout.signal });
    } finally {
      timeout.clear();
    }
  },
});
