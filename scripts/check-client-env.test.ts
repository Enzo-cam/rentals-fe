import { describe, expect, it } from "vitest";

import { findForbiddenPublicEnv } from "./check-client-env.mjs";

describe("findForbiddenPublicEnv", () => {
  it.each([
    ["NEXT_PUBLIC_ORIGIN_SECRET=x", ["NEXT_PUBLIC_ORIGIN_SECRET"]],
    ["process.env.NEXT_PUBLIC_API_URL", ["NEXT_PUBLIC_API_URL"]],
    ["NEXT_PUBLIC_BACKEND_API_URL_V2=", ["NEXT_PUBLIC_BACKEND_API_URL_V2"]],
    [
      "NEXT_PUBLIC_SECRET_KEY\nNEXT_PUBLIC_SECRET_KEY",
      ["NEXT_PUBLIC_SECRET_KEY"],
    ],
    ["NEXT_PUBLIC_SITE_NAME=Rentals", []],
    ["ORIGIN_SECRET=x\nAPI_URL=http://api", []],
    ["", []],
  ])("%j → %j", (text, expected) => {
    expect(findForbiddenPublicEnv(text)).toEqual(expected);
  });
});
