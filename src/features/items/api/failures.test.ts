import { describe, expect, it } from "vitest";

import { ApiError, type ApiFailure } from "@/api/api-failure";

import {
  isItemMissing,
  isOutOfServiceExceeded,
  rejectedPreviewOf,
  takenItemOf,
} from "./failures";

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

function conflict(error: string, archived = false): ApiError {
  const item = { id: "i-1", name: "Silla Tiffany blanca", archived };
  return new ApiError(
    { kind: "rejected", status: 409, code: error },
    { error, item },
  );
}

describe("takenItemOf", () => {
  it("says which field is taken and by which item", () => {
    expect(takenItemOf(conflict("item_name_taken"))).toEqual({
      field: "name",
      item: { id: "i-1", name: "Silla Tiffany blanca", archived: false },
    });
    expect(takenItemOf(conflict("item_code_taken", true))).toEqual({
      field: "code",
      item: { id: "i-1", name: "Silla Tiffany blanca", archived: true },
    });
  });

  it("is null for other failures and for a 409 whose body does not name an item", () => {
    expect(takenItemOf(rejected(409, "item_name_taken"))).toBeNull();
    expect(takenItemOf(rejected(400, "invalid_request"))).toBeNull();
    expect(
      takenItemOf(
        new ApiError(
          { kind: "rejected", status: 409, code: "item_name_taken" },
          { error: "item_name_taken", item: { id: 1 } },
        ),
      ),
    ).toBeNull();
    expect(takenItemOf(new Error("boom"))).toBeNull();
  });
});

describe("isOutOfServiceExceeded", () => {
  it("is true only for a 400 out_of_service_exceeds_stock", () => {
    expect(
      isOutOfServiceExceeded(rejected(400, "out_of_service_exceeds_stock")),
    ).toBe(true);
    expect(isOutOfServiceExceeded(rejected(400, "invalid_request"))).toBe(
      false,
    );
    expect(isOutOfServiceExceeded(new Error("boom"))).toBe(false);
  });
});

describe("rejectedPreviewOf", () => {
  const preview = { header: null, rows: [], valid: false };
  const rejection = (body: unknown, status = 422) =>
    new ApiError({ kind: "rejected", status, code: "import_rejected" }, body);

  it("gives the marked preview that a 422 import_rejected carries", () => {
    expect(
      rejectedPreviewOf(rejection({ error: "import_rejected", preview })),
    ).toEqual(preview);
  });

  it("is null for any other failure, or a 422 whose body has no preview", () => {
    expect(rejectedPreviewOf(rejection({ error: "import_rejected" }))).toBe(
      null,
    );
    expect(rejectedPreviewOf(rejection({ preview: 3 }))).toBe(null);
    expect(rejectedPreviewOf(rejection({ preview }, 400))).toBe(null);
    expect(rejectedPreviewOf(rejected(500, null))).toBe(null);
    expect(rejectedPreviewOf(new Error("boom"))).toBe(null);
    expect(rejectedPreviewOf(null)).toBe(null);
  });
});
