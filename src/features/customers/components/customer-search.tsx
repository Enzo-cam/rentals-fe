"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { customersHref, parseCustomerFilters } from "../api/filters";
import type { CustomerFilters } from "../types";
import { CUSTOMERS_TEXTS } from "./texts";

/**
 * The search lives in the URL: submitting is a navigation, and the list asks the API again because its query key has
 * the filters. The field is uncontrolled and keyed by `q`, so it shows what the URL says after a reload or a back.
 */
export function CustomerSearch({ filters }: { filters: CustomerFilters }) {
  const router = useRouter();

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = new FormData(event.currentTarget).get("q");
    router.push(
      customersHref(
        parseCustomerFilters({ q: typeof q === "string" ? q : undefined }),
      ),
    );
  }

  return (
    <form onSubmit={search} className="flex flex-col gap-2">
      <Label htmlFor="customers-search">{CUSTOMERS_TEXTS.searchLabel}</Label>
      <div className="flex gap-2">
        <Input
          key={filters.q ?? ""}
          id="customers-search"
          name="q"
          autoComplete="off"
          defaultValue={filters.q ?? ""}
        />
        <Button type="submit" variant="outline">
          {CUSTOMERS_TEXTS.search}
        </Button>
      </div>
    </form>
  );
}
