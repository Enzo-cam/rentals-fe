import { BookingRefList } from "@/features/bookings";

import type { stockBelowReservedOf } from "../api/failures";
import { STOCK_BELOW_RESERVED_TEXTS } from "./texts";

type StockBelowReserved = NonNullable<ReturnType<typeof stockBelowReservedOf>>;

/** Says how many units are reserved and which bookings hold them, so the person sees why the stock cannot go down. */
export function StockBelowReservedNotice({
  stock,
}: {
  stock: StockBelowReserved;
}) {
  return (
    <div role="alert" className="flex flex-col gap-2">
      <p className="text-sm text-destructive">
        {STOCK_BELOW_RESERVED_TEXTS.reserved(stock.reserved)}
      </p>
      <BookingRefList bookings={stock.bookings} hasMore={stock.hasMore} />
    </div>
  );
}
