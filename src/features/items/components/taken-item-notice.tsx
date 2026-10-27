import Link from "next/link";

import { ROUTES } from "@/lib/routes";

import type { takenItemOf } from "../api/failures";

type Taken = NonNullable<ReturnType<typeof takenItemOf>>;

function textOf({ field, item }: Taken): string {
  const archived = item.archived ? ", dado de baja" : "";
  return field === "name"
    ? `Ya tenés un artículo con este nombre${archived}.`
    : `Este código ya lo usa «${item.name}»${archived}.`;
}

/** Says which item holds the name or the code and links to it, so the person can decide what to do. */
export function TakenItemNotice({ taken }: { taken: Taken }) {
  return (
    <div role="alert" className="flex flex-col gap-1 text-sm">
      <p className="text-destructive">{textOf(taken)}</p>
      <Link href={ROUTES.item(taken.item.id)} className="underline">
        Ver «{taken.item.name}»
      </Link>
    </div>
  );
}
