"use client";

import { useState } from "react";

import type { components } from "@/api/schema";
import { Button } from "@/components/ui/button";
import { useCustomers } from "@/features/customers";

import { PickerList, PickerRow, PickerSheet } from "./picker-sheet";
import { PICKER_TEXTS } from "./texts";

type Customer = components["schemas"]["Customer"];

/**
 * `q` is the text last searched, and it is `useState` on purpose (docs/architecture.md §5): it is UI that lasts while
 * the sheet is open. It is not a filter of a page, so it has no URL, and it is not a field of the booking, so it is
 * not in the form. It goes with the content when the sheet closes, and the next time it opens it starts again.
 */
function CustomerResults({
  onPick,
  onNew,
}: {
  onPick: (customer: Customer) => void;
  onNew: () => void;
}) {
  const [q, setQ] = useState<string | null>(null);
  const customers = useCustomers({ q });

  return (
    <>
      <Button type="button" variant="outline" onClick={onNew}>
        {PICKER_TEXTS.newCustomer}
      </Button>
      <PickerList
        searchLabel={PICKER_TEXTS.customerSearch}
        q={q}
        onSearch={setQ}
        query={customers}
        idOf={(customer) => customer.id}
        renderRow={(customer) => (
          <PickerRow onPick={() => onPick(customer)}>
            <span className="min-w-0 break-words font-medium">
              {customer.name}
            </span>
            <span className="text-sm text-muted-foreground">
              {customer.whatsapp}
            </span>
          </PickerRow>
        )}
        texts={{
          loading: PICKER_TEXTS.loadingCustomers,
          empty: PICKER_TEXTS.noCustomers,
          emptyFiltered: PICKER_TEXTS.noCustomersFound,
        }}
      />
    </>
  );
}

/**
 * The customers of the business, searched with `GET /customers?q`. "Nuevo cliente" hands over to the sheet of the
 * customers feature, which the form opens. A sibling of the `<form>` (`PickerSheet`).
 * AC-3 (rentals-be#29)
 */
export function CustomerPicker({
  open,
  onOpenChange,
  onPick,
  onNew,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (customer: Customer) => void;
  onNew: () => void;
}) {
  return (
    <PickerSheet
      open={open}
      onOpenChange={onOpenChange}
      title={PICKER_TEXTS.customerTitle}
    >
      <CustomerResults onPick={onPick} onNew={onNew} />
    </PickerSheet>
  );
}
