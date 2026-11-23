import { describe, expect, it } from "vitest";

import type { components } from "@/api/schema";
import {
  EMPTY_BOOKING_FORM,
  type BookingFormValues,
  type BookingLineValues,
  type BookingStatus,
} from "../types";
import {
  bookingFormSchema,
  createBodyOf,
  depositShortcutCents,
  formValuesOf,
  patchOf,
  suggestedTotalCentsOf,
} from "./booking-body";
import { bookingEditOf } from "./edit";

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

type BookingWithPrices = components["schemas"]["BookingWithPrices"];

const TABLON = "bbbbbbbb-0000-4000-8000-000000000003";

/** The hold of "Bar El Molino" of the fakes: Copa × 20 at $ 350, freight $ 1.000, total $ 8.000, no deposit. */
const HELD: BookingWithPrices = {
  id: "cccccccc-0000-4000-8000-000000000002",
  status: "hold",
  holdExpiresAt: "2030-03-08T15:00:00Z",
  holdExpired: false,
  customer: {
    id: "dddddddd-0000-4000-8000-000000000003",
    name: "Bar El Molino",
    whatsapp: "3624 987654",
  },
  deliveryAt: "2030-03-09T14:30:00Z",
  pickupAt: "2030-03-09T22:00:00Z",
  address: null,
  note: null,
  eventDate: null,
  occasion: null,
  deliveredAt: null,
  returnRecordedAt: null,
  cancelledAt: null,
  createdAt: "2030-02-21T15:00:00Z",
  balanceDueCents: 800000,
  lines: [
    {
      id: "eeeeeeee-0000-4000-8000-000000000003",
      itemId: COPA,
      itemName: "Copa de vino",
      quantity: 20,
      priceCents: 35000,
    },
  ],
  freightCents: 100000,
  totalCents: 800000,
  deposit: null,
};

/** The confirmed one of "Lucía Benítez": two lines, an address, a note and a deposit already loaded. */
const CONFIRMED_BOOKING: BookingWithPrices = {
  ...HELD,
  id: "cccccccc-0000-4000-8000-000000000001",
  status: "confirmed",
  holdExpiresAt: null,
  customer: {
    id: "dddddddd-0000-4000-8000-000000000004",
    name: "Lucía Benítez",
    whatsapp: "3794 555000",
  },
  address: "Av. Costanera 1200, Corrientes",
  note: "Llevar mantel de repuesto",
  lines: [
    {
      id: "eeeeeeee-0000-4000-8000-000000000001",
      itemId: SILLA,
      itemName: "Silla Tiffany blanca",
      quantity: 8,
      priceCents: 150000,
    },
    {
      id: "eeeeeeee-0000-4000-8000-000000000002",
      itemId: COPA,
      itemName: "Copa de vino",
      quantity: 12,
      priceCents: 35000,
    },
  ],
  freightCents: 180000,
  totalCents: 1800000,
  balanceDueCents: 1200000,
  deposit: { amountCents: 600000, date: "2030-03-01" },
};

const DELIVERED_BOOKING: BookingWithPrices = {
  ...CONFIRMED_BOOKING,
  id: "cccccccc-0000-4000-8000-000000000004",
  status: "delivered",
  deliveredAt: "2030-03-08T11:20:00Z",
  pickupAt: "2030-03-10T20:00:00Z",
};

function rulesOf(status: BookingStatus) {
  const rules = bookingEditOf(status);
  if (rules === null) throw new Error(`a ${status} booking has no edit`);
  return rules;
}

/** What goes on the wire when the person typed `typed` over a form that opened with `booking`. */
function patchJson(
  booking: BookingWithPrices,
  typed: Partial<BookingFormValues>,
): string {
  const opened = formValuesOf(booking);
  return JSON.stringify(
    patchOf(opened, { ...opened, ...typed }, rulesOf(booking.status)),
  );
}

describe("bookingEditOf", () => {
  it.each([
    ["hold", { wholeBooking: true, holdExpiry: true, pricesFixed: false }],
    ["confirmed", { wholeBooking: true, holdExpiry: false, pricesFixed: true }],
    [
      "delivered",
      { wholeBooking: false, holdExpiry: false, pricesFixed: false },
    ],
    ["returned", null],
    ["cancelled", null],
  ] as const)(
    "AC-18, AC-19, AC-20 (rentals-be#29): a %s booking",
    (status, rules) => {
      expect(bookingEditOf(status)).toEqual(rules);
    },
  );
});

