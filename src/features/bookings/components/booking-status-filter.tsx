"use client";

import { useRouter } from "next/navigation";

import { Label } from "@/components/ui/label";

import {
  BOOKING_STATUSES,
  bookingsHref,
  parseBookingFilters,
} from "../api/filters";
import type { BookingFilters } from "../types";
import { BOOKING_STATUS_LABELS, BOOKINGS_TEXTS } from "./texts";

const SELECT_CLASS =
  "h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base";

/**
 * A native select, like the one of the items filters (the phone gives its own picker). The status lives in the URL: each
 * change is a navigation, and the list asks the API again because its query key has the status.
 */
export function BookingStatusFilter({ filters }: { filters: BookingFilters }) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="bookings-status">{BOOKINGS_TEXTS.status}</Label>
      <select
        id="bookings-status"
        className={SELECT_CLASS}
        value={filters.status ?? ""}
        onChange={(event) =>
          router.push(
            bookingsHref(parseBookingFilters({ status: event.target.value })),
          )
        }
      >
        <option value="">{BOOKINGS_TEXTS.allStatuses}</option>
        {BOOKING_STATUSES.map((status) => (
          <option key={status} value={status}>
            {BOOKING_STATUS_LABELS[status]}
          </option>
        ))}
      </select>
    </div>
  );
}
