import { formatWholeNumber } from "@/lib/format/whole-number";

import type { ItemAvailability } from "../types";
import { ROW_TEXTS } from "./texts";

/**
 * The numbers are the ones of the API (INV-FE-01): the sign of `available` only picks the text, "Faltan 2" in the
 * destructive color when an overdue pickup left the item overbooked.
 */
export function AvailabilityRow({ item }: { item: ItemAvailability }) {
  const missing = item.available < 0;
  return (
    <li className="flex flex-col gap-1 rounded-lg border p-3">
      <span className="min-w-0 break-words font-medium">{item.name}</span>
      <p className={missing ? "text-destructive" : undefined}>
        {missing ? `${ROW_TEXTS.missing} ` : null}
        <span className="text-2xl font-extrabold">
          {formatWholeNumber(Math.abs(item.available))}
        </span>
        {missing ? null : ` ${ROW_TEXTS.free}`}
      </p>
      <span className="text-sm text-muted-foreground">
        {ROW_TEXTS.detail(item.reserved, item.outOfService, item.totalStock)}
      </span>
    </li>
  );
}
