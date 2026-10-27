"use client";

import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/routes";

import { createBodyOf } from "../api/item-body";
import { useCreateItem } from "../hooks/use-create-item";
import { useItemAccess } from "../hooks/use-item-access";
import { ItemForm } from "./item-form";
import { FORM_TEXTS } from "./texts";

/**
 * Who cannot manage goes back to the list, but only once `GET /me` answered: before that nobody knows the role. The
 * redirect is part of the render, so a 403 that refreshes `/me` also takes the person out (INV-FE-01: the API decides).
 */
export function NewItemScreen() {
  const access = useItemAccess();
  const create = useCreateItem();
  if (access.loaded && !access.canManage) redirect(ROUTES.items);
  if (!access.loaded) return <p role="status">{FORM_TEXTS.loading}</p>;

  return (
    <ItemForm
      onSubmit={(values) => create.submitOnce(createBodyOf(values))}
      busy={create.isPending || create.isSuccess}
      error={create.error}
    />
  );
}
