"use client";

import Link from "next/link";

import { failureOf, isLeavingSession } from "@/api/api-failure";
import { describeError } from "@/api/failure-message";
import { Button, buttonVariants } from "@/components/ui/button";
import { entriesOfPages } from "@/lib/pages";
import { ROUTES } from "@/lib/routes";

import { bookingsHref } from "../api/filters";
import { useBookingAccess } from "../hooks/use-booking-access";
import { useBookings } from "../hooks/use-bookings";
import type { BookingFilters } from "../types";
import { BookingRow } from "./booking-row";
import { BookingStatusFilter } from "./booking-status-filter";
import { BOOKINGS_TEXTS } from "./texts";

/**
 * An empty list from today does not say that there are no bookings at all: older ones may be behind "Ver todas".
 * AC-12 (rentals-be#29)
 */
function emptyTextOf(filters: BookingFilters): string {
  if (filters.status !== null) return BOOKINGS_TEXTS.emptyFiltered;
  return filters.all ? BOOKINGS_TEXTS.empty : BOOKINGS_TEXTS.emptySinceToday;
}

/**
 * The rows come in the order of the API, with the balance and the pill it sends (INV-FE-01). Every role can read, so
 * only "Nueva reserva", the one main action of the screen, depends on who is signed in: it shows to who can manage. The
 * list starts from today and "Ver todas" / "Desde hoy" switch it through the URL, keeping the status. A dead session is
 * not an error here: the session providers are already leaving the screen.
 * AC-12, AC-13 (rentals-be#29)
 */
export function BookingsScreen({ filters }: { filters: BookingFilters }) {
  const access = useBookingAccess();
  const bookings = useBookings(filters);
  const rows = bookings.data
    ? entriesOfPages(bookings.data.pages, (booking) => booking.id)
    : [];
  const leaving = isLeavingSession(failureOf(bookings.error));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {access.canManage && (
          <Link
            href={ROUTES.newBooking}
            className={buttonVariants({ size: "lg" })}
          >
            {BOOKINGS_TEXTS.newBooking}
          </Link>
        )}
        <Link
          href={ROUTES.availability}
          className={buttonVariants({ variant: "outline" })}
        >
          {BOOKINGS_TEXTS.checkAvailability}
        </Link>
      </div>
      <BookingStatusFilter filters={filters} />
      <Link
        href={bookingsHref({ ...filters, all: !filters.all })}
        className={buttonVariants({ variant: "outline" })}
      >
        {filters.all ? BOOKINGS_TEXTS.sinceToday : BOOKINGS_TEXTS.showAll}
      </Link>
      {rows.length > 0 && (
        <ul className="flex flex-col gap-2">
          {rows.map((booking) => (
            <BookingRow key={booking.id} booking={booking} />
          ))}
        </ul>
      )}
      {bookings.isPending && <p role="status">{BOOKINGS_TEXTS.loading}</p>}
      {bookings.data && rows.length === 0 && !bookings.hasNextPage && (
        <p>{emptyTextOf(filters)}</p>
      )}
      {bookings.isError && !leaving && (
        <div className="flex flex-col gap-2">
          <p role="alert">{describeError(bookings.error)}</p>
          <Button
            variant="outline"
            onClick={() =>
              bookings.isFetchNextPageError
                ? bookings.fetchNextPage()
                : bookings.refetch()
            }
          >
            {BOOKINGS_TEXTS.retry}
          </Button>
        </div>
      )}
      {bookings.hasNextPage && !bookings.isError && (
        <Button
          variant="outline"
          disabled={bookings.isFetchingNextPage}
          onClick={() => bookings.fetchNextPage()}
        >
          {BOOKINGS_TEXTS.more}
        </Button>
      )}
    </div>
  );
}
