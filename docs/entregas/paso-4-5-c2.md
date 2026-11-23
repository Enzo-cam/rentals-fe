# Paso 4-5, entrega C2: alta y edición de reservas

Ticket: `Enzo-cam/rentals-be#29`. Contrato: rentals-be `7190bdb` (`src/api/openapi.source.json`). Es la última entrega
del paso 4-5 del front (A: clientes, B: lectura de reservas, C1: acciones de estado, C2: esta).

Las fechas de los fixtures son de 2030. Usuarios de E2E: Ana (dueña del negocio A), Marta (encargada de A), Beto
(reparto de A) y Olga (dueña de C, que está en solo lectura).

## Partición

La C2 va en dos PR apiladas (decisión del fundador, 2026-11-23: el alta sola pasa el techo de 1.200 líneas de lógica
del Modo MVP y no se puede partir sin dejar un formulario a medias).

| PR | Qué trae | Criterios |
|---|---|---|
| **C2a**, rentals-fe#11 | Alta en `/reservas/nueva`: formulario, selectores de cliente y artículo, ayuda de libres, total sugerido, atajos de la seña y fallas | AC-1 a AC-11 |
| **C2b**, apilada sobre C2a | Lista desde hoy y píldora "Nueva reserva"; Total y Evento en el detalle; edición en `/reservas/[id]/editar` | AC-12 a AC-23, más lo de AC-1 y AC-11 que depende de la píldora y del detalle |

## Criterios de aceptación

### C2a: alta

