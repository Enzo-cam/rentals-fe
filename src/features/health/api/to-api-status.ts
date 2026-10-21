import type { ApiHealth } from "../types";

/**
 * Outcome of GET /health: HTTP status and parsed body, or undefined if the call
 * failed. The body stays `unknown`: openapi-fetch does not validate it, and a
 * body that does not match the contract must read as "unreachable" (AC-3).
 */
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
