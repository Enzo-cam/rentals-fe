import { describe, expect, it } from "vitest";

import { parseWholeNumber } from "./whole-number";

describe("parseWholeNumber", () => {
  it.each<[string, number]>([
    ["0", 0],
    ["30", 30],
    ["1.500", 1500],
    [" 12 ", 12],
    ["100.000", 100000],
    ["007", 7],
  ])("must work %j", (text, value) => {
    expect(parseWholeNumber(text, 100000)).toBe(value);
  });

  it.each([
    "1,5",
    "1.5",
    "1.5000",
    "-1",
    "+1",
    "100.001",
    "100001",
    "",
    "  ",
    "abc",
    "1e3",
    "1..500",
    "0.500",
    "01.500",
    "00.500",
    "99999999999999999999",
  ])("must fail %j", (text) => {
    expect(parseWholeNumber(text, 100000)).toBeNull();
  });
});
