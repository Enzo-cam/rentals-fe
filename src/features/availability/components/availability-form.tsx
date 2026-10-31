"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { availabilityHref, parseAvailabilityFilters } from "../api/filters";
import type { AvailabilityFilters } from "../types";
import { AVAILABILITY_TEXTS } from "./texts";

/**
 * The period and the search live in the URL: submitting is a navigation, and the list asks the API again because its
 * query key has the filters. The fields are uncontrolled and keyed by their value in the URL, so they show what the URL
 * says after a reload or a back.
 */
export function AvailabilityForm({
  filters,
}: {
  filters: AvailabilityFilters;
}) {
  const router = useRouter();

  function consult(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (name: string) => {
      const field = data.get(name);
      return typeof field === "string" ? field : undefined;
    };
    router.push(
      availabilityHref(
        parseAvailabilityFilters({
          from: value("from"),
          to: value("to"),
          q: value("q"),
        }),
      ),
    );
  }

  return (
    <form onSubmit={consult} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="availability-from">{AVAILABILITY_TEXTS.from}</Label>
        <Input
          key={filters.from ?? ""}
          id="availability-from"
          name="from"
          type="datetime-local"
          defaultValue={filters.from ?? ""}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="availability-to">{AVAILABILITY_TEXTS.to}</Label>
        <Input
          key={filters.to ?? ""}
          id="availability-to"
          name="to"
          type="datetime-local"
          defaultValue={filters.to ?? ""}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="availability-search">{AVAILABILITY_TEXTS.search}</Label>
        <Input
          key={filters.q ?? ""}
          id="availability-search"
          name="q"
          autoComplete="off"
          defaultValue={filters.q ?? ""}
        />
      </div>
      <Button type="submit" size="lg">
        {AVAILABILITY_TEXTS.submit}
      </Button>
    </form>
  );
}
