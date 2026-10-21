import "server-only";

import createClient from "openapi-fetch";
import { cookies } from "next/headers";

import type { paths } from "./schema";
import { parseServerEnv } from "./server-env";

export { proxyToApi } from "./bff-proxy";

/**
 * Typed API client for Server Components (ADR-0001): calls API_URL directly,
 * with X-Origin-Secret and the cookie of the current request.
 */
export async function getApiClient() {
  const env = parseServerEnv(process.env, ["apiUrl", "originSecret"]);
  const cookie = (await cookies()).toString();
  return createClient<paths>({
    baseUrl: env.apiUrl,
    headers: {
      "x-origin-secret": env.originSecret,
      ...(cookie ? { cookie } : {}),
    },
  });
}