describe("formValuesOf", () => {
  it("fills the hold with what it has: the instants in Argentina time, the prices as the form writes them and the stored total as a text", () => {
    expect(formValuesOf(HELD)).toEqual({
      status: "hold",
      customerId: "dddddddd-0000-4000-8000-000000000003",
      customerName: "Bar El Molino",
      holdExpiresAt: "2030-03-08T12:00",
      deliveryAt: "2030-03-09T11:30",
      pickupAt: "2030-03-09T19:00",
      eventDate: "",
      occasion: "",
      address: "",
      note: "",
      lines: [
        {
          itemId: COPA,
          itemName: "Copa de vino",
          quantity: "20",
          price: "350",
          filledPriceCents: 35000,
        },
      ],
      freight: "1.000",
      total: "8.000",
      depositAmount: "",
      depositDate: "",
    });
  });

  it("fills a confirmed booking without the expiry and with the deposit it has", () => {
    expect(formValuesOf(CONFIRMED_BOOKING)).toMatchObject({
      status: "confirmed",
      holdExpiresAt: "",
      address: "Av. Costanera 1200, Corrientes",
      note: "Llevar mantel de repuesto",
      freight: "1.800",
      total: "18.000",
      depositAmount: "6.000",
      depositDate: "2030-03-01",
    });
  });

  it("fills a delivered booking as confirmed: the form only knows whether the expiry is asked, and the status never goes in a patch", () => {
    expect(formValuesOf(DELIVERED_BOOKING).status).toBe("confirmed");
  });

  it("keeps the cents of a price, the freight and the total that the form cannot type", () => {
    const values = formValuesOf({
      ...HELD,
      lines: [{ ...HELD.lines[0], priceCents: 35050 }],
      freightCents: 100050,
      totalCents: 800050,
    });
    expect(values.lines[0]).toMatchObject({
      price: "350,50",
      filledPriceCents: 35050,
    });
    expect(values.freight).toBe("1.000,50");
    expect(values.total).toBe("8.000,50");
  });

  it("leaves the money empty for the shape the API sends to the roles that cannot view prices", () => {
    const values = formValuesOf({
      id: HELD.id,
      status: HELD.status,
      holdExpiresAt: HELD.holdExpiresAt,
      holdExpired: HELD.holdExpired,
      customer: HELD.customer,
      deliveryAt: HELD.deliveryAt,
      pickupAt: HELD.pickupAt,
      address: HELD.address,
      note: HELD.note,
      eventDate: HELD.eventDate,
      occasion: HELD.occasion,
      deliveredAt: HELD.deliveredAt,
      returnRecordedAt: HELD.returnRecordedAt,
      cancelledAt: HELD.cancelledAt,
      createdAt: HELD.createdAt,
      balanceDueCents: HELD.balanceDueCents,
      lines: [
        {
          id: HELD.lines[0].id,
          itemId: COPA,
          itemName: "Copa de vino",
          quantity: 20,
        },
      ],
    });
    expect(values).toMatchObject({
      freight: "",
      total: "",
      depositAmount: "",
      depositDate: "",
    });
    expect(values.lines[0]).toMatchObject({ price: "0", filledPriceCents: 0 });
  });

  it.each([
    ["a hold", HELD],
    ["a confirmed booking with its deposit", CONFIRMED_BOOKING],
    ["a delivered one, hidden fields included", DELIVERED_BOOKING],
  ])(
    "what %s opens with passes the schema, so saving it untouched is never blocked",
    (_label, booking) => {
      expect(bookingFormSchema.safeParse(formValuesOf(booking)).success).toBe(
        true,
      );
    },
  );

  it("asks again for the expiry of a hold that lost it, and never for the one of a confirmed booking", () => {
    const hold = bookingFormSchema.safeParse({
      ...formValuesOf(HELD),
      holdExpiresAt: "",
    });
    expect(hold.success).toBe(false);
    expect(
      bookingFormSchema.safeParse(formValuesOf(CONFIRMED_BOOKING)).success,
    ).toBe(true);
  });
});

