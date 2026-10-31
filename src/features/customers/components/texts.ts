export const CUSTOMERS_TEXTS = {
  loading: "Cargando clientes…",
  empty: "Todavía no cargaste clientes.",
  emptyFiltered: "No hay clientes con esa búsqueda.",
  newCustomer: "Nuevo cliente",
  more: "Ver más",
  retry: "Reintentar",
  search: "Buscar",
  searchLabel: "Nombre o WhatsApp",
};

export const SHEET_TEXTS = {
  newTitle: "Nuevo cliente",
  editTitle: "Editar cliente",
};

export const FORM_TEXTS = {
  name: "Nombre",
  whatsapp: "WhatsApp",
  save: "Guardar",
  saving: "Guardando…",
  loading: "Cargando…",
  unchanged: "No cambiaste nada.",
  taken: (name: string) => `Ese WhatsApp ya es de ${name}.`,
  editTaken: (name: string) => `Editar a ${name}`,
};

export const INVALID_WHATSAPP =
  "Tiene que tener 10 dígitos: característica y número, sin el 15.";

/** Screen texts of the API codes for the customer form. */
export const FORM_ERRORS = {
  invalid_request: "Revisá los datos e intentá de nuevo.",
};
