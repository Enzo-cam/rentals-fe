"use client";

import Link from "next/link";

import { failureOf, isLeavingSession } from "@/api/api-failure";
import { describeError } from "@/api/failure-message";
import { Button, buttonVariants } from "@/components/ui/button";
import { entriesOfPages } from "@/lib/pages";
import { ROUTES } from "@/lib/routes";

import { useBookings } from "../hooks/use-bookings";
import type { BookingFilters } from "../types";
import { BookingRow } from "./booking-row";
import { BookingStatusFilter } from "./booking-status-filter";
import { BOOKINGS_TEXTS } from "./texts";

/**
 * The rows come in the order of the API, with the balance and the pill it sends (INV-FE-01). Every role can read, so
 * nothing here depends on who is signed in. A dead session is not an error here: the session providers are already
 * leaving the screen.
 */
export function BookingsScreen({ filters }: { filters: BookingFilters }) {
  const bookings = useBookings(filters);
  const rows = bookings.data
    ? entriesOfPages(bookings.data.pages, (booking) => booking.id)
    : [];
  const leaving = isLeavingSession(failureOf(bookings.error));

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={ROUTES.availability}
        className={buttonVariants({ size: "lg" })}
      >
        {BOOKINGS_TEXTS.checkAvailability}
      </Link>
      <BookingStatusFilter filters={filters} />
      {rows.length > 0 && (
        <ul className="flex flex-col gap-2">
          {rows.map((booking) => (
            <BookingRow key={booking.id} booking={booking} />
          ))}
        </ul>
      )}
      {bookings.isPending && <p role="status">{BOOKINGS_TEXTS.loading}</p>}
      {bookings.data && rows.length === 0 && !bookings.hasNextPage && (
        <p>
          {filters.status === null
            ? BOOKINGS_TEXTS.empty
            : BOOKINGS_TEXTS.emptyFiltered}
        </p>
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
