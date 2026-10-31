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
