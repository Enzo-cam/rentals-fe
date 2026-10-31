"use client";

import { failureOf, isLeavingSession } from "@/api/api-failure";
import { describeError } from "@/api/failure-message";
import { Button } from "@/components/ui/button";
import { entriesOfPages } from "@/lib/pages";

import { useAvailability } from "../hooks/use-availability";
import type { AvailabilityFilters } from "../types";
import { AvailabilityForm } from "./availability-form";
import { AvailabilityRow } from "./availability-row";
import { AVAILABILITY_ERRORS, AVAILABILITY_TEXTS } from "./texts";

/**
 * The rows come in the order of the API, with the numbers it sends (INV-FE-01). Without a complete period nothing is
 * asked and the screen says so. A rejected request (a 4xx such as `invalid_period`) is not offered again: the same period
 * would get the same answer. A dead session is not an error here: the session providers are already leaving the screen.
 */
export function AvailabilityScreen({
  filters,
}: {
  filters: AvailabilityFilters;
}) {
  const availability = useAvailability(filters);
  const rows = availability.data
    ? entriesOfPages(availability.data.pages, (item) => item.itemId)
    : [];
  const failure = failureOf(availability.error);
  const leaving = isLeavingSession(failure);
  const retryable = failure?.kind !== "rejected";

  return (
    <div className="flex flex-col gap-4">
      <AvailabilityForm filters={filters} />
      {filters.from === null || filters.to === null ? (
        <p>{AVAILABILITY_TEXTS.completePeriod}</p>
      ) : (
        <p className="font-medium">
          {AVAILABILITY_TEXTS.period(filters.from, filters.to)}
        </p>
      )}
      {rows.length > 0 && (
        <ul className="flex flex-col gap-2">
          {rows.map((item) => (
            <AvailabilityRow key={item.itemId} item={item} />
          ))}
        </ul>
      )}
      {availability.isFetching && availability.isPending && (
        <p role="status">{AVAILABILITY_TEXTS.loading}</p>
      )}
      {availability.data && rows.length === 0 && !availability.hasNextPage && (
        <p>{AVAILABILITY_TEXTS.empty}</p>
      )}
      {availability.isError && !leaving && (
        <div className="flex flex-col gap-2">
          <p role="alert">
            {describeError(availability.error, AVAILABILITY_ERRORS)}
          </p>
          {retryable && (
            <Button
              variant="outline"
              onClick={() =>
                availability.isFetchNextPageError
                  ? availability.fetchNextPage()
                  : availability.refetch()
              }
            >
              {AVAILABILITY_TEXTS.retry}
            </Button>
          )}
        </div>
      )}
      {availability.hasNextPage && !availability.isError && (
        <Button
          variant="outline"
          disabled={availability.isFetchingNextPage}
          onClick={() => availability.fetchNextPage()}
        >
          {AVAILABILITY_TEXTS.more}
        </Button>
      )}
    </div>
  );
}
