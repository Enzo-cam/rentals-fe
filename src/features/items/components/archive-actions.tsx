"use client";

import { useState } from "react";

import { describeError } from "@/api/failure-message";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

import { isItemMissing } from "../api/failures";
import { useSetItemArchived } from "../hooks/use-set-item-archived";
import { ARCHIVE_TEXTS, DETAIL_TEXTS } from "./texts";

/**
 * "Dar de baja" asks first; "Reactivar" does not, because it undoes nothing that matters. The open dialog is the only
 * state here, and it is only UI. The button stays disabled while the POST travels, and the dialog closes on confirm so
 * a failure shows in the screen.
 */
export function ArchiveActions({
  id,
  name,
  archived,
}: {
  id: string;
  name: string;
  archived: boolean;
}) {
  const [open, setOpen] = useState(false);
  const setArchived = useSetItemArchived(id);

  return (
    <div className="flex flex-col gap-2">
      {archived ? (
        <Button
          variant="outline"
          disabled={setArchived.isPending}
          onClick={() => setArchived.mutate(false)}
        >
          {ARCHIVE_TEXTS.reactivate}
        </Button>
      ) : (
        <Button
          variant="outline"
          disabled={setArchived.isPending}
          onClick={() => setOpen(true)}
        >
          {ARCHIVE_TEXTS.archive}
        </Button>
      )}
      {setArchived.isError && (
        <p role="alert">
          {isItemMissing(setArchived.error)
            ? DETAIL_TEXTS.missing
            : describeError(setArchived.error)}
        </p>
      )}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ARCHIVE_TEXTS.title(name)}</AlertDialogTitle>
            <AlertDialogDescription>
              {ARCHIVE_TEXTS.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{ARCHIVE_TEXTS.cancel}</AlertDialogCancel>
            <Button
              disabled={setArchived.isPending}
              onClick={() => {
                setOpen(false);
                setArchived.mutate(true);
              }}
            >
              {ARCHIVE_TEXTS.archive}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
