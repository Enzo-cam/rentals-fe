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
  onSaved?: (customer: Customer) => void;
};

function NewCustomerForm({ onTargetChange, onSaved }: FormProps) {
  const create = useCreateCustomer();
  return (
    <CustomerForm
      onSubmit={(values) =>
        create.submitOnce(createBodyOf(values), (customer) => {
          onSaved?.(customer);
          onTargetChange(null);
        })
      }
      onEditTaken={(customer) => onTargetChange({ mode: "edit", customer })}
      busy={create.isPending || create.isSuccess}
      error={create.error}
    />
  );
}

/**
 * Saving with nothing changed sends no PATCH. Where the sheet was opened with `onSaved` (the booking form, which got
 * here from a taken WhatsApp and only wants to use that customer), it is the customer the sheet opened with, handed over
 * as it is, and the sheet closes. Without `onSaved` (the list of customers) there is nobody to hand it to, so it says
 * that nothing changed and stays open.
 * AC-3 (rentals-be#29)
 */
function EditCustomerForm({
  customer,
  onTargetChange,
  onSaved,
}: FormProps & { customer: Customer }) {
  const update = useUpdateCustomer(customer.id);
  return (
    <CustomerForm
      defaultValues={formValuesOf(customer)}
      onSubmit={(values, opened) => {
        const patch = patchOf(opened, values);
        if (Object.keys(patch).length === 0) {
          if (!onSaved) return FORM_TEXTS.unchanged;
          onSaved(customer);
          onTargetChange(null);
          return;
        }
        update.submitOnce(patch, (saved) => {
          onSaved?.(saved);
          onTargetChange(null);
        });
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
 * another customer starts the form and its mutation again. The content is scrollable at a short screen. `onSaved`
 * hands over the customer that the API answered, for a new one and for an edited one (the 409 of a taken WhatsApp opens
 * the edit of that customer), so the booking form can choose it; an edit saved with nothing changed hands over the
 * customer it opened with (`EditCustomerForm`) (AC-3, rentals-be#29).
 */
export function CustomerSheet({
  target,
  onTargetChange,
  onSaved,
}: {
  target: SheetTarget;
  onTargetChange: (target: SheetTarget) => void;
  onSaved?: (customer: Customer) => void;
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
            <NewCustomerForm
              onTargetChange={onTargetChange}
              onSaved={onSaved}
            />
          )}
          {target?.mode === "edit" && (
            <EditCustomerForm
              key={target.customer.id}
              customer={target.customer}
              onTargetChange={onTargetChange}
              onSaved={onSaved}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
