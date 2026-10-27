"use client";

import { createBodyOf } from "../api/item-body";
import { useCreateItem } from "../hooks/use-create-item";
import { ItemForm } from "./item-form";
import { ManageGate } from "./manage-gate";

export function NewItemScreen() {
  const create = useCreateItem();

  return (
    <ManageGate>
      <ItemForm
        onSubmit={(values) => create.submitOnce(createBodyOf(values))}
        busy={create.isPending || create.isSuccess}
        error={create.error}
      />
    </ManageGate>
  );
}
