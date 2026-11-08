# Accesibilidad y entornos probados

> 🌐 Versión en español de [accessibility.md](../accessibility.md) (el original, en inglés, es la referencia). Si cambia el original, actualizá esta copia.

Qué hace la UI por defecto por la accesibilidad, qué se verifica de forma automática, qué **no** está verificado todavía, y en qué navegadores, versiones de React y de Node se prueba la librería.

## Qué da la UI por defecto

- **Etiquetas y descripciones.** Cada control tiene un `<label htmlFor>`, y el texto de ayuda se vincula con `aria-describedby`.
- **Errores.** Los campos inválidos ponen `aria-invalid="true"` y apuntan a su mensaje con `aria-describedby`. Los mensajes se anuncian (`role="alert"` o `aria-live="polite"`).
- **Foco.** Tras un **Siguiente** bloqueado, el foco va al primer campo inválido. `aria-invalid` es también la forma de encontrar ese campo.
- **Progreso.** El stepper es un `nav` y marca el paso actual con `aria-current="step"`; una región en vivo visualmente oculta anuncia los cambios de paso.
- **Controles compuestos.** Los grupos de radio usan `role="radiogroup"`, el combobox usa `role="combobox"` con un `listbox`, los switches usan `role="switch"`, las calificaciones y los toggles exponen `aria-pressed` o `aria-checked`, y las subidas exponen un `progressbar`.
- **Teclado.** El wizard se puede completar solo con el teclado: un test de punta a punta completa, valida y envía un formulario usando únicamente teclas.
- **Contraste de color.** El tema por defecto cumple WCAG 2.x AA. El botón primario es blanco sobre `#2563eb` (5,17:1; AA pide 4,5:1 para texto normal).

## Si lo tematizás

- Sobrescribir `--artisan-primary` es la forma más común de romper el contraste: el texto del botón primario es blanco, así que el color que elijas necesita **al menos 4,5:1 contra el blanco**. Comprobalo con cualquier verificador de contraste, o corré los tests de axe sobre tus propias páginas.
- Un componente propio o un [kit de UI](ui.md) asume el contrato de accesibilidad: ids y etiquetas, `aria-invalid` y `aria-describedby`, ids de error y de descripción, y el progreso en un stepper propio. El contrato está en [Extensión de UI](ui.md#responsabilidades-de-accesibilidad), y la suite de conformidad del repo verifica los kits oficiales contra él.

## Qué se verifica de forma automática

La suite de punta a punta corre **axe-core** (reglas de WCAG 2.0 y 2.1, niveles A y AA) sobre estos escenarios del playground: el wizard completo (también con errores de validación visibles), todos los tipos de campo, campos repetibles, el layout semántico y la subida de archivos. Una violación hace fallar el CI. axe corre una sola vez, en Chromium, porque sus chequeos no dependen del motor.

Los chequeos automáticos encuentran solo una parte de los problemas posibles (el flujo con teclado, el orden del foco y lo que anuncia un lector de pantalla necesitan a una persona), así que son una red de seguridad y no una certificación.

## Qué todavía no está verificado

- Pasadas manuales con un lector de pantalla (NVDA, JAWS, VoiceOver, TalkBack).
- Movimiento: los estilos por defecto solo usan transiciones cortas (150 ms) y un spinner de carga, y todavía no reaccionan a `prefers-reduced-motion`.
- Idiomas de derecha a izquierda, el modo de alto contraste de Windows y los layouts con zoom.
- Dispositivos táctiles: los tests usan perfiles de navegador de escritorio.

Los reportes de problemas de accesibilidad son bienvenidos como issues.

## Entornos probados

| Área | Cubierto por el CI |
| --- | --- |
| Navegadores | Chromium, Firefox y WebKit (Playwright, perfiles de escritorio) corren los mismos flujos de punta a punta |
| React | 18.3.1 y 19.3.1, cada uno instalado desde el paquete empaquetado en una app Vite limpia, con un render de servidor en Node y una comprobación en navegador real |
| Node | 22 y 24 corren lint, chequeos de tipos, build y tests unitarios; el paquete declara `engines.node >= 20.19` |
| React Compiler | La suite de punta a punta corre con el compilador activado y desactivado |
| Módulos | **Solo ESM**; `require()` de CommonJS no está soportado |
| TypeScript | `moduleResolution` `bundler`, `node16` o `nodenext` |

Mirá [Instalación y compatibilidad](https://github.com/mastoreto/artisanForm/blob/main/docs/es/README.md#instalación) en el README para los requisitos completos.
