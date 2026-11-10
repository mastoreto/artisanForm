# Accessibility and tested environments

> 🌐 Spanish version: [es/accessibility.md](es/accessibility.md)

What the default UI does for accessibility, what is checked automatically, what is **not** verified yet, and which browsers, React and Node versions the library is tested on.

## What the default UI provides

- **Labels and descriptions.** Every control has a `<label htmlFor>`, and helper text is linked with `aria-describedby`.
- **Errors.** Invalid fields set `aria-invalid="true"` and point to their message with `aria-describedby`. Messages are announced (`role="alert"` or `aria-live="polite"`).
- **Focus.** After a blocked **Next**, focus moves to the first invalid field. `aria-invalid` is also how that field is found.
- **Progress.** The stepper is a `nav` and marks the current step with `aria-current="step"`; a visually hidden live region announces step changes.
- **Composite controls.** Radio groups use `role="radiogroup"`, the combobox uses `role="combobox"` with a `listbox`, switches use `role="switch"`, ratings and toggles expose `aria-pressed` or `aria-checked`, and uploads expose a `progressbar`.
- **Keyboard.** The wizard can be completed with the keyboard alone: an end-to-end test fills, validates and submits a form using only keys.
- **Color contrast.** The default theme meets WCAG 2.x AA. The primary button is white on `#2563eb` (5.17:1; AA needs 4.5:1 for normal text).

## If you theme it

- Overriding `--artisan-primary` is the most common way to break contrast: the primary button text is white, so the color you choose needs **at least 4.5:1 against white**. Check it with any contrast checker, or run the axe tests on your own pages.
- A custom component or a [UI kit](ui.md) takes over the accessibility contract: ids and labels, `aria-invalid` and `aria-describedby`, error and description ids, and progress in a custom stepper. The contract is in [UI extension](ui.md#accessibility-responsibilities), and the repo's conformance suite checks the official kits against it.

## What is checked automatically

The end-to-end suite runs **axe-core** (rules for WCAG 2.0 and 2.1, levels A and AA) on these scenarios of the playground: the full wizard (also with validation errors visible), every field type, repeatable fields, the semantic layout and file uploads. A violation fails CI. axe runs once, on Chromium, because its checks do not depend on the engine.

Automated checks find only part of the possible problems (keyboard flow, focus order and screen reader output need a human), so they are a safety net and not a certification.

## What is not verified yet

- Manual passes with a screen reader (NVDA, JAWS, VoiceOver, TalkBack).
- Motion: with `prefers-reduced-motion: reduce` the default styles turn transitions off and slow the spinner (covered by a stylesheet test, not by a browser run).
- Right-to-left languages, Windows high-contrast mode and zoomed layouts.
- Touch devices: the tests use desktop browser profiles.

Reports of accessibility problems are welcome as issues.

## Tested environments

| Area | Covered by CI |
| --- | --- |
| Browsers | Chromium, Firefox and WebKit (Playwright, desktop profiles) run the same end-to-end flows |
| React | 18.3.1 and 19.3.1, each installed from the packed package in a clean Vite app, with a Node server-side render and a real-browser check |
| Node | 22 and 24 run lint, type checks, build and unit tests; the package declares `engines.node >= 20.19` |
| React Compiler | The end-to-end suite runs with the compiler on and off |
| Modules | **ESM only**; CommonJS `require()` is not supported |
| TypeScript | `moduleResolution` `bundler`, `node16` or `nodenext` |

See [Installation and compatibility](https://github.com/mastoreto/artisanForm#installation) in the README for the full requirements.
