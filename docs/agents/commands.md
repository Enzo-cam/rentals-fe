# Comandos

> **Pendiente:** se completa con el scaffolding de Next.js. Hasta entonces, ningún agente inventa comandos: si
> hace falta uno, `NEEDS_DECISION`.

Los agentes corren **exactamente** estos comandos, desde la raíz del repo.

| Para | Comando | Notas |
|---|---|---|
| Instalar | `pnpm install` | `pnpm`, no `npm` |
| Typecheck | — | Tiene que quedar sin errores nuevos |
| Lint (solo medir) | — | **Sin `--fix`** |
| Un archivo de test | — | |
| Suite completa | — | Una sola vez, al final |
| E2E en celular | — | Solo flujos críticos |
| Build | — | Verifica que las páginas públicas se rendericen en el servidor |
| Generar cliente de la API | — | Desde el OpenAPI de `rentals-be` |

## Baseline

Sin código todavía.

## Límites de recursos

- Máquina: Intel Core Ultra 7 265KF, 20 núcleos, 15,7 GB de RAM. **El límite es la memoria libre.**
- Nunca dos procesos de test a la vez, ni tests y lint juntos, ni E2E mientras corren tests de `rentals-be`.
