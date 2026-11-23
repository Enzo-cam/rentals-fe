import { describe, expect, it } from "vitest";

import {
  EMPTY_BOOKING_FORM,
  type BookingFormValues,
  type BookingLineValues,
} from "../types";
import {
  bookingFormSchema,
  createBodyOf,
  depositShortcutCents,
  suggestedTotalCentsOf,
} from "./booking-body";

const LUCIA = "aaaaaaaa-0000-4000-8000-000000000001";
const SILLA = "bbbbbbbb-0000-4000-8000-000000000001";
const COPA = "bbbbbbbb-0000-4000-8000-000000000002";

function line(
  itemId: string,
  quantity: string,
  price: string,
  filledPriceCents: number,
): BookingLineValues {
  return { itemId, itemName: "Artículo", quantity, price, filledPriceCents };
}

/** AC-1 (rentals-be#29): the hold of the casamiento, with the Silla price typed and the Copa one as the list shows it. */
const CASAMIENTO: BookingFormValues = {
  status: "hold",
  customerId: LUCIA,
  customerName: "Lucía",
  holdExpiresAt: "2030-03-12T12:00",
  deliveryAt: "2030-03-15T08:00",
  pickupAt: "2030-03-16T19:00",
  eventDate: "2030-03-15",
  occasion: "Casamiento",
  address: "",
  note: "",
  lines: [line(SILLA, "80", "5.000", 150000), line(COPA, "200", "350", 35000)],
  freight: "30.000",
  total: "450.000",
  depositAmount: "90.000",
  depositDate: "2030-03-01",
};

/** AC-2 (rentals-be#29): confirmed, nothing optional, the total as the form suggests it. */
const CONFIRMED: BookingFormValues = {
  status: "confirmed",
  customerId: LUCIA,
  customerName: "Lucía",
  holdExpiresAt: "",
  deliveryAt: "2030-03-15T08:00",
  pickupAt: "2030-03-16T19:00",
  eventDate: "",
  occasion: "",
  address: "",
  note: "",
  lines: [line(SILLA, "2", "1.500", 150000)],
  freight: "",
  total: null,
  depositAmount: "",
  depositDate: "",
};

describe("createBodyOf", () => {
  it("AC-1 (rentals-be#29): sends the hold with every optional, in cents and in Argentina time, in the order of the contract", () => {
    expect(JSON.stringify(createBodyOf(CASAMIENTO))).toBe(
      `{"status":"hold","customerId":"${LUCIA}","deliveryAt":"2030-03-15T08:00:00-03:00","pickupAt":"2030-03-16T19:00:00-03:00","holdExpiresAt":"2030-03-12T12:00:00-03:00","eventDate":"2030-03-15","occasion":"Casamiento","freightCents":3000000,"totalCents":45000000,"deposit":{"amountCents":9000000,"date":"2030-03-01"},"lines":[{"itemId":"${SILLA}","quantity":80,"priceCents":500000},{"itemId":"${COPA}","quantity":200,"priceCents":35000}]}`,
    );
  });

  it("AC-2 (rentals-be#29): a confirmed booking with the total untouched sends the suggested sum, freight 0 and nothing optional", () => {
    expect(JSON.stringify(createBodyOf(CONFIRMED))).toBe(
      `{"status":"confirmed","customerId":"${LUCIA}","deliveryAt":"2030-03-15T08:00:00-03:00","pickupAt":"2030-03-16T19:00:00-03:00","freightCents":0,"totalCents":300000,"lines":[{"itemId":"${SILLA}","quantity":2,"priceCents":150000}]}`,
    );
  });

  it("does not send the expiry that a hold left behind when it became confirmed", () => {
    const body = createBodyOf({
      ...CONFIRMED,
      holdExpiresAt: "2030-03-12T12:00",
    });
    expect(body).not.toHaveProperty("holdExpiresAt");
  });

  it("trims the optional texts and leaves out the ones that end up empty", () => {
    const body = createBodyOf({
      ...CONFIRMED,
      address: " Av. 9 de Julio 1200 ",
      note: "   ",
      occasion: " Cumpleaños ",
    });
    expect(body.address).toBe("Av. 9 de Julio 1200");
    expect(body.occasion).toBe("Cumpleaños");
    expect(body).not.toHaveProperty("note");
  });

  it("sends a price the person did not touch as the one shown, even with cents", () => {
    const body = createBodyOf({
      ...CONFIRMED,
      lines: [line(SILLA, "2", "1.500,50", 150050)],
    });
    expect(body.lines[0].priceCents).toBe(150050);
    expect(body.totalCents).toBe(300100);
  });

  it("sends a price the person retyped as typed, and a total typed over the suggestion", () => {
    const body = createBodyOf({
      ...CONFIRMED,
      lines: [line(SILLA, "2", "1.800", 150000)],
      total: "$ 3.000",
    });
    expect(body.lines[0].priceCents).toBe(180000);
    expect(body.totalCents).toBe(300000);
  });

  it("sends an empty freight as 0 and a typed one in cents", () => {
    expect(createBodyOf({ ...CONFIRMED, freight: "" }).freightCents).toBe(0);
    expect(createBodyOf({ ...CONFIRMED, freight: "1.200" }).freightCents).toBe(
      120000,
    );
  });
});

