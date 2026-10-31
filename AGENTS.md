# rentals-fe

Frontend de rentals en Next.js: la aplicación que usa el negocio desde el celular (consultar disponibilidad,
armar el presupuesto, la hoja del fin de semana, la devolución) y el sitio público (landing y links de
presupuesto que se comparten por WhatsApp).

**Las reglas de negocio viven en `rentals-be`.** Este repo no calcula disponibilidad, estados ni montos: los pide a
la API y los muestra. El vocabulario es el de `../rentals-be/GLOSSARY.md`.

## Stack

- Next.js 16.4 (App Router) + React 19.3 + TypeScript 5.9 estricto, Tailwind CSS 4.3, shadcn/ui (estilo
  `base-nova`). Node ≥ 24.7, pnpm 11.
- Datos: cliente tipado generado desde el OpenAPI de `rentals-be` con **openapi-typescript 7** (tipos, en
  `src/api/schema.d.ts`) y **openapi-fetch 0.17** (cliente). `pnpm api:sync` lo regenera. Nunca tipos escritos a mano
  para la API.
- Sesión: el navegador habla solo con este origen; el proxy `/api/[...path]` reenvía a la API (ADR-0001).
- PWA: postergada; por ahora es web online.
- Idioma: código en inglés, textos de pantalla en español (ADR-0001 de `rentals-be`).
- Estado y datos: React Query en `(app)`, Server Components en lo público, react-hook-form + Zod en formularios, sin
  librería de estado global (ADR-0002).
- Tests: **Playwright** para flujos, páginas (con SEO) y componentes (stories + `mount()`); **Vitest** solo para
  funciones puras (ADR-0002).

## Arquitectura (obligatoria)

**[`docs/architecture.md`](docs/architecture.md) manda sobre cómo se escribe cada archivo de este repo:** features,
reglas de imports, React Query, dónde vive cada estado, `useEffect` solo en `src/lib/effects/` (INV-FE-06), SEO y
tests. Toda PR pasa su checklist.

## Mapa

Lo que hay hoy (la estructura objetivo completa está en `docs/architecture.md` §2):

```text
src/
├── proxy.ts                    guardia optimista de /cuenta, /elegir-negocio, /articulos y /clientes (y lo que cuelga): sin cookie, 307 a /ingresar
├── app/
│   ├── layout.tsx              <html lang="es-AR">, metadata base
│   ├── (publico)/page.tsx      "/": estado de la API (Server Component, noindex)
│   ├── (app)/layout.tsx        aplicación del negocio: noindex y <SessionProviders>
│   ├── (app)/ingresar/         entrar con email y contraseña
│   ├── (app)/definir-contrasena/  definir la contraseña con el link de WhatsApp (el token va en el fragmento)
│   ├── (app)/elegir-negocio/   elegir negocio si el usuario tiene varios
│   ├── (app)/(negocio)/        pantallas con sesión y negocio: layout.tsx pone la barra de abajo (AppNavigation) y el
│   │                           espacio para que no tape el final
│   │   ├── cuenta/             quién soy, negocio, rol y salir
│   │   ├── articulos/          lista y búsqueda; nuevo/, [id]/ (detalle), [id]/editar/ y cargar-lista/
│   │   └── clientes/           lista con búsqueda y "Ver más"; alta y edición en una hoja sobre la lista
│   └── api/[...path]/route.ts  proxy BFF (ADR-0001)
├── features/
│   ├── bookings/               base de las reservas: BookingStatusBadge (estado en píldora) y BookingRefList (la lista
│   │                           de reservas que nombra un 409); se importa solo por index.ts
│   ├── customers/              clientes: lista, búsqueda, alta y edición en una hoja (se importa solo por index.ts):
│   │   ├── api/                keys, requests, filtros de la URL, cuerpos de alta y edición, fallas (409 y 400) y acceso por rol
│   │   ├── hooks/              use-customers, use-create-customer, use-update-customer y use-customer-access
│   │   └── components/         pantalla, fila, búsqueda, hoja, formulario, textos y la guardia CustomersGate
│   ├── health/                 llamada a GET /health y su tarjeta de estado
│   ├── items/                  artículos: lista, detalle, alta, edición, baja y carga por lista (se importa solo por index.ts):
│   │   ├── api/                keys, requests, filtros de la URL, cuerpos de alta y edición, fallas y acceso por rol
│   │   ├── hooks/              use-items, use-item, use-item-categories, use-create-item, use-update-item,
│   │   │                       use-set-item-archived, use-item-import y use-item-access
│   │   └── components/         pantallas, formulario, vista previa de la carga, textos y la guardia ManageGate
│   └── session/                sesión de los usuarios de los negocios (se importa solo por index.ts):
│       ├── api/                keys, requests (login, contraseña, negocios, /me, logout) y destino al entrar
│       ├── hooks/              use-sign-in, use-define-password, use-my-businesses, use-select-business, use-me,
│       │                       use-sign-out y la lectura del token del fragmento
│       └── components/         formularios y pantallas, textos, SessionProviders (QueryClient del navegador) y
│                           AppNavigation (la barra de abajo: Artículos, Clientes, Cuenta)
├── api/
│   ├── openapi.json            contrato copiado de rentals-be (openapi.source.json dice de qué commit)
│   ├── schema.d.ts             tipos generados: no se editan
│   ├── server.ts               solo servidor: cliente con API_URL + X-Origin-Secret, y el proxy
│   ├── browser-client.ts       cliente del navegador: baseUrl /api, timeout de 15 s
│   ├── api-failure.ts          errores de la API: ApiFailure, ApiError, unwrap, Retry-After
│   ├── failure-message.ts      textos genéricos de cada falla
│   ├── query-client.ts         QueryClient: un reintento solo por red o 5xx, mutaciones sin reintento
│   ├── idempotency.ts          createIdempotencyKeys: cuándo se reutiliza la Idempotency-Key y cuándo se pide otra
│   ├── use-idempotent-mutation.ts  useMutation que recibe la Idempotency-Key de la acción
│   ├── bff-proxy.ts            el proxy: CSRF, límite de body, timeout, errores 5xx
│   ├── proxy-rules.ts          reglas puras del proxy: listas de headers, CSRF, IP del cliente
│   └── server-env.ts           lee API_URL, ORIGIN_SECRET y FRONT_ORIGIN
├── components/ui/              shadcn/ui (card, button, input, label, alert-dialog, badge, select, sheet, textarea) con la forma de la marca, y BrandMark
                                (la marca como SVG, docs/brand.md)
└── lib/                        routes.ts (rutas y destino al entrar); pages.ts (las entradas de las páginas de una
                                lista, sin repetir); format/ (money, whole-number y date-time: único lugar que da
                                formato y lee plata, enteros y fechas); effects/ llega con su primer uso
e2e/                            Playwright: flows/, pages/, proxy/ y support/ (API falsa local: fake-session-api,
                                fake-items-api y fake-customers-api, con sus fixtures)
scripts/                        api-sync, api-check, check-client-env
```

