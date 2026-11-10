// Only these schemes may be linked from a schema; anything else with a scheme
// (javascript:, data:, vbscript:…) is rejected. No scheme at all means relative.
const SAFE_SCHEMES = new Set(['http', 'https', 'mailto']);

/** True when `href` is a relative reference or uses an allowed scheme. */
export const isSafeUrl = (href: string): boolean => {
  // Browsers ignore tabs, newlines and leading control/space characters inside
  // the scheme, so strip them before looking for one ("java\tscript:").
  // biome-ignore lint/suspicious/noControlCharactersInRegex: that is the point
  const clean = href.replace(/[\u0000- ]/g, '');
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(clean);
  return scheme === null || SAFE_SCHEMES.has(scheme[1].toLowerCase());
};

const FORBIDDEN_NAMES = new Set(['__proto__', 'constructor', 'prototype']);

/** True when `name` is safe to use as a form value key (no prototype keys, no path syntax). */
export const isSafeFieldName = (name: string): boolean =>
  !FORBIDDEN_NAMES.has(name) && !/[.[\]]/.test(name);