describe("suggestedTotalCentsOf", () => {
  it("adds quantity times price of every line and the freight", () => {
    expect(suggestedTotalCentsOf(CASAMIENTO)).toBe(50000000);
  });

  it("is the freight alone without lines, and 0 without freight either", () => {
    expect(suggestedTotalCentsOf({ lines: [], freight: "30.000" })).toBe(
      3000000,
    );
    expect(suggestedTotalCentsOf({ lines: [], freight: "" })).toBe(0);
  });

  it("does not break while the person is still typing: what does not read counts as 0", () => {
    expect(
      suggestedTotalCentsOf({
        lines: [
          line(SILLA, "", "1.500", 150000),
          line(COPA, "10", "1,5", 35000),
          line(SILLA, "2", "1.500", 150000),
        ],
        freight: "abc",
      }),
    ).toBe(300000);
  });

  it("takes the filled price of a line that was not touched, which may carry cents", () => {
    expect(
      suggestedTotalCentsOf({
        lines: [line(SILLA, "3", "1.500,50", 150050)],
        freight: "",
      }),
    ).toBe(450150);
  });
});

describe("depositShortcutCents", () => {
  it("AC-1 (rentals-be#29): 20 % of 450.000 is 90.000, in cents", () => {
    expect(depositShortcutCents(45000000, 20)).toBe(9000000);
  });

  it.each([
    ["1.234 pesos at 10 %", 123400, 12300],
    ["1.235 pesos at 10 %", 123500, 12400],
    ["1.234,50 pesos at 10 %, which has cents", 123450, 12300],
    ["a total of 0", 0, 0],
  ])("rounds to whole pesos, half up: %s", (_label, total, expected) => {
    expect(depositShortcutCents(total, 10)).toBe(expected);
  });

  it("does not lose precision at the biggest total the API takes", () => {
    expect(depositShortcutCents(10_000_000_000, 50)).toBe(5_000_000_000);
  });
});

/** The fields that the schema marks, by path (`lines.0.price`), each with its first message. */
function issuesOf(values: BookingFormValues): Record<string, string> {
  const result = bookingFormSchema.safeParse(values);
  if (result.success) return {};
  const found: Record<string, string> = {};
  for (const issue of result.error.issues) {
    found[issue.path.join(".")] ??= issue.message;
  }
  return found;
}