describe("patchOf", () => {
  it.each([
    ["a hold", HELD],
    ["a confirmed booking", CONFIRMED_BOOKING],
    ["a delivered one", DELIVERED_BOOKING],
  ])("is empty when nothing was touched in %s", (_label, booking) => {
    expect(patchJson(booking, {})).toBe("{}");
  });

  it("AC-15 (rentals-be#29): sends only the note when only the note changed, and a cleared address as null", () => {
    expect(patchJson(HELD, { note: " Tocar el timbre " })).toBe(
      '{"note":"Tocar el timbre"}',
    );
    expect(patchJson(CONFIRMED_BOOKING, { address: "   " })).toBe(
      '{"address":null}',
    );
  });

  it("sends a cleared note, event day and occasion as null, and does not take a space around a text as a change", () => {
    const filled = {
      ...HELD,
      note: "Nota",
      eventDate: "2030-03-09",
      occasion: "Cumpleaños",
    };
    expect(patchJson(filled, { note: "", eventDate: "", occasion: " " })).toBe(
      '{"note":null,"eventDate":null,"occasion":null}',
    );
    expect(patchJson(filled, { note: "Nota ", occasion: " Cumpleaños" })).toBe(
      "{}",
    );
  });

  it("sends every key of a hold that changed, in cents, in Argentina time and in the order of the contract, and never the status", () => {
    const opened = formValuesOf(HELD);
    expect(
      patchJson(HELD, {
        status: "confirmed",
        customerId: LUCIA,
        deliveryAt: "2030-03-10T10:00",
        pickupAt: "2030-03-10T20:00",
        holdExpiresAt: "2030-03-09T09:00",
        address: " Av. 9 de Julio 1200 ",
        note: "Llevar mantel",
        eventDate: "2030-03-10",
        occasion: "Casamiento",
        freight: "2.000",
        total: "9.000",
        depositAmount: "1.000",
        depositDate: "2030-03-01",
        lines: [
          { ...opened.lines[0], quantity: "30" },
          line(SILLA, "10", "1.500", 150000),
        ],
      }),
    ).toBe(
      `{"customerId":"${LUCIA}","deliveryAt":"2030-03-10T10:00:00-03:00","pickupAt":"2030-03-10T20:00:00-03:00","holdExpiresAt":"2030-03-09T09:00:00-03:00","address":"Av. 9 de Julio 1200","note":"Llevar mantel","eventDate":"2030-03-10","occasion":"Casamiento","freightCents":200000,"totalCents":900000,"deposit":{"amountCents":100000,"date":"2030-03-01"},"lines":[{"itemId":"${COPA}","quantity":30},{"itemId":"${SILLA}","quantity":10,"priceCents":150000}]}`,
    );
  });

  describe("the total", () => {
    it("is never sent when the lines or the freight change and the person did not touch it: the stored one stays (rentals-be#28)", () => {
      const opened = formValuesOf(HELD);
      expect(
        patchJson(HELD, {
          lines: [{ ...opened.lines[0], quantity: "30" }],
          freight: "5.000",
        }),
      ).toBe(
        `{"freightCents":500000,"lines":[{"itemId":"${COPA}","quantity":30}]}`,
      );
      expect(patchJson(HELD, { total: null })).toBe("{}");
    });

    it("is sent in cents only when it changed, and the same number written another way is not a change", () => {
      expect(patchJson(HELD, { total: "9.000" })).toBe('{"totalCents":900000}');
      expect(patchJson(HELD, { total: "$ 8.000" })).toBe("{}");
    });

    it("is not parsed while untouched, because the stored one may carry cents", () => {
      const withCents = { ...HELD, totalCents: 800050 };
      expect(patchJson(withCents, { note: "Nota" })).toBe('{"note":"Nota"}');
      expect(patchJson(withCents, { total: "8.000" })).toBe(
        '{"totalCents":800000}',
      );
    });
  });

  describe("the freight", () => {
    it("is sent in cents when it changed, and an emptied one is 0 unless it already was", () => {
      expect(patchJson(HELD, { freight: "2.000" })).toBe(
        '{"freightCents":200000}',
      );
      expect(patchJson(HELD, { freight: "" })).toBe('{"freightCents":0}');
      expect(patchJson({ ...HELD, freightCents: 0 }, { freight: "" })).toBe(
        "{}",
      );
    });
  });

  describe("the deposit", () => {
    it("goes when there was none, with the amount in cents and the day", () => {
      expect(
        patchJson(HELD, { depositAmount: "1.000", depositDate: "2030-03-01" }),
      ).toBe('{"deposit":{"amountCents":100000,"date":"2030-03-01"}}');
    });

    it("never goes when there already was one: it is loaded once", () => {
      expect(
        patchJson(CONFIRMED_BOOKING, {
          depositAmount: "9.000",
          depositDate: "2030-03-05",
        }),
      ).toBe("{}");
    });
  });

  describe("the lines", () => {
    it("AC-17 (rentals-be#29): go whole when one is added or one price changed, with the price on the new one and on the one that changed only", () => {
      const opened = formValuesOf(HELD);
      expect(
        patchJson(HELD, {
          lines: [
            { ...opened.lines[0], price: "400" },
            line(SILLA, "10", "1.500", 150000),
          ],
        }),
      ).toBe(
        `{"lines":[{"itemId":"${COPA}","quantity":20,"priceCents":40000},{"itemId":"${SILLA}","quantity":10,"priceCents":150000}]}`,
      );
    });

    it("go whole without a price when only a quantity changed, and a line that was removed is left out", () => {
      const opened = formValuesOf(CONFIRMED_BOOKING);
      expect(
        patchJson(HELD, {
          lines: [{ ...formValuesOf(HELD).lines[0], quantity: "30" }],
        }),
      ).toBe(`{"lines":[{"itemId":"${COPA}","quantity":30}]}`);
      expect(patchJson(CONFIRMED_BOOKING, { lines: [opened.lines[1]] })).toBe(
        `{"lines":[{"itemId":"${COPA}","quantity":12}]}`,
      );
    });

    it("do not go when what the person did is to write a price as it already was, or to leave a price with cents as it came", () => {
      const opened = formValuesOf(HELD);
      expect(
        patchJson(HELD, { lines: [{ ...opened.lines[0], price: "$ 350" }] }),
      ).toBe("{}");
      const withCents = {
        ...HELD,
        lines: [{ ...HELD.lines[0], priceCents: 35050 }],
      };
      const openedCents = formValuesOf(withCents);
      expect(
        patchJson(withCents, {
          lines: [{ ...openedCents.lines[0], quantity: "21" }],
        }),
      ).toBe(`{"lines":[{"itemId":"${COPA}","quantity":21}]}`);
      expect(patchJson(withCents, {})).toBe("{}");
    });

    it("send the price of a new line as shown, and as typed when the person changed it", () => {
      const opened = formValuesOf(HELD);
      expect(
        patchJson(HELD, {
          lines: [...opened.lines, line(SILLA, "2", "1.800", 150000)],
        }),
      ).toBe(
        `{"lines":[{"itemId":"${COPA}","quantity":20},{"itemId":"${SILLA}","quantity":2,"priceCents":180000}]}`,
      );
    });
  });

  describe("a confirmed booking", () => {
    it("AC-18 (rentals-be#29): sends the lines without any price when a quantity changed, because the old prices are fixed", () => {
      const opened = formValuesOf(CONFIRMED_BOOKING);
      expect(
        patchJson(CONFIRMED_BOOKING, {
          lines: [{ ...opened.lines[0], quantity: "9" }, opened.lines[1]],
        }),
      ).toBe(
        `{"lines":[{"itemId":"${SILLA}","quantity":9},{"itemId":"${COPA}","quantity":12}]}`,
      );
    });

    it("never sends the price of a line that was there, not even typed over: it is fixed on confirming, and a different one is a 409 line_price_locked", () => {
      const opened = formValuesOf(CONFIRMED_BOOKING);
      expect(
        patchJson(CONFIRMED_BOOKING, {
          lines: [{ ...opened.lines[0], price: "1.800" }, opened.lines[1]],
        }),
      ).toBe("{}");
      expect(
        patchJson(CONFIRMED_BOOKING, {
          note: "Nota",
          lines: [{ ...opened.lines[0], price: "1.800" }, opened.lines[1]],
        }),
      ).toBe('{"note":"Nota"}');
    });

    it("sends the price of a line that is new, which the API takes as the price of the line", () => {
      const opened = formValuesOf(CONFIRMED_BOOKING);
      expect(
        patchJson(CONFIRMED_BOOKING, {
          lines: [...opened.lines, line(TABLON, "4", "2.800", 280000)],
        }),
      ).toBe(
        `{"lines":[{"itemId":"${SILLA}","quantity":8},{"itemId":"${COPA}","quantity":12},{"itemId":"${TABLON}","quantity":4,"priceCents":280000}]}`,
      );
    });

    it("never sends the expiry that a hold had, nor the deposit that is already there", () => {
      expect(
        patchJson(CONFIRMED_BOOKING, {
          holdExpiresAt: "2030-03-09T09:00",
          depositAmount: "9.000",
          depositDate: "2030-03-05",
          note: "Nota",
        }),
      ).toBe('{"note":"Nota"}');
    });
  });

  describe("a delivered booking", () => {
    it("AC-19 (rentals-be#29): sends only the pickup when only the pickup changed", () => {
      expect(
        patchJson(DELIVERED_BOOKING, { pickupAt: "2030-03-10T21:00" }),
      ).toBe('{"pickupAt":"2030-03-10T21:00:00-03:00"}');
    });

    it("sends nothing but the pickup, the address and the note, whatever else the values say: any other key is a 409 booking_not_editable", () => {
      const opened = formValuesOf(DELIVERED_BOOKING);
      expect(
        patchJson(DELIVERED_BOOKING, {
          customerId: LUCIA,
          deliveryAt: "2030-03-10T10:00",
          pickupAt: "2030-03-10T21:00",
          holdExpiresAt: "2030-03-09T09:00",
          address: "Av. 9 de Julio 1200",
          note: "Llevar mantel",
          eventDate: "2030-03-10",
          occasion: "Casamiento",
          freight: "2.000",
          total: "9.000",
          depositAmount: "9.000",
          depositDate: "2030-03-05",
          lines: [{ ...opened.lines[0], quantity: "1" }],
        }),
      ).toBe(
        '{"pickupAt":"2030-03-10T21:00:00-03:00","address":"Av. 9 de Julio 1200","note":"Llevar mantel"}',
      );
    });
  });
});