- **AC-1** (#29-1) — Dada una reserva en Bloqueo que vence el 12/3 12:00, para Lucía, con entrega el 15/3 08:00,
  retiro el 16/3 19:00, evento el 15/3 "Casamiento", Silla × 80 a $ 5.000 escrito y Copa × 200 al precio de lista
  ($ 350), con flete de $ 30.000, cuando la pantalla muestra "Suma de líneas y flete: $ 500.000", escribo Total
  $ 450.000, toco el atajo 20 % ($ 90.000) con fecha 1/3 y guardo, entonces sale **un** `POST /bookings` con una
  `Idempotency-Key` UUID y el cuerpo exacto: `totalCents 45000000`, `freightCents 3000000`,
  `deposit {amountCents 9000000, date 2030-03-01}`, precios en centavos e instantes con `-03:00`. La pantalla va con
  `router.replace` a `/reservas/{id}`, y el detalle muestra la Seña y el Saldo que da la API ($ 360.000). El Total y el
  Evento del detalle llegan en C2b (AC-14).
- **AC-2** (#29-2) — Dada una reserva Confirmada con el Total sin tocar ("3.000"), cuando guardo, entonces el cuerpo
  lleva `totalCents 300000` y `freightCents 0`, sin `holdExpiresAt`, `deposit`, `eventDate`, `occasion`, `address` ni
  `note`.
- **AC-3** — Cuando busco un cliente, entonces se pide `GET /customers?q` y lo puedo elegir. "Nuevo cliente" abre la
  hoja de Clientes: el `POST /customers` la cierra y el cliente queda elegido. No sale ningún `POST /bookings` antes de
  "Guardar reserva".
- **AC-4** — Con entrega y retiro válidos, se pide `GET /availability?from&to&ids=silla,copa&limit=100` y cada línea
  muestra "Hay 86 libres" o "Hay 1.080 libres". Si la cantidad supera los libres, la ayuda va en rojo y Guardar sigue
  habilitado. Sin fechas no se pide.
- **AC-5** — Con la forma mal (sin cliente, sin líneas, bloqueo sin vencimiento, precio "1,5", seña sin fecha), cada
  campo muestra su mensaje y no sale ningún `POST`.
- **AC-6** (#29-3) — Ante un 409 `insufficient_stock`, la línea muestra "Pediste 100 y hay 86 libres.". Si bajo a 80 y
  guardo, sale 201 con **la misma** clave.
- **AC-7** — Ante un 409 `item_archived`, la línea muestra "Dado de baja.".
- **AC-8** — Un 400 `invalid_period` o `pickup_in_past` se muestra bajo Retiro, y un `invalid_hold_expiry` bajo "Vence
  el bloqueo".
- **AC-9** (#29-3) — Ante un 422 `idempotency_key_reused`, la pantalla dice "La reserva ya se había guardado con los
  datos anteriores." y da un link a las reservas.
- **AC-10** (#29-3) — Ante un 502, la pantalla dice "El sistema no está respondiendo…", y el reintento da 201 con **la
  misma** clave.
- **AC-11** (#29-6) — Beto (reparto) y Olga (solo lectura) que entran a `/reservas/nueva` vuelven a `/reservas` sin que
  se pidan clientes ni artículos. Que no vean "Nueva reserva" llega en C2b (AC-13).

### C2b: lista, detalle y edición

- **AC-12** (#29-5) — Con `page.clock` en 2030-03-08T02:00Z, la lista pide `from=2030-03-07T00:00:00-03:00`, también
  en "Ver más". "Ver todas" pasa a `?all=1` y pide sin `from`. El filtro de estado conserva `all`, y "Desde hoy" lo
  saca.
- **AC-13** — "Nueva reserva" es la píldora, y "Consultar disponibilidad" va con borde. El Reparto ve solo "Consultar
  disponibilidad".
- **AC-14** — El detalle muestra el Total si viene `totalCents`, y el Evento como "sáb 9 mar 2030 · Cumpleaños". Beto
  ve el Evento y no el Total.
- **AC-15** (#29-4) — En un Bloqueo en el que solo cambia la Nota, sale un `PATCH` con `{"note":…}` exacto. La
  dirección vaciada manda `{"address":null}`.
- **AC-16** — Sin cambios, la pantalla dice "No cambiaste nada." y no sale ningún `PATCH`.
- **AC-17** — En un Bloqueo al que agrego Silla × 10 y paso la Copa a $ 400, `lines` va completa, con `priceCents` en
  la nueva y en la cambiada y sin `totalCents`. "Hay N libres" aparece solo bajo la línea nueva. La suma de referencia
  es $ 24.000 con Total $ 8.000. Una seña por atajo manda `deposit`.
- **AC-18** — En una Confirmada, los precios viejos son de solo lectura con "El precio quedó fijo al confirmar.", no
  está "Vence el bloqueo" y la seña cargada es de solo lectura. Si cambio una cantidad, `lines` va sin `priceCents`.
- **AC-19** — En una Entregada solo se editan Retiro, Dirección y Nota, y el `PATCH` es `{pickupAt}`.
- **AC-20** — Una Devuelta o Cancelada no tiene "Editar", y `/editar` vuelve al detalle sin `PATCH`.
- **AC-21** — Los 409 `line_price_locked`, `booking_not_editable` (que vuelve a pedir la reserva) y
  `deposit_already_set` tienen su texto propio.
- **AC-22** (#29-6) — Beto y Olga no ven "Editar", y `/editar` los devuelve a `/reservas`.
- **AC-23** — "Editar" es un **link** con borde, no un botón (los tests de C1 cuentan `role=button`).

## Reglas elegidas (Modo MVP: la más simple que sirve a la operatoria)

### C2a

- **Estado y precios:**
  - El estado por defecto es Bloqueo.
  - Un precio sin tocar se manda como el mostrado.
- **Total, flete y seña:**
  - El Total vacío es error.
  - El flete vacío manda 0.
  - La fecha de la seña no se prellena. Una seña con monto y sin día marca el día, y un día sin monto marca el monto.
    El monto es mayor que cero.
- **Líneas:**
  - Cantidad de 1 a 100.000, y de 1 a 100 líneas: son los límites del contrato.
  - La línea nueva arranca con cantidad 1.
  - Un artículo que ya está en la reserva queda deshabilitado en el selector ("Ya está en la reserva"), porque la API
    rechaza el mismo artículo en dos líneas.
- **Ayuda de libres:**
  - Con libres ≤ 0 dice "No hay libres", y con 1, "Hay 1 libre".
  - Consulta [entrega, retiro), mientras la ocupación real llega al fin del día del retiro: puede decir "hay 86" y que
    la API responda 409. Es solo una ayuda.
- **"Nuevo cliente":**
  - Cierra el selector y abre la hoja de Clientes.
  - Si el WhatsApp ya tiene cliente, la hoja pasa a editar a ese cliente, como en Clientes. Al guardar, con o sin
    cambios, queda elegido; sin cambios no sale ningún pedido.
- **Textos de AC-8:**
  - `invalid_period`: "El retiro tiene que ser después de la entrega.".
  - `pickup_in_past`: "El retiro ya pasó: elegí un día que no haya pasado.".
  - `invalid_hold_expiry`: "El bloqueo tiene que vencer después de ahora y no después de la entrega.".
- **El link de AC-9** se llama "Ver las reservas", para no chocar con "Reservas" de la barra de abajo.

### C2b

- **Lista:**
  - "Ver todas" y "Desde hoy" conservan el estado.
  - `from` se calcula en cada pedido. Pasar la medianoche entre páginas puede dar `invalid_cursor`, y entonces
    "Reintentar" no se recupera hasta recargar la página.
  - Vacía y desde hoy, la lista dice "No hay reservas desde hoy.". Con "Ver todas" sigue diciendo "Todavía no hay
    reservas.".
- **Edición, qué se muestra:**
  - El estado no se elige: las transiciones son las acciones del detalle (C1).
  - En una Entregada se ocultan los campos que no se pueden cambiar; el detalle ya los muestra.
  - "Hay N libres" aparece solo en las líneas nuevas, porque la API cuenta la propia reserva como ocupada.
- **Edición, al guardar:**
  - La edición va sin clave, porque el contrato no la tiene.
  - Después de editar, la pantalla vuelve al detalle con `router.push`, como en Artículos.
  - Los tres 409 de la edición salen encima de "Guardar", y los tres vuelven a pedir la reserva:
    - `line_price_locked`: "El precio de las líneas que ya estaban quedó fijo al confirmar la reserva. Dejalo como
      estaba.".
    - `booking_not_editable`: "Esta reserva cambió mientras tanto y ya no admite este cambio. Mirá cómo quedó.".
    - `deposit_already_set`: "La seña ya estaba cargada y no se puede cambiar. Mirá cómo quedó la reserva.".

### Arreglo que entra en C2b (dueño, 2026-11-23)

`buttonVariants` (`src/components/ui/button.tsx`) no fusionaba las clases, y un `Link` con forma de botón "outline"
quedaba sin borde. Va un commit `fix(ui)` aparte. Ganan el borde "Consultar disponibilidad" y "Editar" (que lo pide
AC-13 y AC-23), y también los links que ya existían:

- "Volver a los artículos", en el detalle del artículo y en su edición cuando el artículo no existe;
- "Ver los artículos", en Cargar lista;
- "Cargar lista", en Artículos;
- "Volver a las reservas", en el detalle de la reserva;
- "Ver las reservas", en el alta.
