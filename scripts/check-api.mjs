// Public API snapshot. After `bun run build`, lists every export of the root,
// `artisanform/schema` and `artisanform/builder` entries with its declaration text and compares it
// with api/*.api.txt. A difference is a contract change: removing or changing
// an export is a major, adding one is a minor (docs/versioning.md). Update the
// snapshot in the same PR with --write so the change is reviewed.
//   node scripts/check-api.mjs [--write]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';

const entries = {
  index: 'dist/index.d.ts',
  schema: 'dist/schema/index.d.ts',
  builder: 'dist/builder/index.d.ts',
};

const describe = (file) => {
  const program = ts.createProgram([file], {
    skipLibCheck: true,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    module: ts.ModuleKind.ESNext,
    jsx: ts.JsxEmit.ReactJSX,
    noEmit: true,
  });
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(file);
  const mod = checker.getSymbolAtLocation(source);
  if (!mod) throw new Error(`${file} has no exports`);
  return checker
    .getExportsOfModule(mod)
    .map((sym) => {
      const target =
        sym.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym;
      const decl = (target.declarations ?? [])
        .map((d) =>
          d
            .getText()
            .replace(/\/\*[\s\S]*?\*\//g, '') // doc comments are not contract
            .replace(/\s+/g, ' ')
            .trim(),
        )
        .join(' | ');
      return `${sym.getName()}: ${decl}`;
    })
    .sort()
    .join('\n');
};

const write = process.argv.includes('--write');
mkdirSync('api', { recursive: true });
let bad = 0;
for (const [name, file] of Object.entries(entries)) {
  const out = `${describe(file)}\n`;
  const path = `api/${name}.api.txt`;
  if (write) {
    writeFileSync(path, out);
    console.log(`wrote ${path} (${out.split('\n').length - 1} exports)`);
    continue;
  }
  const base = existsSync(path) ? readFileSync(path, 'utf8') : '';
  if (base === out) {
    console.log(`api OK: ${name} (${out.split('\n').length - 1} exports)`);
    continue;
  }
  bad++;
  const a = new Set(base.split('\n'));
  const b = new Set(out.split('\n'));
  for (const l of a) if (!b.has(l)) console.log(`- ${l.slice(0, 160)}`);
  for (const l of b) if (!a.has(l)) console.log(`+ ${l.slice(0, 160)}`);
  console.log(
    `api CHANGED: ${name}. Removed/changed lines are breaking, added are minor; run with --write if intended.`,
  );
}
if (bad) process.exit(1);
