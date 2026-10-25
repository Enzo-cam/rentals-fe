import { describe, expect, it } from "vitest";

import { readPasswordLinkToken } from "./password-link-token";

describe("readPasswordLinkToken", () => {
  it.each<[string, string | null]>([
    ["#token=abc", "abc"],
    ["token=abc", "abc"],
    ["#token=abc&x=1", "abc"],
    ["#x=1&token=abc", "abc"],
    ["#token=a&token=b", "a"],
    ["#token=Ab-_9", "Ab-_9"],
    ["", null],
    ["#", null],
    ["#token=", null],
    ["#otra=1", null],
    ["#tokens=abc", null],
  ])("%j → %j", (hash, expected) => {
    expect(readPasswordLinkToken(hash)).toBe(expected);
  });
});
