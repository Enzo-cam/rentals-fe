import type { ApiHealth } from "../types";

/** `body` stays `unknown`: openapi-fetch does not validate it, and an off-contract body must read as unreachable. */
export type HealthResult = { status: number; body: unknown } | undefined;

export function toApiStatus(result: HealthResult): ApiHealth {
  if (!result) return "unreachable";
  if (result.status === 503) return "down";
  const { body } = result;
  const isOk =
    typeof body === "object" &&
    body !== null &&
    "status" in body &&
    body.status === "ok";
  return result.status === 200 && isOk ? "ok" : "unreachable";
}
