import Link from "next/link";

import { formatCents } from "@/lib/format/money";
import { ROUTES } from "@/lib/routes";

import type { ListedItem } from "../types";
import { ITEMS_TEXTS } from "./texts";

/** The price shows only if the object carries it: the API sends it to the roles that can view prices. */
export function ItemRow({ item }: { item: ListedItem }) {
  const stock = [
    `${item.totalStock} en total`,
    ...(item.outOfService > 0
      ? [`${item.outOfService} fuera de servicio`]
      : []),
    ...(item.archived ? [ITEMS_TEXTS.archived] : []),
  ].join(" · ");
  return (
    <li>
      <Link
        href={ROUTES.item(item.id)}
        className="flex flex-col gap-1 rounded-lg border p-3"
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 break-words font-medium">{item.name}</span>
          {"priceCents" in item && (
            <span className="shrink-0">{formatCents(item.priceCents)}</span>
          )}
        </div>
        <span className="text-sm text-muted-foreground">{stock}</span>
      </Link>
    </li>
  );
}
