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
