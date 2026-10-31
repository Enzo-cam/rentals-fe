import type { BookingStatus } from "../types";

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  hold: "Bloqueo",
  confirmed: "Confirmada",
  delivered: "Entregada",
  returned: "Devuelta",
  cancelled: "Cancelada",
};

export const HOLD_EXPIRED_LABEL = "Bloqueo vencido";

export const BOOKING_REF_TEXTS = {
  hasMore: "Y hay más reservas.",
};
