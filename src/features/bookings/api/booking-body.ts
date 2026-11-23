import { z } from "zod";

import type { paths } from "@/api/schema";
import { toApiInstant } from "@/lib/format/date-time";
import { parsePesos, pesosTextOf } from "@/lib/format/money";
import { parseWholeNumber } from "@/lib/format/whole-number";
import {
  MAX_LINES,
  MAX_QUANTITY,
  type BookingFormValues,
  type BookingLineValues,
} from "../types";

export type CreateBookingBody =
  paths["/bookings"]["post"]["requestBody"]["content"]["application/json"];

/** A value that must parse because the form schema already accepted it: if not, it is a bug, not input. */
function mustParse<T>(value: T | null): T {
  if (value === null) {
    throw new Error("the form values must pass their schema before being read");
  }
  return value;
}

function orNull(text: string): string | null {
  const trimmed = text.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * The price of a line in cents. A text equal to the one the field was filled with is a price the person did not touch,
 * and goes as the cents it was filled with: the list price may carry cents, which `parsePesos` cannot read back.
 */
function unitPriceCentsOf(line: BookingLineValues): number | null {
  return line.price.trim() === pesosTextOf(line.filledPriceCents)
    ? line.filledPriceCents
    : parsePesos(line.price);
}

const QUANTITY_MESSAGE = "Escribí una cantidad de 1 a 100.000.";
const PRICE_MESSAGE =
  "Escribí el precio en pesos, sin centavos: 1500, 1.500 o $ 1.500.";
const FREIGHT_MESSAGE =
  "Escribí el flete en pesos, sin centavos: 30000, 30.000 o $ 30.000.";
const TOTAL_MESSAGE =
  "Escribí el total en pesos, sin centavos: 450000, 450.000 o $ 450.000.";
const DEPOSIT_MESSAGE =
  "Escribí la seña en pesos, mayor que cero: 90000, 90.000 o $ 90.000.";
const DEPOSIT_DATE_MESSAGE = "Elegí el día de la seña.";

function fitsIn(max: number) {
  return (text: string) => Array.from(text.trim()).length <= max;
}

/** What a `datetime-local` field holds, as a real day and time: the one check that `toApiInstant` already makes. */
function isMoment(text: string): boolean {
  return toApiInstant(text.trim()) !== null;
}

/** What a `date` field holds (`2030-03-15`), as a real day: the same day at midnight has to be a moment. */
function isCalendarDay(text: string): boolean {
  return toApiInstant(`${text.trim()}T00:00`) !== null;
}

const lineSchema = z
  .object({
    itemId: z.string(),
    itemName: z.string(),
    quantity: z
      .string()
      .refine(
        (text) => (parseWholeNumber(text, MAX_QUANTITY) ?? 0) >= 1,
        QUANTITY_MESSAGE,
      ),
    price: z.string(),
    filledPriceCents: z.number(),
  })
  .refine((line) => unitPriceCentsOf(line) !== null, {
    message: PRICE_MESSAGE,
    path: ["price"],
  });

/**
 * Only the shape, with the limits of the contract of `POST /bookings`: whether there are units free, whether the pickup
 * is after the delivery and in the future, and whether the hold expires in time is the API's to decide (INV-FE-01).
 * A hold needs its expiry and a confirmed booking ignores it; the deposit is the amount and the day, or none; the total
 * is only checked if the person typed it (`null` is the suggested one) and an erased one is an error. A price that
 * was not touched is accepted even with cents. Lengths are in code points over the trimmed text, as the API counts them.
 * AC-5 (rentals-be#29)
 */
export const bookingFormSchema = z
  .object({
    status: z.enum(["hold", "confirmed"]),
    customerId: z
      .string()
      .refine((text) => text.trim() !== "", "Elegí el cliente."),
    customerName: z.string(),
    holdExpiresAt: z.string(),
    deliveryAt: z
      .string()
      .refine(isMoment, "Elegí el día y la hora de entrega."),
    pickupAt: z.string().refine(isMoment, "Elegí el día y la hora de retiro."),
    eventDate: z
      .string()
      .refine(
        (text) => text.trim() === "" || isCalendarDay(text),
        "Elegí un día del calendario.",
      ),
    occasion: z
      .string()
      .refine(fitsIn(120), "El motivo puede tener hasta 120 caracteres."),
    address: z
      .string()
      .refine(fitsIn(300), "La dirección puede tener hasta 300 caracteres."),
    note: z
      .string()
      .refine(fitsIn(2000), "La nota puede tener hasta 2.000 caracteres."),
    lines: z
      .array(lineSchema)
      .min(1, "Agregá al menos un artículo.")
      .max(MAX_LINES, "Una reserva lleva hasta 100 artículos."),
    freight: z
      .string()
      .refine(
        (text) => text.trim() === "" || parsePesos(text) !== null,
        FREIGHT_MESSAGE,
      ),
    total: z
      .string()
      .refine((text) => parsePesos(text) !== null, TOTAL_MESSAGE)
      .nullable(),
    depositAmount: z
      .string()
      .refine(
        (text) => text.trim() === "" || (parsePesos(text) ?? 0) > 0,
        DEPOSIT_MESSAGE,
      ),
    depositDate: z
      .string()
      .refine(
        (text) => text.trim() === "" || isCalendarDay(text),
        DEPOSIT_DATE_MESSAGE,
      ),
  })
  .refine(
    (values) => values.status !== "hold" || isMoment(values.holdExpiresAt),
    {
      message: "Elegí cuándo vence el bloqueo.",
      path: ["holdExpiresAt"],
    },
  )
  .refine(
    (values) =>
      values.depositAmount.trim() === "" || values.depositDate.trim() !== "",
    { message: DEPOSIT_DATE_MESSAGE, path: ["depositDate"] },
  )
  .refine(
    (values) =>
      values.depositDate.trim() === "" || values.depositAmount.trim() !== "",
    { message: "Escribí cuánto es la seña.", path: ["depositAmount"] },
  ) satisfies z.ZodType<BookingFormValues>;

/**
 * What the form suggests as the total: the quantity times the price of every line, plus the freight, in cents. It is
 * read while the person is still typing, so whatever does not read yet counts as 0. It is only a suggestion: the total
 * that is charged is the one the form sends, and the balance is the API's (INV-FE-01).
 */
export function suggestedTotalCentsOf(
  values: Pick<BookingFormValues, "lines" | "freight">,
): number {
  const lines = values.lines.reduce(
    (sum, line) =>
      sum +
      (parseWholeNumber(line.quantity, MAX_QUANTITY) ?? 0) *
        (unitPriceCentsOf(line) ?? 0),
    0,
  );
  return lines + (parsePesos(values.freight) ?? 0);
}

/**
 * A share of the total as a deposit, in cents rounded to whole pesos, half up (1.234 at 10 % is 123 and 1.235 is 124).
 * Integer arithmetic on purpose: `12350 * 0.1` is not exactly 1235 in floating point. The person can still change what
 * the shortcut wrote, and the deposit that counts is the one that goes in the body (INV-FE-01).
 */
export function depositShortcutCents(
  totalCents: number,
  percent: number,
): number {
  return Math.floor((totalCents * percent + 5000) / 10000) * 100;
}

function instantOf(local: string): string {
  return mustParse(toApiInstant(local.trim()));
}

function lineOf(line: BookingLineValues): CreateBookingBody["lines"][number] {
  return {
    itemId: line.itemId,
    quantity: mustParse(parseWholeNumber(line.quantity, MAX_QUANTITY)),
    priceCents: mustParse(unitPriceCentsOf(line)),
  };
}

/**
 * The body of `POST /bookings` from a form that already passed `bookingFormSchema`, so everything parses: texts
 * trimmed, the optional ones that end up empty left out, every price in cents and the instants in Argentina time, in
 * the order of the contract. Every line goes with its price, as shown. An empty freight is 0, and a total the person did
 * not touch is the suggested sum. The expiry only goes with a hold, and the deposit only if it was typed. A value that
 * does not parse is a bug, not input.
 * AC-1, AC-2 (rentals-be#29)
 */
export function createBodyOf(values: BookingFormValues): CreateBookingBody {
  const address = orNull(values.address);
  const note = orNull(values.note);
  const eventDate = orNull(values.eventDate);
  const occasion = orNull(values.occasion);
  const freight = orNull(values.freight);
  const depositAmount = orNull(values.depositAmount);
  const depositDate = orNull(values.depositDate);
  return {
    status: values.status,
    customerId: values.customerId,
    deliveryAt: instantOf(values.deliveryAt),
    pickupAt: instantOf(values.pickupAt),
    ...(values.status === "hold" && {
      holdExpiresAt: instantOf(values.holdExpiresAt),
    }),
    ...(address !== null && { address }),
    ...(note !== null && { note }),
    ...(eventDate !== null && { eventDate }),
    ...(occasion !== null && { occasion }),
    freightCents: freight === null ? 0 : mustParse(parsePesos(freight)),
    totalCents:
      values.total === null
        ? suggestedTotalCentsOf(values)
        : mustParse(parsePesos(values.total)),
    ...(depositAmount !== null &&
      depositDate !== null && {
        deposit: {
          amountCents: mustParse(parsePesos(depositAmount)),
          date: depositDate,
        },
      }),
    lines: values.lines.map(lineOf),
  };
}
