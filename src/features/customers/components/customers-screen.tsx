"use client";

import { useState } from "react";

import { failureOf, isLeavingSession } from "@/api/api-failure";
import { describeError } from "@/api/failure-message";
import { Button } from "@/components/ui/button";
import { ReadOnlyNotice } from "@/features/session";
import { entriesOfPages } from "@/lib/pages";

import { useCustomerAccess } from "../hooks/use-customer-access";
import { useCustomers } from "../hooks/use-customers";
import type { CustomerFilters, SheetTarget } from "../types";
import { CustomerRow } from "./customer-row";
import { CustomerSearch } from "./customer-search";
import { CustomerSheet } from "./customer-sheet";
import { CustomersGate } from "./customers-gate";
import { CUSTOMERS_TEXTS } from "./texts";

/**
 * The rows come in the order of the API and what writes only shows to who can manage (INV-FE-01). The sheet is open
 * only while the person can manage: a 403 that turns the business read only closes it. A dead session is not an error
 * here: the session providers are already leaving the screen.
 */
function CustomersList({ filters }: { filters: CustomerFilters }) {
  const access = useCustomerAccess();
  const customers = useCustomers(filters);
  const [target, setTarget] = useState<SheetTarget>(null);
  const rows = customers.data
    ? entriesOfPages(customers.data.pages, (customer) => customer.id)
    : [];
  const leaving = isLeavingSession(failureOf(customers.error));

  return (
    <div className="flex flex-col gap-4">
      {access.readOnly && <ReadOnlyNotice />}
      {access.canManage && (
        <Button size="lg" onClick={() => setTarget({ mode: "new" })}>
          {CUSTOMERS_TEXTS.newCustomer}
        </Button>
      )}
      <CustomerSearch filters={filters} />
      {rows.length > 0 && (
        <ul className="flex flex-col gap-2">
          {rows.map((customer) => (
            <CustomerRow
              key={customer.id}
              customer={customer}
              onOpen={
                access.canManage
                  ? () => setTarget({ mode: "edit", customer })
                  : null
              }
            />
          ))}
        </ul>
      )}
      {customers.isPending && <p role="status">{CUSTOMERS_TEXTS.loading}</p>}
      {customers.data && rows.length === 0 && !customers.hasNextPage && (
        <p>
          {filters.q === null
            ? CUSTOMERS_TEXTS.empty
            : CUSTOMERS_TEXTS.emptyFiltered}
        </p>
      )}
      {customers.isError && !leaving && (
        <div className="flex flex-col gap-2">
          <p role="alert">{describeError(customers.error)}</p>
          <Button
            variant="outline"
            onClick={() =>
              customers.isFetchNextPageError
                ? customers.fetchNextPage()
                : customers.refetch()
            }
          >
            {CUSTOMERS_TEXTS.retry}
          </Button>
        </div>
      )}
      {customers.hasNextPage && !customers.isError && (
        <Button
          variant="outline"
          disabled={customers.isFetchingNextPage}
          onClick={() => customers.fetchNextPage()}
        >
          {CUSTOMERS_TEXTS.more}
        </Button>
      )}
      <CustomerSheet
        target={access.canManage ? target : null}
        onTargetChange={setTarget}
      />
    </div>
  );
}

/** The list is only asked for once the gate knows that the person can view it: the crew never asks for it. */
export function CustomersScreen({ filters }: { filters: CustomerFilters }) {
  return (
    <CustomersGate>
      <CustomersList filters={filters} />
    </CustomersGate>
  );
}