## Reglas

1. **Mobile-first.** Cada pantalla de `(app)` se diseña y se prueba primero a 360 px de ancho.
2. **Sin lógica de negocio.** Si un componente decide si hay stock o cuánto se cobra, la lógica está en el repo
   equivocado.
3. **Contrato primero.** Una pantalla que necesita un endpoint nuevo espera a la PR de `rentals-be` que lo
   publica. La PR del frontend dice qué versión del OpenAPI consume.
4. **SEO técnico** (skill `seo-tecnico`): lo público, renderizado en el servidor; lo privado y los links de
   presupuesto, con `noindex` y fuera del sitemap.
5. **WhatsApp por links `wa.me`**, sin API.
6. **Marca.** [`docs/brand.md`](docs/brand.md) manda sobre colores, tipografía, íconos, forma de los componentes y tono
   de los textos (voseo). Se usan los tokens semánticos de `src/app/globals.css`: nunca un color suelto. Una acción
   principal por pantalla, en píldora.

## Módulos de referencia

Se completan con cada pantalla que pase `/review-pr`. Las filas con `—` todavía no tienen un módulo que lo cubra.

| Para | Mirá |
|---|---|
| Una pantalla de la aplicación | `src/features/items/components/items-screen.tsx` (lista, filtros en la URL, "Ver más", rol y solo lectura) |
| Una página pública | — |
| Un formulario con validación | `src/features/items/components/item-form.tsx` (alta y edición; react-hook-form + Zod solo de forma) |
| Un test de componente | — |

## Contrato para agentes

- **Plan de trabajo actual:** `../rentals-be/docs/plan-boceto.md` (los pasos `1b` y los de pantallas son de este repo)
- Comandos: [`docs/agents/commands.md`](docs/agents/commands.md)
- Invariantes: [`docs/agents/invariants.md`](docs/agents/invariants.md)
- **Arquitectura:** [`docs/architecture.md`](docs/architecture.md) · **Marca:** [`docs/brand.md`](docs/brand.md)
- Glosario: `../rentals-be/GLOSSARY.md` · Decisiones: [`docs/adr/`](docs/adr/) (sesión y proxy:
  [0001](docs/adr/0001-sesion-y-proxy-bff.md); features, estado y tests:
  [0002](docs/adr/0002-arquitectura-por-features.md)) y las de `../rentals-be/docs/adr/`

## Presupuesto de PR

- Máximo 700 líneas de lógica de producción por PR. Tests, cliente generado y estilos no cuentan. La PR resume qué
  casos y bordes cubren los tests.
- Un solo foco por PR.
- Toda PR enlaza su ticket como `Enzo-cam/rentals-be#N`.

## Modo MVP

