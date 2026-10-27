import Link from "next/link";
import { useRouter } from "next/navigation";

import { describeError } from "@/api/failure-message";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";

import type { takenItemOf } from "../api/failures";
import { useSetItemArchived } from "../hooks/use-set-item-archived";

type Taken = NonNullable<ReturnType<typeof takenItemOf>>;

function textOf({ field, item }: Taken): string {
  const archived = item.archived ? ", dado de baja" : "";
  return field === "name"
    ? `Ya tenés un artículo con este nombre${archived}.`
    : `Este código ya lo usa «${item.name}»${archived}.`;
}

/**
 * Says which item holds the name or the code and links to it, so the person can decide what to do. If it is archived
 * it offers to reactivate it, and goes to its detail when that worked.
 */
export function TakenItemNotice({ taken }: { taken: Taken }) {
  const router = useRouter();
  const reactivate = useSetItemArchived(taken.item.id);
  return (
    <div role="alert" className="flex flex-col gap-1 text-sm">
      <p className="text-destructive">{textOf(taken)}</p>
      <Link href={ROUTES.item(taken.item.id)} className="underline">
        Ver «{taken.item.name}»
      </Link>
      {taken.item.archived && (
        <Button
          variant="outline"
          disabled={reactivate.isPending}
          onClick={() =>
            reactivate.mutate(false, {
              onSuccess: () => router.push(ROUTES.item(taken.item.id)),
            })
          }
        >
          Reactivar «{taken.item.name}»
        </Button>
      )}
      {reactivate.isError && <p>{describeError(reactivate.error)}</p>}
    </div>
  );
}
