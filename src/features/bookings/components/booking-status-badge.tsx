import { Badge } from "@/components/ui/badge";

import type { BookingStatus } from "../types";
import { BOOKING_STATUS_LABELS, HOLD_EXPIRED_LABEL } from "./texts";

type BadgeVariant = "default" | "secondary" | "highlight" | "outline";

/**
 * Always a pill with text, never only color (docs/brand.md): mustard for a hold, forest for confirmed, an outline for
 * delivered, and bone for what is over (returned, cancelled) or lost (an expired hold).
 */
const VARIANTS: Record<BookingStatus, BadgeVariant> = {
  hold: "highlight",
  confirmed: "default",
  delivered: "outline",
  returned: "secondary",
  cancelled: "secondary",
};

/** `holdExpired` is the API's word, never worked out here (INV-FE-01); it only applies to a hold. */
export function BookingStatusBadge({
  status,
  holdExpired = false,
}: {
  status: BookingStatus;
  holdExpired?: boolean;
}) {
  if (status === "hold" && holdExpired) {
    return <Badge variant="secondary">{HOLD_EXPIRED_LABEL}</Badge>;
  }
  return (
    <Badge variant={VARIANTS[status]}>{BOOKING_STATUS_LABELS[status]}</Badge>
  );
}
