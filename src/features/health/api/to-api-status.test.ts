import { describe, expect, it } from "vitest";

import { toApiStatus, type HealthResult } from "./to-api-status";

describe("toApiStatus", () => {
  it.each<[string, HealthResult, string]>([
    ["200 with status ok", { status: 200, body: { status: "ok" } }, "ok"],
    ["503", { status: 503, body: { status: "unavailable" } }, "down"],
    ["503 without body", { status: 503, body: undefined }, "down"],
    ["404", { status: 404, body: { error: "not_found" } }, "unreachable"],
    ["500", { status: 500, body: undefined }, "unreachable"],
    ["network error", undefined, "unreachable"],
    [
      "200 with another status",
      { status: 200, body: { status: "nope" } },
      "unreachable",
    ],
    ["200 with a string body", { status: 200, body: "ok" }, "unreachable"],
    ["200 with null body", { status: 200, body: null }, "unreachable"],
    ["200 without body", { status: 200, body: undefined }, "unreachable"],
  ])("%s → %s", (_case, result, expected) => {
    expect(toApiStatus(result)).toBe(expected);
  });
});