Vigente desde 2026-10-31, hasta que el flujo de punta a punta esté probado a mano (objetivo: 2026-11-07). Pedido del
fundador: avanzar, testear, probar, cerrar la tarea y seguir. Aplica `contrato-repo` (sección "Modo MVP") y **manda
sobre "Presupuesto de PR" y "Tests"** en lo que se contradiga.

- **Alcance del MVP:** los pasos 0 a 7 de `../rentals-be/docs/plan-boceto.md` y las pantallas de cada uno. El paso 8
  (eventos de uso) y el 9 (backoffice) quedan fuera hasta probar el flujo.
- **Amenazas:** lo que un usuario de un negocio puede hacer desde la aplicación, y que un negocio no vea lo de otro (ya
  construido: no se vuelve a revisar salvo que el cambio toque esas tablas o rutas). **Nadie más que el fundador tiene
  acceso a la base ni al servidor:** no se diseña ni se revisa contra eso.
- **Bordes:** los de la operatoria de un negocio de alquiler para eventos: reservar de más, fechas y horarios,
  cliente repetido, entrega, devolución, cancelar, vencer un bloqueo. Sin casos rebuscados.
- **Preguntas:** no se pregunta por un borde. Se elige la regla más simple que sirva a la operatoria y se anota en la
  PR. Se pregunta solo si cambia lo que el dueño del negocio ve o hace (precios, estados, quién ve qué).
- **PR:** hasta **1200 líneas** de lógica de producción sin ceremonia de aviso, y cuerpo corto (`pr-con-foco`, "PR
  corta"). Un solo foco igual.
- **Suite:** en local, solo los archivos tocados más typecheck y lint. La suite completa es el CI, y se espera en verde.
- **Cierre:** terminada la tarea, el agente la cierra (`/dev` §10): commit, PR, CI, merge y plan al día, y sigue con la
  siguiente. El fundador prueba el flujo a mano al final.
- **Tiempo:** un paso, una hora. Si se pasa, se recorta el alcance y se anota lo recortado.
- **Tests:** E2E por flujo (a 360 px) y Vitest solo en lo compartido, como dice "Tests (alcance)". Los errores se
  prueban dentro del flujo que los muestra.
- **Marca:** `docs/brand.md` sigue mandando sobre colores, tipografía y tono; el MVP no la relaja.

## Tests (alcance)

Pedido del fundador, 2026-10-31. Lo ya escrito no se saca; vale para lo que se escriba de acá en adelante.

- **No hay un `error.ts` con su `error.test.ts` por cada API ni por cada feature.** Los errores de una feature se
  prueban dentro del flujo que los muestra (el E2E de la pantalla), no uno por uno.
- **Se prueba el conjunto, no la pieza suelta:** un flujo de punta a punta, o un módulo importante con su
  comportamiento completo, antes que un test por función o por archivo.
- **Vitest va solo en lo que importan otros módulos y es importante:** funciones generales compartidas (por ejemplo
  `src/lib/format`, el cliente de la API, la sesión) y módulos que sostienen un invariante. Una función que usa un solo
  componente se cubre desde el componente.
- Si dudás entre agregar un test chico y ampliar uno de conjunto, ampliá el de conjunto.

## Comentarios

- **El objetivo es que los comentarios sean útiles, no que no haya ninguno.** Un comentario útil explica un porqué
  que el código no puede decir: un comportamiento del navegador o de Next, un riesgo de seguridad, una decisión
  tomada. Lo que el nombre de la función, el componente o el test ya dice, no se comenta.
- Van como JSDoc `/** … */` justo antes de la declaración (función, componente, type, const, objeto de config),
  nunca dentro del cuerpo de una función, entre sentencias ni en JSX. En dependency-cruiser, el campo `comment`.
- Si el porqué ya está en un ADR, en `docs/architecture.md` o en un invariante, el JSDoc lo referencia
  (`@see docs/adr/0001-sesion-y-proxy-bff.md`, `INV-FE-04`) en vez de repetirlo. Los archivos generados no se tocan.

## Commits

- **Se agrupan por archivos relacionados:** un commit por pieza (configuración, herramientas, cliente de la API,
  proxy, un feature con su página, CI, docs), con el código y sus tests en el mismo commit. Ni un commit gigante con
  todo, ni uno por archivo: la PR se tiene que poder seguir commit por commit.
- Mensajes en inglés (ADR-0001 de `rentals-be`), con prefijo convencional: `feat`, `fix`, `refactor`, `test`,
  `chore`, `ci`, `docs`.
- Nadie commitea, pushea ni abre una PR sin pedido explícito del humano.

## Agent skills

### Issue tracker

Los tickets viven en `Enzo-cam/rentals-be`, no en este repo. See `docs/agents/issue-tracker.md`.

### Triage labels

Las cinco etiquetas por defecto, gestionadas en `rentals-be`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context, con el glosario en `rentals-be`. See `docs/agents/domain.md`.
