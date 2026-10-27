import { describe, expect, it } from "vitest";

import { formatCents, parsePesos, pesosTextOf } from "./money";

const NBSP = "\u00a0";

describe("formatCents", () => {
  it.each<[number, string]>([
    [0, `$${NBSP}0`],
    [35000, `$${NBSP}350`],
    [150000, `$${NBSP}1.500`],
    [150050, `$${NBSP}1.500,50`],
    [150010, `$${NBSP}1.500,10`],
    [5, `$${NBSP}0,05`],
    [10_000_000_000, `$${NBSP}100.000.000`],
  ])("%i cents → %j", (cents, text) => {
    expect(formatCents(cents)).toBe(text);
  });
});

describe("parsePesos", () => {
  it.each<[string, number]>([
    ["1500", 150000],
    ["1.500", 150000],
    ["$ 1.500", 150000],
    ["$1.500", 150000],
    [`$${NBSP}1.500`, 150000],
    [" 12.000 ", 1200000],
    ["0", 0],
    ["100.000.000", 10_000_000_000],
  ])("must work %j", (text, cents) => {
    expect(parsePesos(text)).toBe(cents);
  });

  it.each([
    "",
    " ",
    "$",
    "1500,50",
    "1,5",
    "1.5",
    "15.00",
    "1.5000",
    "-1",
    "1e3",
    "0x10",
    "abc",
    "100.000.001",
    "100000001",
    "1..500",
    ".500",
    "0.500",
    "$ 0.500",
    "$0.500",
    "99999999999999999999",
  ])("must fail %j", (text) => {
    expect(parsePesos(text)).toBeNull();
  });
});

describe("pesosTextOf", () => {
  it.each<[number, string]>([
    [0, "0"],
    [180000, "1.800"],
    [35000, "350"],
    [150050, "1.500,50"],
    [5, "0,05"],
    [10_000_000_000, "100.000.000"],
  ])("%i cents → %j", (cents, text) => {
    expect(pesosTextOf(cents)).toBe(text);
  });

  it.each([0, 100, 150000, 1200000, 10_000_000_000])(
    "round trips %i whole pesos through parsePesos",
    (cents) => {
      expect(parsePesos(pesosTextOf(cents))).toBe(cents);
    },
  );
});
