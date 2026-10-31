/** Screen texts of the API codes for the sign-in form. */
export const SIGN_IN_ERRORS = {
  invalid_credentials: "El email o la contraseña no son correctos.",
  no_membership:
    "Tu usuario no está activo en ningún negocio. Escribinos para revisarlo.",
};

export const ROLE_LABELS = {
  owner: "Dueño",
  manager: "Encargado",
  crew: "Reparto",
} as const;

export const ACCOUNT_TEXTS = {
  loading: "Cargando tu cuenta…",
  businessGone: "Ya no tenés acceso a este negocio.",
  signOutFailed: "No pudimos cerrar la sesión. Probá de nuevo.",
};

export const NAVIGATION_TEXTS = {
  label: "Secciones",
  items: "Artículos",
  customers: "Clientes",
  account: "Cuenta",
};

export const READ_ONLY_NOTICE =
  "Tu negocio está en solo lectura: podés ver todo, pero no cargar ni cambiar nada. Escribinos para reactivarlo.";

export const PASSWORD_HINT =
  "Al menos 8 caracteres y uno que no sea letra ni número, como un espacio o un signo.";

export const LINK_INCOMPLETE =
  "A este link le falta una parte. Abrí de nuevo el link que te mandamos por WhatsApp, completo.";

export const DEFINE_PASSWORD_ERRORS = {
  weak_password:
    "La contraseña tiene que tener entre 8 y 128 caracteres y al menos uno que no sea letra ni número (un espacio o un signo sirven).",
  invalid_token:
    "Este link ya no sirve: puede que ya lo hayas usado o que haya vencido (dura 24 horas). Si ya definiste tu contraseña, entrá con tu email; si no, pedinos un link nuevo.",
  no_membership:
    "Guardamos tu contraseña, pero tu usuario no está activo en ningún negocio. Escribinos para revisarlo.",
};

export const PICKER_TEXTS = {
  loading: "Cargando tus negocios…",
  empty:
    "Tu usuario no está activo en ningún negocio. Escribinos para revisarlo.",
  businessGone: "Ya no tenés acceso a ese negocio. Elegí otro.",
};
