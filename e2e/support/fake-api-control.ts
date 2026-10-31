import type { APIRequestContext } from "@playwright/test";

import { FAKE_API_URL } from "./env";

export type HealthMode =
  "ok" | "down" | "hang" | "reset" | "badbody" | "notfound";

export type RecordedRequest = {
  method: string;
  path: string;
  headers: Record<string, string>;
} | null;

export async function resetFakeApi(request: APIRequestContext) {
  await request.post(`${FAKE_API_URL}/__control/reset`);
}

export async function setHealthMode(
  request: APIRequestContext,
  mode: HealthMode,
) {
  await request.post(`${FAKE_API_URL}/__control/health/${mode}`);
}

export async function lastApiRequest(
  request: APIRequestContext,
): Promise<RecordedRequest> {
  const response = await request.get(`${FAKE_API_URL}/__control/last`);
  return ((await response.json()) as { lastRequest: RecordedRequest })
    .lastRequest;
}

export type ApiRequestLog = {
  method: string;
  path: string;
  query: string;
  headers: Record<string, string>;
  body: string | null;
};

export type OverrideSpec = {
  method: string;
  path: string;
  query?: Record<string, string>;
  times?: number;
  delayMs?: number;
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
  mode?: "reset";
};

/**
 * Changes the answer of the next `times` matching requests: a delay, a fixed response or a cut connection.
 * With `query`, only the requests that carry those parameters match.
 */
export async function overrideNext(
  request: APIRequestContext,
  spec: OverrideSpec,
) {
  await request.post(`${FAKE_API_URL}/__control/override`, { data: spec });
}

export async function apiRequests(
  request: APIRequestContext,
): Promise<ApiRequestLog[]> {
  const response = await request.get(`${FAKE_API_URL}/__control/requests`);
  return ((await response.json()) as { requests: ApiRequestLog[] }).requests;
}
