// Copies the builder's stylesheet to dist/builder.css (shipped as
// `artisanform/builder.css`). It is not imported by any JS, so it never lands in
// the form's `style.css`.
import { copyFileSync, mkdirSync } from 'node:fs';

mkdirSync('dist', { recursive: true });
copyFileSync('src/builder/builder.css', 'dist/builder.css');
console.log('wrote dist/builder.css');
