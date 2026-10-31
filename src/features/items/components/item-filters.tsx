"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { itemsHref, parseItemFilters } from "../api/filters";
import { useItemCategories } from "../hooks/use-item-categories";
import type { ItemFilters, ItemStatusFilter } from "../types";
import { FILTER_TEXTS } from "./texts";

const STATUS_OPTIONS: { value: ItemStatusFilter; label: string }[] = [
  { value: "active", label: FILTER_TEXTS.active },
  { value: "archived", label: FILTER_TEXTS.archived },
  { value: "all", label: FILTER_TEXTS.all },
];

const SELECT_CLASS =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-base";

/**
 * The filters live in the URL: each change is a navigation, and the list asks the API again because its query key has
 * the filters. The search field is uncontrolled and keyed by `q`, so it shows what the URL says after a reload or a
 * back. The category of the URL shows chosen even if it is not in the list of the business.
 */
export function ItemFilterBar({ filters }: { filters: ItemFilters }) {
  const router = useRouter();
  const categories = useItemCategories();
  const names = (categories.data?.pages ?? []).flatMap((page) =>
    page.items.map((category) => category.name),
  );
  if (filters.category !== null && !names.includes(filters.category)) {
    names.push(filters.category);
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = new FormData(event.currentTarget).get("q");
    const { q: parsed } = parseItemFilters({
      q: typeof q === "string" ? q : undefined,
    });
    router.push(itemsHref({ ...filters, q: parsed }));
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={search} className="flex flex-col gap-2">
        <Label htmlFor="items-search">{FILTER_TEXTS.search}</Label>
        <div className="flex gap-2">
          <Input
            key={filters.q ?? ""}
            id="items-search"
            name="q"
            defaultValue={filters.q ?? ""}
          />
          <Button type="submit" variant="outline">
            {FILTER_TEXTS.search}
          </Button>
        </div>
      </form>
      <div className="flex flex-col gap-2">
        <Label htmlFor="items-status">{FILTER_TEXTS.status}</Label>
        <select
          id="items-status"
          className={SELECT_CLASS}
          value={filters.status}
          onChange={(event) =>
            router.push(
              itemsHref({
                ...filters,
                status: event.target.value as ItemStatusFilter,
              }),
            )
          }
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {categories.isError && categories.data === undefined ? (
        <p>{FILTER_TEXTS.categoriesFailed}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <Label htmlFor="items-category">{FILTER_TEXTS.category}</Label>
          <select
            id="items-category"
            className={SELECT_CLASS}
            value={filters.category ?? ""}
            onChange={(event) =>
              router.push(
                itemsHref({
                  ...filters,
                  category: event.target.value || null,
                }),
              )
            }
          >
            <option value="">{FILTER_TEXTS.allCategories}</option>
            {names.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          {categories.hasNextPage && (
            <Button
              variant="outline"
              disabled={categories.isFetchingNextPage}
              onClick={() => categories.fetchNextPage()}
            >
              {FILTER_TEXTS.moreCategories}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
