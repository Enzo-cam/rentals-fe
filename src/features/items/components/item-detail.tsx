"use client";

import Link from "next/link";

import { failureOf, isLeavingSession } from "@/api/api-failure";
import { describeError } from "@/api/failure-message";
import { Button, buttonVariants } from "@/components/ui/button";
import { ReadOnlyNotice } from "@/features/session";
import { formatCents } from "@/lib/format/money";
import { ROUTES } from "@/lib/routes";

import { isItemMissing } from "../api/failures";
import { useItem } from "../hooks/use-item";
import { useItemAccess } from "../hooks/use-item-access";
import { ArchiveActions } from "./archive-actions";
import { DETAIL_TEXTS, ITEMS_TEXTS } from "./texts";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="break-words">{value}</dd>
    </div>
  );
}

/**
 * The price shows only if the object carries it, never by role (INV-FE-01). A dead session is not an error here: the
 * session providers are already leaving the screen.
 */
export function ItemDetail({ id }: { id: string }) {
  const access = useItemAccess();
  const item = useItem(id);
  const leaving = isLeavingSession(failureOf(item.error));
  const back = (
    <Link
      href={ROUTES.items}
      className={buttonVariants({ variant: "outline" })}
    >
      {DETAIL_TEXTS.back}
    </Link>
  );

  return (
    <div className="flex flex-col gap-4">
      {access.readOnly && <ReadOnlyNotice />}
      {item.data && (
        <>
          <h2 className="break-words text-lg font-medium">{item.data.name}</h2>
          {item.data.archived && <p>{ITEMS_TEXTS.archived}</p>}
          <dl className="flex flex-col gap-3">
            <Field
              label={DETAIL_TEXTS.totalStock}
              value={String(item.data.totalStock)}
            />
            <Field
              label={DETAIL_TEXTS.outOfService}
              value={String(item.data.outOfService)}
            />
            {"priceCents" in item.data && (
              <Field
                label={DETAIL_TEXTS.price}
                value={formatCents(item.data.priceCents)}
              />
            )}
            <Field
              label={DETAIL_TEXTS.category}
              value={item.data.category ?? DETAIL_TEXTS.noCategory}
            />
            <Field
              label={DETAIL_TEXTS.code}
              value={item.data.code ?? DETAIL_TEXTS.noCode}
            />
            <Field
              label={DETAIL_TEXTS.description}
              value={item.data.description ?? DETAIL_TEXTS.noDescription}
            />
          </dl>
        </>
      )}
      {item.isPending && <p role="status">{DETAIL_TEXTS.loading}</p>}
      {item.isError && isItemMissing(item.error) && (
        <p role="alert">{DETAIL_TEXTS.missing}</p>
      )}
      {item.isError && !isItemMissing(item.error) && !leaving && (
        <div className="flex flex-col gap-2">
          <p role="alert">{describeError(item.error)}</p>
          <Button variant="outline" onClick={() => item.refetch()}>
            {ITEMS_TEXTS.retry}
          </Button>
        </div>
      )}
      {item.data && access.canManage && (
        <Link href={ROUTES.editItem(item.data.id)} className={buttonVariants()}>
          {DETAIL_TEXTS.edit}
        </Link>
      )}
      {item.data && access.canManage && (
        <ArchiveActions
          id={item.data.id}
          name={item.data.name}
          archived={item.data.archived}
        />
      )}
      {back}
    </div>
  );
}