describe("bookingFormSchema", () => {
  it("accepts the booking of AC-1, the one of AC-2 and a price the person did not touch that carries cents", () => {
    expect(issuesOf(CASAMIENTO)).toEqual({});
    expect(issuesOf(CONFIRMED)).toEqual({});
    expect(
      issuesOf({
        ...CONFIRMED,
        lines: [line(SILLA, "2", "1.500,50", 150050)],
      }),
    ).toEqual({});
  });

  it("AC-5 (rentals-be#29): marks each field that is wrong, all at once, without asking the API", () => {
    const issues = issuesOf({
      ...CASAMIENTO,
      customerId: "",
      customerName: "",
      lines: [],
      holdExpiresAt: "",
      depositDate: "",
    });
    expect(Object.keys(issues).sort()).toEqual([
      "customerId",
      "depositDate",
      "holdExpiresAt",
      "lines",
    ]);
    expect(
      Object.keys(
        issuesOf({
          ...CASAMIENTO,
          lines: [line(SILLA, "80", "1,5", 150000)],
        }),
      ),
    ).toEqual(["lines.0.price"]);
  });

  it("asks for the expiry only of a hold, and for the total only if the person erased it", () => {
    expect(
      Object.keys(
        issuesOf({ ...CASAMIENTO, holdExpiresAt: "2030-02-30T10:00" }),
      ),
    ).toEqual(["holdExpiresAt"]);
    expect(issuesOf({ ...CONFIRMED, holdExpiresAt: "" })).toEqual({});
    expect(Object.keys(issuesOf({ ...CONFIRMED, total: "" }))).toEqual([
      "total",
    ]);
    expect(issuesOf({ ...CONFIRMED, total: null })).toEqual({});
  });

  it("asks for a whole booking with nothing filled in: the customer, the lines and the three moments", () => {
    expect(Object.keys(issuesOf(EMPTY_BOOKING_FORM)).sort()).toEqual([
      "customerId",
      "deliveryAt",
      "holdExpiresAt",
      "lines",
      "pickupAt",
    ]);
  });

  it.each([
    ["a quantity that is empty", { quantity: "" }, "lines.0.quantity"],
    ["a quantity of 0", { quantity: "0" }, "lines.0.quantity"],
    ["a quantity over 100.000", { quantity: "100.001" }, "lines.0.quantity"],
    ["a price with a comma", { price: "1,5" }, "lines.0.price"],
    ["a price that was erased", { price: "" }, "lines.0.price"],
  ])("marks the line with %s", (_label, typed, path) => {
    expect(
      Object.keys(
        issuesOf({
          ...CONFIRMED,
          lines: [{ ...CONFIRMED.lines[0], ...typed }],
        }),
      ),
    ).toEqual([path]);
  });

  it("allows up to 100 lines and no more", () => {
    const many = (count: number) =>
      Array.from({ length: count }, (_, index) =>
        line(
          `bbbbbbbb-0000-4000-8000-${String(index).padStart(12, "0")}`,
          "1",
          "1",
          100,
        ),
      );
    expect(issuesOf({ ...CONFIRMED, lines: many(100) })).toEqual({});
    expect(Object.keys(issuesOf({ ...CONFIRMED, lines: many(101) }))).toEqual([
      "lines",
    ]);
  });

  it.each([
    ["a deposit without a date", { depositAmount: "5.000" }, "depositDate"],
    [
      "a date without a deposit",
      { depositDate: "2030-03-01" },
      "depositAmount",
    ],
    [
      "a deposit of 0",
      { depositAmount: "0", depositDate: "2030-03-01" },
      "depositAmount",
    ],
    [
      "a deposit that is not pesos",
      { depositAmount: "5,5", depositDate: "2030-03-01" },
      "depositAmount",
    ],
    [
      "a date of the deposit that is not a day",
      { depositAmount: "5.000", depositDate: "2030-02-30" },
      "depositDate",
    ],
    ["a freight with a comma", { freight: "1,5" }, "freight"],
    [
      "a delivery that is not a moment",
      { deliveryAt: "2030-03-15" },
      "deliveryAt",
    ],
    ["a pickup that is empty", { pickupAt: "" }, "pickupAt"],
    [
      "an event day that does not exist",
      { eventDate: "2030-02-30" },
      "eventDate",
    ],
    [
      "an occasion over 120 characters",
      { occasion: "x".repeat(121) },
      "occasion",
    ],
    ["an address over 300 characters", { address: "x".repeat(301) }, "address"],
    ["a note over 2000 characters", { note: "x".repeat(2001) }, "note"],
  ])("marks %s", (_label, typed, path) => {
    expect(Object.keys(issuesOf({ ...CONFIRMED, ...typed }))).toEqual([path]);
  });
});
