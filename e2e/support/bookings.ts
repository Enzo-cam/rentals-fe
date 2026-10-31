import type { APIRequestContext } from "@playwright/test";

import type { components } from "../../src/api/schema";
import { apiRequests } from "./fake-api-control";

type Booking = components["schemas"]["Booking"];
type BookingWithPrices = components["schemas"]["BookingWithPrices"];

/** Same data as `bookings-fixtures.json`. */
export const BOOKING_IDS = {
  lucia: "cccccccc-0000-4000-8000-000000000001",
  bar: "cccccccc-0000-4000-8000-000000000002",
  ana: "cccccccc-0000-4000-8000-000000000003",
  marcos: "cccccccc-0000-4000-8000-000000000004",
  asociacion: "cccccccc-0000-4000-8000-000000000005",
};

/**
 * All in 2030, so the year always shows. The first one, confirmed, reads `vie 8 mar 2030, 08:00 → dom 10 mar 2030,
 * 17:00` in Argentina time; the second is a hold that expires `vie 8 mar 2030, 12:00`.
 */
export const confirmed = {
  id: BOOKING_IDS.lucia,
  status: "confirmed",
  holdExpiresAt: null,
  holdExpired: false,
  customer: {
    id: "dddddddd-0000-4000-8000-000000000004",
    name: "Lucía Benítez",
    whatsapp: "3794 555000",
  },
  deliveryAt: "2030-03-08T11:00:00Z",
  pickupAt: "2030-03-10T20:00:00Z",
  address: "Av. Costanera 1200, Corrientes",
  note: "Llevar mantel de repuesto",
  deliveredAt: null,
  returnRecordedAt: null,
  cancelledAt: null,
  createdAt: "2030-02-20T15:00:00Z",
  balanceDueCents: 1200000,
  lines: [
    {
      id: "eeeeeeee-0000-4000-8000-000000000001",
      itemId: "bbbbbbbb-0000-4000-8000-000000000001",
      itemName: "Silla Tiffany blanca",
      quantity: 8,
      priceCents: 150000,
    },
    {
      id: "eeeeeeee-0000-4000-8000-000000000002",
      itemId: "bbbbbbbb-0000-4000-8000-000000000002",
      itemName: "Copa de vino",
      quantity: 12,
      priceCents: 35000,
    },
  ],
  freightCents: 180000,
  deposit: { amountCents: 600000, date: "2030-03-01" },
} satisfies BookingWithPrices;

export const hold = {
  ...confirmed,
  id: BOOKING_IDS.bar,
  status: "hold",
  holdExpiresAt: "2030-03-08T15:00:00Z",
  customer: {
    id: "dddddddd-0000-4000-8000-000000000003",
    name: "Bar El Molino",
    whatsapp: "3624 987654",
  },
  deliveryAt: "2030-03-09T14:30:00Z",
  pickupAt: "2030-03-09T22:00:00Z",
  address: null,
  note: null,
  balanceDueCents: 800000,
  deposit: null,
} satisfies BookingWithPrices;

/** What the API sends to the roles that cannot view prices: no line prices, no freight, no deposit. */
export function withoutPrices(booking: BookingWithPrices): Booking {
  return {
    id: booking.id,
    status: booking.status,
    holdExpiresAt: booking.holdExpiresAt,
    holdExpired: booking.holdExpired,
    customer: booking.customer,
    deliveryAt: booking.deliveryAt,
    pickupAt: booking.pickupAt,
    address: booking.address,
    note: booking.note,
    deliveredAt: booking.deliveredAt,
    returnRecordedAt: booking.returnRecordedAt,
    cancelledAt: booking.cancelledAt,
    createdAt: booking.createdAt,
    balanceDueCents: booking.balanceDueCents,
    lines: booking.lines.map((line) => ({
      id: line.id,
      itemId: line.itemId,
      itemName: line.itemName,
      quantity: line.quantity,
    })),
  };
}

export function pageOf(
  items: BookingWithPrices[],
  nextCursor: string | null,
): components["schemas"]["BookingPageWithPrices"] {
  return { items, nextCursor };
}

export function pageWithoutPrices(
  items: BookingWithPrices[],
  nextCursor: string | null,
): components["schemas"]["BookingPage"] {
  return { items: items.map(withoutPrices), nextCursor };
}

/** The query strings of the calls to `GET /bookings` the page made, in order. */
export async function bookingListCalls(request: APIRequestContext) {
  const calls = (await apiRequests(request)).filter(
    (call) => call.method === "GET" && call.path === "/bookings",
  );
  return calls.map((call) => new URLSearchParams(call.query));
}
