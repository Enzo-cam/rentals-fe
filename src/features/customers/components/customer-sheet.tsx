"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { createBodyOf, formValuesOf, patchOf } from "../api/customer-body";
import { useCreateCustomer } from "../hooks/use-create-customer";
import { useUpdateCustomer } from "../hooks/use-update-customer";
import type { Customer, SheetTarget } from "../types";
import { CustomerForm } from "./customer-form";
import { FORM_TEXTS, SHEET_TEXTS } from "./texts";

type FormProps = {
  onTargetChange: (target: SheetTarget) => void;
};

function NewCustomerForm({ onTargetChange }: FormProps) {
  const create = useCreateCustomer();
  return (
    <CustomerForm
      onSubmit={(values) =>
        create.submitOnce(createBodyOf(values), () => onTargetChange(null))
      }
      onEditTaken={(customer) => onTargetChange({ mode: "edit", customer })}
      busy={create.isPending || create.isSuccess}
      error={create.error}
    />
  );
}

function EditCustomerForm({
  customer,
  onTargetChange,
}: FormProps & { customer: Customer }) {
  const update = useUpdateCustomer(customer.id);
  return (
    <CustomerForm
      defaultValues={formValuesOf(customer)}
      onSubmit={(values, opened) => {
        const patch = patchOf(opened, values);
        if (Object.keys(patch).length === 0) return FORM_TEXTS.unchanged;
        update.submitOnce(patch, () => onTargetChange(null));
      }}
      onEditTaken={(taken) => onTargetChange({ mode: "edit", customer: taken })}
      busy={update.isPending || update.isSuccess}
      error={update.error}
    />
  );
}

/**
 * The sheet over the list, for a new customer or for editing one. There is no `GET /customers/{id}`, so the edit opens
 * with the customer the row (or the 409) already carries. Each form is keyed by what it opened with, so switching to
 * another customer starts the form and its mutation again. The content is scrollable at a short screen.
 */
export function CustomerSheet({
  target,
  onTargetChange,
}: {
  target: SheetTarget;
  onTargetChange: (target: SheetTarget) => void;
}) {
  return (
    <Sheet
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) onTargetChange(null);
      }}
    >
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] overflow-y-auto rounded-t-2xl"
      >
        <SheetHeader>
          <SheetTitle>
            {target?.mode === "edit"
              ? SHEET_TEXTS.editTitle
              : SHEET_TEXTS.newTitle}
          </SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-4">
          {target?.mode === "new" && (
            <NewCustomerForm onTargetChange={onTargetChange} />
          )}
          {target?.mode === "edit" && (
            <EditCustomerForm
              key={target.customer.id}
              customer={target.customer}
              onTargetChange={onTargetChange}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
