import { describe, expect, it } from "vitest";

import { ApiError, type ApiFailure } from "../../../api/api-failure";

import { isItemMissing } from "./failures";

function rejected(status: number, code: string | null): ApiError {
  const failure: ApiFailure = { kind: "rejected", status, code };
  return new ApiError(failure);
}

describe("isItemMissing", () => {
  it("is true for a 404 item_not_found and for a 400 invalid_request", () => {
    expect(isItemMissing(rejected(404, "item_not_found"))).toBe(true);
    expect(isItemMissing(rejected(400, "invalid_request"))).toBe(true);
  });

  it("is false for a 404 business_not_found, other codes and failures that are not rejections", () => {
    expect(isItemMissing(rejected(404, "business_not_found"))).toBe(false);
    expect(isItemMissing(rejected(403, "forbidden"))).toBe(false);
    expect(isItemMissing(new ApiError({ kind: "network" }))).toBe(false);
    expect(
      isItemMissing(new ApiError({ kind: "unavailable", status: 502 })),
    ).toBe(false);
    expect(isItemMissing(new Error("boom"))).toBe(false);
    expect(isItemMissing(null)).toBe(false);
  });
});
