"use client";

import type { FormEvent, ReactNode } from "react";

import { failureOf, isLeavingSession } from "@/api/api-failure";
import { describeError } from "@/api/failure-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { entriesOfPages } from "@/lib/pages";

import { PICKER_TEXTS } from "./texts";

/**
 * The sheet that a picker opens over the form. It is always a sibling of the `<form>` and never inside it: a portal
 * keeps its place in the React tree, so the submit of the search of this sheet would climb to the form and save the
 * booking. The content is not mounted while the sheet is closed, so what it asks for is asked only when it opens.
 */
export function PickerSheet({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] overflow-y-auto rounded-t-2xl"
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-3 px-4 pb-4">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

/** A row that picks: a button, never a submit. */
export function PickerRow({
  onPick,
  disabled = false,
  children,
}: {
  onPick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPick}
      className="flex min-h-11 w-full flex-col gap-1 rounded-lg border p-3 text-left disabled:opacity-50"
    >
      {children}
    </button>
  );
}

/** What of an infinite query the list needs; the result of `useInfiniteQuery` has all of it. */
type PickerQuery<T> = {
  data: { pages: { items: T[] }[] } | undefined;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  isFetchNextPageError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
  refetch: () => unknown;
};

/**
 * The search and the rows of a picker, in the order of the API, with "Ver más". The search is a form of its own inside
 * the sheet: submitting it only gives `onSearch` the text, and nothing is asked while the person types.
 * A dead session is not an error here: the session providers are already leaving the screen.
 */
export function PickerList<T>({
  searchLabel,
  q,
  onSearch,
  query,
  idOf,
  renderRow,
  texts,
}: {
  searchLabel: string;
  q: string | null;
  onSearch: (q: string | null) => void;
  query: PickerQuery<T>;
  idOf: (row: T) => string;
  renderRow: (row: T) => ReactNode;
  texts: { loading: string; empty: string; emptyFiltered: string };
}) {
  const rows = query.data ? entriesOfPages(query.data.pages, idOf) : [];
  const leaving = isLeavingSession(failureOf(query.error));

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = new FormData(event.currentTarget).get("q");
    const trimmed = typeof text === "string" ? text.trim() : "";
    onSearch(trimmed === "" ? null : trimmed);
  }

  return (
    <>
      <form onSubmit={search} className="flex flex-col gap-2">
        <Label htmlFor="picker-search">{searchLabel}</Label>
        <div className="flex gap-2">
          <Input id="picker-search" name="q" autoComplete="off" />
          <Button type="submit" variant="outline">
            {PICKER_TEXTS.search}
          </Button>
        </div>
      </form>
      {rows.length > 0 && (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li key={idOf(row)}>{renderRow(row)}</li>
          ))}
        </ul>
      )}
      {query.isPending && <p role="status">{texts.loading}</p>}
      {query.data && rows.length === 0 && !query.hasNextPage && (
        <p>{q === null ? texts.empty : texts.emptyFiltered}</p>
      )}
      {query.isError && !leaving && (
        <div className="flex flex-col gap-2">
          <p role="alert">{describeError(query.error)}</p>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              query.isFetchNextPageError
                ? query.fetchNextPage()
                : query.refetch()
            }
          >
            {PICKER_TEXTS.retry}
          </Button>
        </div>
      )}
      {query.hasNextPage && !query.isError && (
        <Button
          type="button"
          variant="outline"
          disabled={query.isFetchingNextPage}
          onClick={() => query.fetchNextPage()}
        >
          {PICKER_TEXTS.more}
        </Button>
      )}
    </>
  );
}
