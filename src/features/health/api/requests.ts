import { getApiClient } from "@/api/server";

import type { ApiHealth } from "../types";
import { toApiStatus, type HealthResult } from "./to-api-status";

const HEALTH_TIMEOUT_MS = 3000;

/** Logs only the error name: undici messages can carry API_URL (INV-FE-04). */
export async function getApiHealth(): Promise<ApiHealth> {
  let result: HealthResult;
  let failure: string | undefined;
  try {
    const client = await getApiClient();
    const { data, error, response } = await client.GET("/health", {
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
    result = { status: response.status, body: data ?? error };
  } catch (error) {
    failure =
      error instanceof Error || error instanceof DOMException
        ? error.name
        : "UnknownError";
    result = undefined;
  }
  const health = toApiStatus(result);
  if (health !== "ok") {
    console.error(
      `[health] API ${health} (HTTP ${result?.status ?? "none"}${failure ? `, ${failure}` : ""})`,
    );
  }
  return health;
}
