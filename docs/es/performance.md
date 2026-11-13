# Rendimiento

> 🌐 Versión en español de [performance.md](../performance.md).

ArtisanForm se mide contra los umbrales de **Core Web Vitals** y **RAIL** de Google, no contra un número interno. Una librería no controla la red ni el LCP de la página, así que se mide lo que sí controla: desde "el schema está en memoria" hasta "el formulario está pintado y editable", y el costo de cada interacción.

## Presupuestos (`e2e/perf.spec.ts`)

| Qué | Escritorio | Móvil (Chromium, CPU 4x) | Firefox / WebKit | Base |
|---|---|---|---|---|
| Formulario listo (50 campos; 200 campos, el doble) | ≤ 100 ms | ≤ 300 ms | ≤ 400 ms | RAIL "responder en 100 ms" |
| Interacción (escribir, Siguiente) | ≤ 100 ms (Siguiente ≤ 200) | ≤ 200 ms (Siguiente ≤ 400) | igual que escritorio | INP "bueno" es 200 ms |
| Tareas largas una vez que renderiza | ≤ 50 ms | ≤ 300 ms (50 ms × CPU 4 × 1,5) | no medible | RAIL / TBT |
| Cambio de diseño (CLS) | ≤ 0,1 | ≤ 0,1 | no medible | Core Web Vitals |
| JS / CSS / `artisanform/schema` comprimidos | no más de +10% sobre `perf/size.json` | | | presupuesto propio |

Firefox y WebKit no pueden limitar la CPU en Playwright y no exponen entradas `longtask` ni `layout-shift`, así que solo tienen los presupuestos de "listo" e interacción. El de "listo" es más holgado porque un primer render en frío es más lento en ellos con la misma máquina (se observaron 130–260 ms).

Cada mediana de "listo" también se compara con `perf/web-baseline.json`: falla si es un 50% (+30 ms) más lenta que la mediana registrada para ese navegador. Subir una línea base es un commit deliberado.

## Cómo correrlo

```bash
bun run perf                                   # Chromium, escritorio + perfil móvil
ARTISAN_BROWSERS=chromium,firefox,webkit bun run perf
PERF_OUT=perf-results bun run perf             # además escribe perf-results.<proyecto>.json
bun run build && bun run check:size            # tope de tamaño (--write mueve la línea base)
bun run bench:parse                            # solo la parte de CPU (parseo, normalización, proyección, Yup)
```

Corre contra el **build de producción** del playground (`bun run playground:build`, servido en 5175) y una prueba a la vez. Los schemas sintéticos salen de `perf/generate.mjs` (determinista). En CI el job `perf` lo ejecuta por navegador y sube el JSON.

## Qué dicen los números (Chromium, Ryzen 7 5700X)

- Parsear, normalizar, proyectar y construir el schema de Yup de un schema de **200 campos** cuesta en conjunto unos **1,2 ms** (`perf/baseline.json`); el tiempo hasta estar listo es el render de React, no el pipeline del schema.
- Listo: 25–40 ms en escritorio, unos 100–140 ms con la CPU 4x más lenta. Escribir un carácter: unos 13 ms.
- Nada de esto señaló código a optimizar, así que no se cambió ninguno. Mantené `scheme` estable por referencia en el padre (`useMemo` o una constante de módulo): un objeto nuevo en cada render repite el pipeline de ~1 ms.
