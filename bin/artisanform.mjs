#!/usr/bin/env node
// artisanform: checks ArtisanForm schemas from the command line, in CI or a
// pre-commit hook, from any language (run it as a subprocess).
//   artisanform validate schema.json [more.json] [--policy p.json]
//       [--manifest m.json] [--max-bytes n] [--max-steps n] [--max-fields n]
//       [--max-options n] [--no-lint] [--json]
//   artisanform json-schema        prints the JSON Schema of the contract
//   artisanform hash schema.json   prints the SHA-256 of the canonical JSON
// Exit codes: 0 all good, 1 a schema has errors, 2 wrong usage or unreadable file.
import { readFileSync } from 'node:fs';
import { checkSchema, schemaHash } from '../dist/schema.js';

// `artisanform json-schema | head` closes the pipe early: not an error.
process.stdout.on('error', (error) => {
  if (error.code === 'EPIPE') process.exit(0);
  throw error;
});

const USAGE = `Usage:
  artisanform validate <schema.json...> [--policy f.json] [--manifest f.json]
                       [--max-bytes n] [--max-steps n] [--max-fields n]
                       [--max-options n] [--no-lint] [--json]
  artisanform json-schema
  artisanform hash <schema.json>`;

const usage = (message) => {
  if (message) console.error(`artisanform: ${message}\n`);
  console.error(USAGE);
  process.exit(2);
};

const readJSON = (path) => {
  try {
    return { value: JSON.parse(readFileSync(path, 'utf8')) };
  } catch (error) {
    return {
      error,
      unreadable: error?.code === 'ENOENT' || error?.code === 'EISDIR',
    };
  }
};

const FLAGS = {
  '--policy': 'policy',
  '--manifest': 'manifest',
  '--max-bytes': 'maxBytes',
  '--max-steps': 'maxSteps',
  '--max-fields': 'maxFields',
  '--max-options': 'maxOptions',
};

const parseArgs = (argv) => {
  const out = { files: [], lint: true, json: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--no-lint') out.lint = false;
    else if (arg === '--json') out.json = true;
    else if (FLAGS[arg]) {
      const value = argv[++i];
      if (value === undefined) usage(`${arg} needs a value`);
      out[FLAGS[arg]] = value;
    } else if (arg.startsWith('--')) usage(`unknown option ${arg}`);
    else out.files.push(arg);
  }
  return out;
};

const number = (name, value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) usage(`${name} must be a number`);
  return n;
};

const validate = (argv) => {
  const args = parseArgs(argv);
  if (args.files.length === 0) usage('validate needs at least one file');

  const options = { lint: args.lint };
  for (const key of ['policy', 'manifest']) {
    if (args[key] === undefined) continue;
    const read = readJSON(args[key]);
    if (read.error) usage(`cannot read ${args[key]}: ${read.error.message}`);
    options[key] = read.value;
  }
  const limits = {};
  for (const key of ['maxBytes', 'maxSteps', 'maxFields', 'maxOptions'])
    if (args[key] !== undefined) limits[key] = number(`--${key}`, args[key]);
  if (Object.keys(limits).length) options.limits = limits;

  const report = [];
  let failed = false;
  for (const file of args.files) {
    const read = readJSON(file);
    if (read.unreadable) usage(`cannot read ${file}`);
    const result = read.error
      ? {
          ok: false,
          issues: [
            {
              severity: 'error',
              code: 'invalid-json',
              path: '$',
              message: read.error.message,
            },
          ],
        }
      : checkSchema(read.value, options);
    if (!result.ok) failed = true;
    report.push({ file, ok: result.ok, issues: result.issues });
  }

  if (args.json) console.log(JSON.stringify(report, null, 2));
  else
    for (const { file, ok, issues } of report) {
      for (const i of issues)
        console.log(
          `${file}: ${i.severity} ${i.code} ${i.path} - ${i.message}`,
        );
      const errors = issues.filter((i) => i.severity === 'error').length;
      console.log(
        `${file}: ${ok ? 'ok' : 'FAILED'} (${errors} error${errors === 1 ? '' : 's'}, ${issues.length - errors} warning${issues.length - errors === 1 ? '' : 's'})`,
      );
    }
  process.exit(failed ? 1 : 0);
};

const [command, ...rest] = process.argv.slice(2);
switch (command) {
  case 'validate':
    validate(rest);
    break;
  case 'json-schema':
    process.stdout.write(
      readFileSync(new URL('../dist/schema.json', import.meta.url), 'utf8'),
    );
    break;
  case 'hash': {
    if (rest.length !== 1) usage('hash needs exactly one file');
    const read = readJSON(rest[0]);
    if (read.error) usage(`cannot read ${rest[0]}: ${read.error.message}`);
    console.log(await schemaHash(read.value));
    break;
  }
  case '--help':
  case '-h':
  case undefined:
    usage();
    break;
  default:
    usage(`unknown command "${command}"`);
}
