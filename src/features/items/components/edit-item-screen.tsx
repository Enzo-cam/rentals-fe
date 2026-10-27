"use client";

import Link from "next/link";

import { failureOf, isLeavingSession } from "@/api/api-failure";
import { describeError } from "@/api/failure-message";
import { Button, buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";

import { isItemMissing } from "../api/failures";
import { formValuesOf, patchOf } from "../api/item-body";
import { useItem } from "../hooks/use-item";
import { useUpdateItem } from "../hooks/use-update-item";
import { ItemForm } from "./item-form";
import { ManageGate } from "./manage-gate";
import { DETAIL_TEXTS, FORM_TEXTS, ITEMS_TEXTS } from "./texts";

function EditForm({ id }: { id: string }) {
  const item = useItem(id);
  const update = useUpdateItem(id);
  const leaving = isLeavingSession(failureOf(item.error));

  if (item.data) {
    const current = item.data;
    return (
      <ItemForm
        key={current.id}
        defaultValues={formValuesOf(current)}
        onSubmit={(values) => {
          const patch = patchOf(current, values);
          if (Object.keys(patch).length === 0) return FORM_TEXTS.unchanged;
          update.submitOnce(patch);
        }}
        busy={update.isPending || update.isSuccess}
        error={update.error}
      />
    );
  }
  if (item.isPending) return <p role="status">{DETAIL_TEXTS.loading}</p>;
  if (isItemMissing(item.error)) {
    return (
      <div className="flex flex-col gap-2">
        <p role="alert">{DETAIL_TEXTS.missing}</p>
        <Link
          href={ROUTES.items}
          className={buttonVariants({ variant: "outline" })}
        >
          {DETAIL_TEXTS.back}
        </Link>
      </div>
    );
  }
  if (leaving) return null;
  return (
    <div className="flex flex-col gap-2">
      <p role="alert">{describeError(item.error)}</p>
      <Button variant="outline" onClick={() => item.refetch()}>
        {ITEMS_TEXTS.retry}
      </Button>
    </div>
  );
}

/** The item is only asked for once the gate knows that the person can manage: who cannot never sees the form. */
export function EditItemScreen({ id }: { id: string }) {
  return (
    <ManageGate>
      <EditForm id={id} />
    </ManageGate>
  );
}
