import { formatCents } from "@/lib/format/money";
import { formatWholeNumber } from "@/lib/format/whole-number";

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

export const BOOKINGS_TEXTS = {
  loading: "Cargando reservas…",
  empty: "Todavía no hay reservas.",
  emptyFiltered: "No hay reservas con este estado.",
  more: "Ver más",
  retry: "Reintentar",
  checkAvailability: "Consultar disponibilidad",
  status: "Estado",
  allStatuses: "Todas",
  balance: (cents: number) => `Saldo ${formatCents(cents)}`,
};

export const BOOKING_DETAIL_TEXTS = {
  loading: "Cargando la reserva…",
  missing: "Esta reserva no existe o no es de tu negocio.",
  back: "Volver a las reservas",
  delivery: "Entrega",
  pickup: "Retiro",
  holdExpires: "Vence el bloqueo",
  delivered: "Entregada",
  returnRecorded: "Vuelta registrada",
  cancelled: "Cancelada",
  address: "Dirección",
  note: "Nota",
  freight: "Flete",
  deposit: "Seña",
  balanceDue: "Saldo a cobrar",
  each: "c/u",
  depositOn: (amount: string, date: string) => `${amount} el ${date}`,
};

export const BOOKING_FORM_TEXTS = {
  loading: "Cargando…",
  customer: "Cliente",
  chooseCustomer: "Elegir cliente",
  changeCustomer: "Cambiar cliente",
  status: "Estado",
  holdExpires: "Vence el bloqueo",
  delivery: "Entrega",
  pickup: "Retiro",
  eventDate: "Fecha del evento",
  occasion: "Motivo",
  items: "Artículos",
  addItem: "Agregar artículo",
  remove: "Quitar",
  removeItem: (itemName: string) => `Quitar ${itemName}`,
  quantity: "Cantidad",
  price: "Precio",
  free: (available: number) =>
    available <= 0
      ? "No hay libres"
      : `Hay ${formatWholeNumber(available)} ${available === 1 ? "libre" : "libres"}`,
  freight: "Flete",
  total: "Total",
  suggested: (cents: number) => `Suma de líneas y flete: ${formatCents(cents)}`,
  deposit: "Seña",
  depositDate: "Fecha de la seña",
  address: "Dirección",
  note: "Nota",
  save: "Guardar reserva",
  saving: "Guardando…",
};

/** The shortcuts of the deposit, as a share of the total. */
export const DEPOSIT_SHORTCUTS = [10, 20, 30] as const;

export const BOOKING_FORM_FAILURES = {
  notEnough: (requested: number, available: number) =>
    available <= 0
      ? `Pediste ${formatWholeNumber(requested)} y no hay libres.`
      : `Pediste ${formatWholeNumber(requested)} y hay ${formatWholeNumber(available)} ${available === 1 ? "libre" : "libres"}.`,
  archived: "Dado de baja.",
  invalidPeriod: "El retiro tiene que ser después de la entrega.",
  pickupInPast: "El retiro ya pasó: elegí un día que no haya pasado.",
  holdExpiry:
    "El bloqueo tiene que vencer después de ahora y no después de la entrega.",
  keyReused: "La reserva ya se había guardado con los datos anteriores.",
  seeBookings: "Ver las reservas",
};

/** Screen texts of the API codes for the booking form. */
export const BOOKING_FORM_ERRORS = {
  invalid_request: "Revisá los datos e intentá de nuevo.",
};

export const PICKER_TEXTS = {
  search: "Buscar",
  more: "Ver más",
  retry: "Reintentar",
  customerTitle: "Elegir cliente",
  customerSearch: "Nombre o WhatsApp",
  newCustomer: "Nuevo cliente",
  loadingCustomers: "Cargando clientes…",
  noCustomers: "Todavía no cargaste clientes.",
  noCustomersFound: "No hay clientes con esa búsqueda.",
  itemTitle: "Agregar artículo",
  itemSearch: "Nombre del artículo",
  loadingItems: "Cargando artículos…",
  noItems: "Todavía no cargaste artículos.",
  noItemsFound: "No hay artículos con esa búsqueda.",
  alreadyAdded: "Ya está en la reserva",
};

export const BOOKING_ACTION_TEXTS = {
  confirm: "Confirmar",
  deliver: "Entregar",
  return: "Registrar la vuelta",
  cancel: "Cancelar reserva",
  keep: "Volver",
  cancelTitle: (customerName: string) =>
    `¿Cancelar la reserva de ${customerName}?`,
  cancelDescription:
    "Se liberan las unidades al instante. La seña queda como está.",
  changed: "Esta reserva cambió mientras tanto. Mirá cómo quedó.",
  pickupInPast: "El retiro ya pasó: cambiale la fecha antes de confirmar.",
  unknownItem: "Un artículo",
  notEnough: (itemName: string, requested: number, available: number) =>
    `${itemName}: pediste ${formatWholeNumber(requested)} y hay ${formatWholeNumber(available)} ${available === 1 ? "libre" : "libres"}.`,
  archivedItem: (itemName: string) => `${itemName}: dado de baja.`,
};
