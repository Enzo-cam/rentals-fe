"use client";

import { useState } from "react";

import { formatCents } from "@/lib/format/money";

import { useActiveItems } from "../hooks/use-active-items";
import type { ActiveItem } from "../types";
import { PickerList, PickerRow, PickerSheet } from "./picker-sheet";
import { PICKER_TEXTS } from "./texts";

/**
 * `q` is the text last searched, and it is `useState` on purpose, for the same reason as in the customer picker: UI
 * that lasts while the sheet is open, not a filter of a page and not a field of the booking. An item that is already in
 * the booking cannot be added again: the API refuses a booking with the same item in two lines.
 */
function ItemResults({
  taken,
  onPick,
}: {
  taken: string[];
  onPick: (item: ActiveItem) => void;
}) {
  const [q, setQ] = useState<string | null>(null);
  const items = useActiveItems(q);

  return (
    <PickerList<ActiveItem>
      searchLabel={PICKER_TEXTS.itemSearch}
      q={q}
      onSearch={setQ}
      query={items}
      idOf={(item) => item.id}
      renderRow={(item) => {
        const added = taken.includes(item.id);
        return (
          <PickerRow disabled={added} onPick={() => onPick(item)}>
            <span className="min-w-0 break-words font-medium">{item.name}</span>
            <span className="text-sm text-muted-foreground">
              {added
                ? PICKER_TEXTS.alreadyAdded
                : "priceCents" in item
                  ? formatCents(item.priceCents)
                  : ""}
            </span>
          </PickerRow>
        );
      }}
      texts={{
        loading: PICKER_TEXTS.loadingItems,
        empty: PICKER_TEXTS.noItems,
        emptyFiltered: PICKER_TEXTS.noItemsFound,
      }}
    />
  );
}

/**
 * The active items of the business, each with its list price, searched with `GET /items?q&status=active`. A sibling of
 * the `<form>` (`PickerSheet`).
 * AC-1 (rentals-be#29)
 */
export function ItemPicker({
  open,
  onOpenChange,
  taken,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taken: string[];
  onPick: (item: ActiveItem) => void;
}) {
  return (
    <PickerSheet
      open={open}
      onOpenChange={onOpenChange}
      title={PICKER_TEXTS.itemTitle}
    >
      <ItemResults taken={taken} onPick={onPick} />
    </PickerSheet>
  );
}
