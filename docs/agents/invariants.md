# Invariantes

Reglas que **nunca** se rompen en este repo. Las reglas de negocio están en `../rentals-be/docs/agents/invariants.md`;
acá solo lo que el frontend puede romper por su cuenta.

## INV-FE-01 — El frontend no decide reglas de negocio

- **Regla:** disponibilidad, transiciones de estado y montos los calcula `rentals-be`. El frontend los muestra. Una
  validación local es solo de forma (campo vacío, formato) y nunca reemplaza la del backend.
- **Por qué:** dos implementaciones de la misma regla terminan dando dos respuestas.
- **Auditor:** integridad

## INV-FE-02 — Tipos de la API generados, nunca escritos a mano

- **Regla:** todo acceso a la API pasa por el cliente generado desde el OpenAPI de `rentals-be`, y la PR declara qué
  versión consume.
- **Por qué:** un tipo escrito a mano se desincroniza en silencio cuando cambia el backend.
- **Auditor:** estándares

## INV-FE-03 — Lo privado no se indexa

- **Regla:** las páginas de la aplicación y los links de presupuesto llevan `noindex` y no aparecen en el sitemap.
  Los links de presupuesto llevan Open Graph completo para la vista previa de WhatsApp.
- **Por qué:** los presupuestos tienen datos de clientes; además, páginas privadas indexadas ensucian el SEO.
- **Auditor:** seguridad

## INV-FE-04 — Nada sensible en el cliente

- **Regla:** sin secretos en variables `NEXT_PUBLIC_*`, sin tokens de sesión en `localStorage`, sin datos de otros
  negocios en el HTML ni en el estado del cliente.
- **Auditor:** seguridad

## INV-FE-05 — Plata y fechas con un solo formateador

- **Regla:** los montos llegan en centavos y se formatean en ARS con una única función; las fechas de calendario
  se muestran en la zona horaria del negocio con una única función.
- **Por qué:** un redondeo o un corrimiento de un día en la hoja del fin de semana es un pedido que sale mal.
- **Auditor:** integridad

## INV-FE-06 — Estado con un solo dueño y efectos encerrados

- **Regla:** `useEffect` y `useLayoutEffect` solo existen en `src/lib/effects/`, como hooks con nombre que
  sincronizan con un sistema externo. Los datos del servidor viven en React Query, los filtros en la URL, los
  formularios en react-hook-form, y `useState` solo guarda estado efímero de UI (`docs/architecture.md` §5 y §6).
- **Por qué:** un efecto que pide datos o sincroniza estados duplica la verdad, y la pantalla termina mostrando
  algo distinto de lo que dijo la API.
- **Cómo se verifica:** regla de ESLint contra los efectos fuera de `src/lib/effects/`; checklist de
  `docs/architecture.md` en cada revisión.
- **Auditor:** estándares
