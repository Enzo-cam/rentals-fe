# Paso 7 del front: la hoja del fin de semana

**Estado:** plan propuesto (2026-11-25), **pendiente de compuerta**. Los criterios los propuso el arquitecto sobre las
decisiones del dueño de abajo, y todavía no se escribió código.

- **Ticket:** no hay ticket del front (rentals-be#24 era solo del backend). La PR cita este archivo, que hace de
  excepción R2 de `pr-con-foco`.
- **Contrato:** `GET /weekend-sheet` de rentals-be `7190bdb`, sin cambios ni `api:sync`. Llega a `main` con la C2: en
  el `main` de hoy (`3bb287a`) el path no está.
- **Base:** esta rama está apilada sobre `feat/step-4-5-fe-c2b-booking-edit` (rentals-fe#12). Después de mergear #11 y
  #12: `git rebase --onto origin/main feat/step-4-5-fe-c2b-booking-edit`, y cambiar la base de la PR a `main`.
- **Usuarios de E2E:** Ana (dueña), Marta (encargada), Beto (reparto), Olga (dueña de un negocio vencido, en solo
  lectura) y Dario (encargado en el negocio de Ana y reparto en Eventos Juan). Las fechas van en 2030, con
  `page.clock`.

## Decisiones del dueño (2026-11-25, no se reabren)

1. **Período por defecto: viernes a lunes.**
   - De martes a viernes abre el próximo viernes → lunes (si hoy es viernes, de hoy al lunes).
   - Sábado, domingo o lunes: de hoy al lunes. El lunes abre solo ese día.
   - Se cambia con Desde y Hasta, hasta 7 días, y queda en la URL.
2. **Entrada:**
   - Un quinto ítem **"Hoja"** en la barra de abajo, para todos los roles.
   - **El Reparto, al iniciar sesión, entra a la hoja.** Dueño y Encargado siguen entrando a Artículos.
3. **Qué muestra cada entrega o retiro, igual para todos los roles:**
   - la hora, el cliente con link `wa.me`, la dirección, los artículos con su cantidad y la nota;
   - **"Saldo a cobrar $ …" si `balanceDueCents > 0`, y "Saldado" si es 0**;
   - el estado.

   No hay precios por línea.
4. **Solo lectura:** cada fila es un link al detalle `/reservas/{id}`, donde ya están Entregar y Registrar la vuelta.

## Reglas elegidas (Modo MVP, van a la PR)

- **Lo que manda la API, tal cual:**
  - Si una reserva sale y vuelve dentro del rango, aparece en los dos días.
  - Las devueltas se muestran en su día, con el badge de estado.
- **Orden y textos:**
  - Los retiros atrasados van arriba, en su propia sección.
  - Un día vacío dice "No hay entregas ni retiros.".
- **Rango inválido:**
  - Más de 7 días, Hasta antes de Desde, un día que no existe o un extremo que falta: el formulario lo frena sin pedir,
    con una alerta de forma.
  - Un 400 que llega igual muestra el texto genérico, sin "Reintentar".
- **Pedidos:** `staleTime 0` y sin actualizaciones optimistas.
- **WhatsApp:** `wa.me/549` más los últimos 10 dígitos. Es la clave que guarda el back (`whatsappKey`, en
  `rentals-be/src/domain/customer.ts:33-43`).
- **Barra y entrada:**
  - "Hoja" va entre Reservas y Cuenta.
  - Elegir negocio también usa el rol del negocio elegido: un Reparto entra a la hoja.
- **API falsa:** los atrasados ignoran el reloj del servidor, porque los fixtures son de 2030. El borde "retiro antes
  de `from` con el día sin terminar" lo prueba solo el back.

## Pendiente de decidir (dueño)

- **Saldo negativo**, cuando la seña supera el total (`GLOSSARY.md` de rentals-be: "es negativo si la seña supera el
  total"). La decisión 3 no lo cubre. Opciones:
  - A: "Saldado".
  - B: un texto propio, por ejemplo "A favor del cliente $ 1.500".
  - C: como en la lista de reservas, "Saldo -$ 1.500".

  Mientras no se decida, el plan usa C, sin AC propio.

  Ojo: `formatCents` con un negativo que tiene centavos da "-$ 1.501,-50" (`src/lib/format/money.ts:21-25`).

## Criterios de aceptación (propuestos)

- **AC-1 — Período por defecto.** Ana abre `/hoja` sin parámetros. La URL sigue siendo `/hoja`, Desde y Hasta muestran
  el rango, y el GET lleva exactamente:

  | Reloj (`page.clock`) | Día en Argentina | `from` | `to` |
  |---|---|---|---|
  | 2030-03-05T15:00Z | mar 5 | 2030-03-08 | 2030-03-11 |
  | 2030-03-07T15:00Z | jue 7 | 2030-03-08 | 2030-03-11 |
  | 2030-03-09T02:00Z | vie 8, 23:00 (en UTC ya es sábado) | 2030-03-08 | 2030-03-11 |
  | 2030-03-09T15:00Z | sáb 9 | 2030-03-09 | 2030-03-11 |
  | 2030-03-10T15:00Z | dom 10 | 2030-03-10 | 2030-03-11 |
  | 2030-03-11T15:00Z | lun 11 | 2030-03-11 | 2030-03-11 |
- **AC-2 — La fila.** Ana abre `/hoja?from=2030-03-08&to=2030-03-11`.
  - Los h2 son "vie 8 mar 2030", "sáb 9 mar 2030", "dom 10 mar 2030" y "lun 11 mar 2030", sin "Retiros atrasados".
  - Lucía Benítez, en vie 8 "Entregas", muestra:
    - "08:00", "Confirmada" y "Av. Costanera 1200, Corrientes";
    - "Silla Tiffany blanca × 8 · Copa de vino × 12" y "Llevar mantel de repuesto";
    - "Saldo a cobrar $ 12.000", con el monto en extrabold;
    - el link "3794 555000" → `https://wa.me/5493794555000`.
  - Bar El Molino, en sáb 9, muestra "11:30", "Bloqueo", "Copa de vino × 20" y "Saldo a cobrar $ 8.000", sin dirección
    ni nota.
  - No aparece "c/u" ni "$ 1.500".
  - Lun 11 dice "No hay entregas ni retiros.".
  - El único botón es "Consultar", y sale un solo GET.
- **AC-3 — Sale y vuelve en el rango.**
  - Lucía está en vie 8 "Entregas" (08:00) y en dom 10 "Retiros" (17:00).
  - Bar El Molino está en sáb 9 "Entregas" (11:30) y en "Retiros" (19:00).
  - Vie 8 no tiene bloque "Retiros" y dom 10 no tiene bloque "Entregas".
- **AC-4 — De la fila al detalle.** Beto, con el reloj en 2030-03-09T02:00Z, toca a Lucía en vie 8.
  - Va a `/reservas/cccccccc-0000-4000-8000-000000000001`.
  - Toca "Entregar" y vuelve atrás: la hoja se pide de nuevo (2 GET), y las dos filas de Lucía dicen "Entregada".
- **AC-5 — Atrasados arriba.**
  - (a) `/hoja?from=2030-04-05&to=2030-04-08`:
    - los h2 son "Retiros atrasados", "vie 5 abr 2030", "sáb 6 abr 2030", "dom 7 abr 2030" y "lun 8 abr 2030";
    - los atrasados son, en orden, Lucía ("dom 10 mar 2030, 17:00", "Confirmada", "Saldo a cobrar $ 12.000") y Marcos
      Ríos ("dom 24 mar 2030, 19:00", "Entregada", "Calle 9 de Julio 450", "Saldo a cobrar $ 2.500");
    - dom 7 y lun 8 están vacíos.
  - (b) Lunes 2030-03-11T15:00Z, en `/hoja`: arriba los atrasados, con Lucía, y después un solo día, lun 11, vacío.
- **AC-6 — Saldado y devuelta.** En el rango de abril, "Asociación de Eventos y Fiestas Infantiles del Noreste
  Argentino" sale en vie 5 "Entregas" (09:00) y en sáb 6 "Retiros" (17:00). Las dos filas dicen "Devuelta" y
  "Saldado", y ninguna "$ 0". Toda fila con saldo > 0 dice "Saldo a cobrar $ …".
- **AC-7 — Cambiar el período.** Desde 2030-04-05, Hasta 2030-04-08 y "Consultar":
  - la URL pasa a `/hoja?from=2030-04-05&to=2030-04-08`, sale ese GET y se ve AC-5a;
  - al recargar, Desde y Hasta se conservan.
- **AC-8 — 7 días es válido.** Desde 2030-03-05 y Hasta 2030-03-11 dan 7 h2 de días y un GET con ese rango.
- **AC-9 — Rango inválido sin pedir.** Para 8 días, Hasta antes de Desde, `/hoja?from=2030-02-30&to=2030-03-02` o
  `/hoja?from=2030-03-08`: sale la alerta "Revisá el período: «Hasta» no puede ser antes de «Desde», y son como mucho 7
  días.", sin días ni "Reintentar", y no sale ningún GET con esos valores.
- **AC-10 — 400 de la API.** Un override 400 `invalid_request` da "Algo salió mal. Probá de nuevo.", sin
  "Reintentar".
- **AC-11 — 502.** Un 502 dos veces da "El sistema no está respondiendo. Probá de nuevo en unos minutos."; con
  "Reintentar" aparece Lucía.
- **AC-12 — Reparto.**
  - Beto entra por `/ingresar` y llega a `/hoja`.
  - En el rango de AC-2 ve las mismas filas, con saldo, dirección, artículos, nota y wa.me, sin "c/u", "$ 1.500",
    "Total", "Flete" ni "Seña".
- **AC-13 — Encargado.** Marta entra y llega a `/articulos`. En el rango de AC-2 ve lo mismo que Ana.
- **AC-14 — Solo lectura.** Olga ve a "Cliente de Olga" en vie 8 "Entregas", con "Confirmada" y "Saldo a cobrar $
  1.000", sin renglón de artículos. Ve el retiro en dom 10, y un solo botón: "Consultar".
- **AC-15 — Barra.**
  - Ana ve Artículos, Clientes, Reservas, Hoja y Cuenta. Beto ve Artículos, Reservas, Hoja y Cuenta.
  - En `/hoja`, "Hoja" tiene `aria-current="page"` y Reservas no.
  - A 360 px no hay scroll horizontal, y cada link mide ≥ 44 px de alto.
- **AC-16 — Guardia.** Sin cookie, `/hoja` responde 307 a `/ingresar` sin llamar a `/me`.
- **AC-17 — Página privada.** `/hoja` tiene `lang` es-AR y robots "noindex, nofollow", y no desborda a 360 px con el
  nombre más largo (rango de abril).
- **AC-18 — Elegir negocio por rol.**
  - Dario define la contraseña, elige "Eventos Juan · Reparto" y llega a `/hoja`.
  - Juan, que elige "Eventos Juan · Dueño", sigue llegando a `/articulos`.

## Pasos (un commit por paso, con su código y sus tests)

1. **`feat(format)`, en `src/lib/format/date-time.ts`:** `todayCalendarDate(now?)` (AAAA-MM-DD de hoy en Argentina),
   `parseCalendarDate(text)` (un día real o null), `addCalendarDays(date, n)` (con `Date.UTC`) y
   `weekdayOfCalendarDate(date)` (0 = domingo). Reusan `localPartsOf`, `isRealDay` y `CALENDAR_DATE`, que hoy son
   privados. Con Vitest: las 23:00 de Argentina que en UTC ya son el día siguiente, los cambios de mes, año y bisiesto,
   y los días que no existen. ≈ 35 líneas.
2. **`feat(lib)`, en `src/lib/whatsapp.ts`:** `waMeHref(whatsapp)` arma `https://wa.me/549` más los últimos 10
   dígitos, o devuelve null si hay menos de 10. Con Vitest. ≈ 12 líneas.
3. **`test(e2e)`:**
   - `e2e/support/fake-weekend-sheet-api.mjs`, con el molde de `fake-availability-api.mjs`;
   - `fake-bookings-api.mjs` expone `shownBookingsOf(access)`;
   - `fake-api.mjs` cablea la ruta;
   - `e2e/support/weekend-sheet.ts` lleva `sheetCalls` y las constantes.

   Los fixtures salen de `bookings-fixtures.json`: la fila abre el detalle de la misma reserva, y lo de Entregar se ve
   en la hoja (AC-4).
4. **`feat(weekend-sheet)`**, ≈ 430 líneas:
   - `ROUTES.weekendSheet = "/hoja"`, y `src/proxy.ts` suma `/hoja` al matcher;
   - `src/features/weekend-sheet/`:
     - `types`;
     - `api/keys`, `api/requests` y `api/filters` (`parseSheetFilters`, `sheetHref`, `isSheetRange` y
       `defaultSheetRange` con D1);
     - `hooks/use-weekend-sheet` (useQuery plana, `skipToken` y `staleTime 0`);
     - `hooks/use-today` (`useSyncExternalStore`, con el molde de `use-password-link-token.ts`, para no tener desajuste
       de hidratación ni efecto);
     - los componentes: pantalla, formulario del período y fila;
   - en la fila, el Link al detalle y el `<a>` de wa.me van como **hermanos**: no se puede poner un `<a>` dentro de
     otro;
   - `BookingStatusBadge` sale de `@/features/bookings`;
   - las líneas van en un solo texto, "Nombre × N · …";
   - `src/app/(app)/(negocio)/hoja/page.tsx`;
   - E2E: `e2e/flows/weekend-sheet.spec.ts`, y `route-guard.spec.ts` suma `/hoja`.
5. **`feat(session)`, la barra:** `app-navigation.tsx` suma "Hoja" (ícono `ClipboardList`), para todos los roles. Si
   desborda a 360 px: primero `px-1` y `gap-0`, y después `text-xs` (anotado en la PR, porque `docs/brand.md` manda la
   tipografía). Se actualiza `items-navigation.spec.ts`. ≈ 10 líneas.
6. **`feat(session)`, el destino según el rol:**
   - `next-path.ts` suma `landingPathOf(role)`: `/hoja` para crew, `/articulos` para el resto;
   - `use-select-business.ts` recibe `{businessId, role}` y manda solo el id;
   - `business-picker.tsx:43`;
   - se borra `AFTER_SIGN_IN_PATH`, que solo usan `next-path.ts:10` y `use-select-business.ts:21`.

   Tests:
   - `account.spec.ts:87` pasa de `**/articulos` a `**/hoja`: es Beto, y la decisión 2 cambió el destino;
   - nuevos en `sign-in.spec.ts` (Beto y Marta) y en `define-password.spec.ts` (Dario).

   Si no alcanza el tiempo, se recorta primero AC-18. ≈ 20 líneas.
7. **`docs`:** el mapa de `AGENTS.md` y este archivo, con los AC ya aprobados.

**Tamaño estimado:** ≈ 500 líneas de lógica, contra el techo de 1.200 del Modo MVP. Los tests y el soporte de E2E
suman ≈ 650, que no cuentan.

## Invariantes

- **INV-FE-01:** se pinta `days` y `overdue` como vienen. No se filtra, no se reordena, no se calculan atrasados ni
  montos, y no hay actualizaciones optimistas. El período por defecto y el tope de 7 días son comodidad y forma; la API
  valida igual.
- **INV-FE-02:** los tipos salen de `components["schemas"]`.
- **INV-FE-03:** la ruta cuelga de `(app)`, que es noindex (AC-17).
- **INV-FE-05:**
  - `formatCalendarDate` para los días, `formatTime` y `formatDateTime` para las horas, y `formatCents` para el saldo;
  - el "hoy" sale de `todayCalendarDate`, en la zona del negocio.
- **INV-FE-06:** cero `useEffect`. El período vive en la URL, el formulario no es controlado y el día sale de
  `useSyncExternalStore`.
- **INV-12 de rentals-be:** la fila toma el tipo `Booking`, sin precios, para todos los roles (AC-12).

## Riesgos

- **El login de todos** (paso 6): si falla, nadie llega a ninguna pantalla. Lo cubren `sign-in`, `define-password` y
  `account`.
- **La barra con 5 ítems** puede desbordar a 360 px en toda la app. Lo vigilan AC-15 y AC-17.
- **Hidratación:** el período por defecto se calcula solo en el cliente, y si se calcula en el servidor, AC-1 falla.
- **Volver al detalle:** "Volver a las reservas" del detalle lleva a `/reservas`, no a la hoja (es de C1 y no se toca).
  El botón atrás del navegador sí vuelve a la hoja.
