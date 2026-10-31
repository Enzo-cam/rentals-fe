# Marca

La identidad visual y el tono de la aplicación. **Manda sobre colores, tipografía, íconos y textos de pantalla**, como
`docs/architecture.md` manda sobre el código. Sale del press kit (`Press kit Búmeran.html`, en la carpeta del
workspace, fuera de los repos); lo que sigue es lo que se copió acá, con los valores. Si el press kit cambia, se
actualiza este archivo, `src/app/globals.css` y los archivos de `public/brand/` en la misma PR.

El nombre del producto todavía no está decidido: el press kit usa `[NOMBRE]`. Hasta que se decida, la aplicación dice
"Rentals". No lo escribas suelto en cada pantalla: cuando cambie, tiene que ser un cambio en pocos lugares.

## Color

Bosque de fondo, mostaza de acento. Los valores viven en `src/app/globals.css` como variables semánticas de shadcn; las
pantallas usan los nombres (`bg-background`, `text-muted-foreground`, `bg-highlight`…) y **nunca un color suelto** (ni
un hex, ni `bg-green-900`).

| Nombre | Valor | Variable | Para qué |
|---|---|---|---|
| Bosque | `#10291F` | `--foreground`, `--primary` | Texto, acción principal y el fondo del modo oscuro |
| Hueso | `#F1E9D8` | `--background`, `--primary-foreground` | Fondo de la aplicación y texto sobre bosque |
| Mostaza | `#F2B33D` | `--highlight` | **Solo el punto de la marca y un acento**: una etiqueta de estado, un conteo que importa |
| Bosque 2 | `#1A3B2E` | `--card` (oscuro) | Superficies sobre bosque |
| Hueso 2 | `#E3D8C2` | `--card`, `--secondary`, `--muted`, `--accent` | Superficies sobre hueso: tarjetas, listas, campos |
| Texto secundario | `#3E5248` (claro) · `#B9C4BB` (oscuro) | `--muted-foreground` | Ayudas, fechas, detalle |

- La acción principal es una **píldora bosque con texto hueso** sobre fondo claro. En modo oscuro, la acción principal
  pasa a mostaza con texto bosque. La mostaza sobre hueso no se usa para texto: no contrasta.
- El error usa `--destructive`, un rojo cálido: el press kit no define uno.
- Estados de una reserva (bloqueo, confirmada, entregada, devuelta, cancelada): el press kit no los define. Cuando se
  diseñen las pantallas, se resuelven con bosque, hueso 2 y mostaza (una etiqueta con texto, nunca solo color) y se
  anotan acá.

## Tipografía

**Bricolage Grotesque, una sola familia** (`src/app/fonts/`, cargada con `next/font/local`, archivo variable del 400 al
800).

- **Títulos:** semibold 600, interletrado −3 %, interlineado ~1, dos líneas como máximo. Ya está en `globals.css` para
  `h1`, `h2` y `h3`.
- **Texto:** regular 400, 16 a 20 px, interlineado 1,5.
- **Números destacados** (total, saldo, conteos grandes): extrabold 800, y solo ellos.
- **Cifras tabulares** en todas partes (listas, precios, conteos): está activado en `body`.

## Marca e ícono

- Archivos: `public/brand/bumeran-icono.svg` (ícono de app, fondo bosque), `bumeran-marca-oscura.svg` (marca en bosque,
  para fondos claros) y `bumeran-marca-clara.svg` (marca en hueso, para fondos oscuros). `src/app/icon.svg` es el
  favicon. En código, el componente `BrandMark` (`src/components/ui/brand-mark.tsx`).
- Tres fondos válidos: bosque 2, hueso y mostaza.
- Espacio libre alrededor de la marca: como mínimo el diámetro del punto. Tamaño mínimo: 24 px el ícono, 120 px de
  ancho el logo horizontal.
- **Lo que no:** otros colores, deformarla, quitarle el punto.
- Íconos de sección (entregas, devoluciones…): misma paleta, mismo grosor, mismo punto mostaza. Hasta que se dibuje la
  familia, las pantallas usan `lucide-react`.

## Forma

- Botones: **píldora** (`rounded-full`), de 44 px de alto como mínimo; la acción principal de una pantalla, de 56 px
  (`size="lg"`). Campos de 44 px de alto y 16 px de texto (iOS no hace zoom al enfocar).
- Tarjetas y listas: radio de 20 px (`--radius: 1.25rem`). Etiquetas de estado: píldora.
- Una pantalla de celular tiene una sola acción principal.

## Voz

Español rioplatense, **de vos**, claro y al grano, como en el depósito. Números concretos antes que adjetivos; ni
palabras de sistema ni promesas grandes.

| Sí | En vez de |
|---|---|
| Quedan 12 mesas libres para el sábado. | Disponibilidad de inventario actualizada. |
| Salieron 400 copas, volvieron 382. Hay 6 rotas. | Se detectaron diferencias en la devolución. |
| Mandale el presupuesto por WhatsApp. | Compartir la cotización por un canal de mensajería. |

Los errores dicen qué pasó y qué hacer, sin culpar ni dar códigos.

## Presupuesto por link

La pantalla pública del presupuesto (paso 6) sigue el modelo del press kit ("Aplicación digital"): el nombre del
negocio y la marca arriba, "Presupuesto para {cliente}", la fecha y el motivo, una etiqueta mostaza con la
disponibilidad ("Todo disponible"), las líneas en una tarjeta hueso 2, entrega y retiro, la seña, el **total en
extrabold 34 px** y un botón píldora bosque de 60 px, "Confirmar por WhatsApp".
