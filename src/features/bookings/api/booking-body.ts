import { z } from "zod";

import type { paths } from "@/api/schema";
import { toApiInstant, toLocalInput } from "@/lib/format/date-time";
import { parsePesos, pesosTextOf } from "@/lib/format/money";
import { parseWholeNumber } from "@/lib/format/whole-number";
import {
  MAX_LINES,
  MAX_QUANTITY,
  type Booking,
  type BookingFormValues,
  type BookingLineValues,
} from "../types";
import type { BookingEdit } from "./edit";

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

export type UpdateBookingBody =
  paths["/bookings/{id}"]["patch"]["requestBody"]["content"]["application/json"];

function lineValuesOf(line: Booking["lines"][number]): BookingLineValues {
  const priceCents = "priceCents" in line ? line.priceCents : 0;
  return {
    itemId: line.itemId,
    itemName: line.itemName,
    quantity: String(line.quantity),
    price: pesosTextOf(priceCents),
    filledPriceCents: priceCents,
  };
}

/**
 * The form of a booking to edit. The money is there only if the object carries it (the API decides who sees it). The
 * total is the stored one, as a text and never `null`: in the edit it is not the suggested sum, and it only goes in the
 * patch if the person changes it. The form only needs to know whether the expiry is asked, so every status that is not a
 * hold opens as confirmed; the status never goes in a patch and what can change comes from `bookingEditOf`.
 * AC-15 (rentals-be#29)
 */
export function formValuesOf(booking: Booking): BookingFormValues {
  const priced = "freightCents" in booking ? booking : null;
  return {
    status: booking.status === "hold" ? "hold" : "confirmed",
    customerId: booking.customer.id,
    customerName: booking.customer.name,
    holdExpiresAt:
      booking.holdExpiresAt === null ? "" : toLocalInput(booking.holdExpiresAt),
    deliveryAt: toLocalInput(booking.deliveryAt),
    pickupAt: toLocalInput(booking.pickupAt),
    eventDate: booking.eventDate ?? "",
    occasion: booking.occasion ?? "",
    address: booking.address ?? "",
    note: booking.note ?? "",
    lines: booking.lines.map(lineValuesOf),
    freight: priced ? pesosTextOf(priced.freightCents) : "",
    total: priced ? pesosTextOf(priced.totalCents) : "",
    depositAmount: priced?.deposit
      ? pesosTextOf(priced.deposit.amountCents)
      : "",
    depositDate: priced?.deposit?.date ?? "",
  };
}

/** A freight text in cents: an empty one is 0, as in the create body. `null` if it does not read. */
function freightCentsOf(text: string): number | null {
  return orNull(text) === null ? 0 : parsePesos(text);
}

/**
 * The lines of the patch, whole as the API wants them (an item that is not in it is removed), or `undefined` if none
 * was added, removed, changed in quantity or repriced. A line that was there goes with its quantity and no price, so it
 * keeps the one it has: the price goes only on a new line and, while the status lets the price change, on a line whose
 * price changed. In a confirmed booking the price of a line that was there is never sent: it was fixed when the booking
 * was confirmed, and a price that differs from the stored one is a 409 `line_price_locked`.
 * AC-17, AC-18 (rentals-be#29)
 */
function linesPatchOf(
  opened: BookingFormValues,
  values: BookingFormValues,
  edit: BookingEdit,
): UpdateBookingBody["lines"] {
  const before = new Map(opened.lines.map((line) => [line.itemId, line]));
  const sent = values.lines.map((line) => {
    const was = before.get(line.itemId);
    const quantity = mustParse(parseWholeNumber(line.quantity, MAX_QUANTITY));
    const priceCents = mustParse(unitPriceCentsOf(line));
    const repriced =
      was !== undefined &&
      !edit.pricesFixed &&
      priceCents !== unitPriceCentsOf(was);
    const touched =
      was === undefined ||
      repriced ||
      quantity !== parseWholeNumber(was.quantity, MAX_QUANTITY);
    return {
      touched,
      line: {
        itemId: line.itemId,
        quantity,
        ...((was === undefined || repriced) && { priceCents }),
      },
    };
  });
  const removed = opened.lines.some(
    (was) => !values.lines.some((line) => line.itemId === was.itemId),
  );
  return removed || sent.some(({ touched }) => touched)
    ? sent.map(({ line }) => line)
    : undefined;
}

/**
 * Only the keys that the status lets change and that changed since the form opened (`opened` is what it was filled with,
 * never the latest the server sent: a field the person did not touch must not overwrite what somebody else changed
 * meanwhile). A key that did not change is never sent: in a delivered booking any other key is a 409, and the
 * total goes only if the person changed it, because without it the stored one stays when the lines or the freight
 * change (rentals-be#28). Texts are compared after trimming and amounts after parsing, so a space or `$ ` is not a
 * change, and an untouched amount is never parsed: it may carry cents, which the form cannot read. A cleared text is
 * `null`. The deposit goes only if there was none: it is loaded once. The keys go in the order of the contract. `{}`
 * means nothing to send.
 * AC-15, AC-17, AC-18, AC-19 (rentals-be#29)
 */
export function patchOf(
  opened: BookingFormValues,
  values: BookingFormValues,
  edit: BookingEdit,
): UpdateBookingBody {
  const patch: UpdateBookingBody = {};
  const differs = (before: string, typed: string) =>
    before.trim() !== typed.trim();
  if (edit.wholeBooking) {
    if (values.customerId !== opened.customerId) {
      patch.customerId = values.customerId;
    }
    if (differs(opened.deliveryAt, values.deliveryAt)) {
      patch.deliveryAt = instantOf(values.deliveryAt);
    }
  }
  if (differs(opened.pickupAt, values.pickupAt)) {
    patch.pickupAt = instantOf(values.pickupAt);
  }
  if (edit.holdExpiry && differs(opened.holdExpiresAt, values.holdExpiresAt)) {
    patch.holdExpiresAt = instantOf(values.holdExpiresAt);
  }
  const address = orNull(values.address);
  if (address !== orNull(opened.address)) patch.address = address;
  const note = orNull(values.note);
  if (note !== orNull(opened.note)) patch.note = note;
  if (!edit.wholeBooking) return patch;

  const eventDate = orNull(values.eventDate);
  if (eventDate !== orNull(opened.eventDate)) patch.eventDate = eventDate;
  const occasion = orNull(values.occasion);
  if (occasion !== orNull(opened.occasion)) patch.occasion = occasion;
  const freightCents = freightCentsOf(values.freight);
  if (
    differs(opened.freight, values.freight) &&
    freightCents !== freightCentsOf(opened.freight)
  ) {
    patch.freightCents = mustParse(freightCents);
  }
  const openedTotal = opened.total ?? "";
  if (values.total !== null && differs(openedTotal, values.total)) {
    const totalCents = mustParse(parsePesos(values.total));
    if (totalCents !== parsePesos(openedTotal)) patch.totalCents = totalCents;
  }
  const depositAmount = orNull(values.depositAmount);
  const depositDate = orNull(values.depositDate);
  const hadDeposit =
    orNull(opened.depositAmount) !== null ||
    orNull(opened.depositDate) !== null;
  if (!hadDeposit && depositAmount !== null && depositDate !== null) {
    patch.deposit = {
      amountCents: mustParse(parsePesos(depositAmount)),
      date: depositDate,
    };
  }
  const lines = linesPatchOf(opened, values, edit);
  if (lines !== undefined) patch.lines = lines;
  return patch;
}
