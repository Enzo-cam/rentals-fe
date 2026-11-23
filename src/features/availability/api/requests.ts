import { unwrap } from "@/api/api-failure";
import { browserApi } from "@/api/browser-client";
import type { paths } from "@/api/schema";
import { toApiInstant } from "@/lib/format/date-time";

/**
 * The cursor belongs to the period and the `q` it came with; `limit` is never sent, so the API picks the page size. The
 * dates are the local ones of the URL, sent as instants in Argentina time (INV-FE-05); one that is not valid never gets
 * here (`parseAvailabilityFilters`), and if it did the API would answer a 400.
 */
export function listAvailability(
  filters: { from: string; to: string; q: string | null },
  cursor: string | null,
) {
  const query: NonNullable<
    paths["/availability"]["get"]["parameters"]["query"]
  > = {
    from: toApiInstant(filters.from) ?? filters.from,
    to: toApiInstant(filters.to) ?? filters.to,
  };
  if (filters.q !== null) query.q = filters.q;
  if (cursor !== null) query.cursor = cursor;
  return unwrap(browserApi.GET("/availability", { params: { query } }));
}

/**
 * What is free of the items of a booking that is being filled in, for the period of its delivery and pickup, in one
 * request: `ids` takes up to 100 items (the most a booking has) and so does `limit`, so one page has them all and
 * there is no cursor. The moments are the local ones of the form, sent as instants in Argentina time (INV-FE-05); one
 * that is not valid never gets here (`useFreeUnits`). Repeated ids are sent once, as the API wants. It is only a help:
 * the API checks the stock again when the booking is saved.
 * AC-4 (rentals-be#29)
 */
export function freeUnitsOf(from: string, to: string, ids: string[]) {
  return unwrap(
    browserApi.GET("/availability", {
      params: {
        query: {
          from: toApiInstant(from) ?? from,
          to: toApiInstant(to) ?? to,
          ids: Array.from(new Set(ids)).join(","),
          limit: 100,
        },
      },
    }),
  );
}
