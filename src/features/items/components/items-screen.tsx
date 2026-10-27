"use client";

import Link from "next/link";

import { failureOf, isLeavingSession } from "@/api/api-failure";
import { describeError } from "@/api/failure-message";
import { Button, buttonVariants } from "@/components/ui/button";
import { ReadOnlyNotice } from "@/features/session";
import { ROUTES } from "@/lib/routes";

import { itemsHref } from "../api/filters";
import { itemsOfPages } from "../api/pages";
import { useItemAccess } from "../hooks/use-item-access";
import { useItems } from "../hooks/use-items";
import type { ItemFilters } from "../types";
import { ItemFilterBar } from "./item-filters";
import { ItemRow } from "./item-row";
import { FILTER_TEXTS, ITEMS_TEXTS } from "./texts";

/**
 * The rows come in the order of the API and the buttons that write only show to who can manage (INV-FE-01).
 * A dead session is not an error here: the session providers are already leaving the screen.
 */
export function ItemsScreen({ filters }: { filters: ItemFilters }) {
  const access = useItemAccess();
  const items = useItems(filters);
  const rows = items.data ? itemsOfPages(items.data.pages) : [];
  const leaving = isLeavingSession(failureOf(items.error));

  return (
    <div className="flex flex-col gap-4">
      {access.readOnly && <ReadOnlyNotice />}
      <div className="flex flex-wrap gap-2">
        {access.canManage && (
          <Link href={ROUTES.newItem} className={buttonVariants()}>
            {ITEMS_TEXTS.newItem}
          </Link>
        )}
        <Link
          href={ROUTES.account}
          className={buttonVariants({ variant: "outline" })}
        >
          {ITEMS_TEXTS.account}
        </Link>
      </div>
      <ItemFilterBar filters={filters} />
      {rows.length > 0 && (
        <ul className="flex flex-col gap-2">
          {rows.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </ul>
      )}
      {items.isPending && <p role="status">{ITEMS_TEXTS.loading}</p>}
      {items.data && rows.length === 0 && !items.hasNextPage && (
        <p>
          {itemsHref(filters) === ROUTES.items
            ? ITEMS_TEXTS.empty
            : FILTER_TEXTS.emptyFiltered}
        </p>
      )}
      {items.isError && !leaving && (
        <div className="flex flex-col gap-2">
          <p role="alert">{describeError(items.error)}</p>
          <Button
            variant="outline"
            onClick={() =>
              items.isFetchNextPageError
                ? items.fetchNextPage()
                : items.refetch()
            }
          >
            {ITEMS_TEXTS.retry}
          </Button>
        </div>
      )}
      {items.hasNextPage && !items.isError && (
        <Button
          variant="outline"
          disabled={items.isFetchingNextPage}
          onClick={() => items.fetchNextPage()}
        >
          {ITEMS_TEXTS.more}
        </Button>
      )}
    </div>
  );
}
