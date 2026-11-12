import { useEffect, useMemo, useRef, useState } from 'react';
import { type Catalog, resolveLocaleChain } from '../schema';
import type { I18nBlockV1 } from '../schema/contract/define';

export type LoadMessages = (
  locale: string,
) => Promise<Catalog | { default: Catalog }>;

const unwrap = (m: Catalog | { default: Catalog }): Catalog =>
  'default' in m && typeof m.default === 'object' ? m.default : (m as Catalog);

/**
 * The catalogs to apply for `locale`, most specific first (`es-AR`, `es`).
 * Per tag: the `messages` prop wins, then what `loadMessages` fetched, then
 * the schema's own `i18n` block. The source locale needs none. While a
 * catalog loads (or if it fails) the source text shows: a form never waits
 * on, or breaks because of, a translation.
 */
export const useCatalogs = (
  locale: string | undefined,
  messages: Record<string, Catalog> | undefined,
  loadMessages: LoadMessages | undefined,
  block: I18nBlockV1 | undefined,
): Catalog[] => {
  const [loaded, setLoaded] = useState<Record<string, Catalog>>({});
  const source = (block?.sourceLocale ?? 'en').toLowerCase();
  const chain = useMemo(
    () =>
      (locale ? resolveLocaleChain(locale) : []).filter(
        (t) => t.toLowerCase() !== source,
      ),
    [locale, source],
  );
  const asked = useRef(new Set<string>());

  useEffect(() => {
    if (!loadMessages) return;
    for (const tag of chain) {
      if (messages?.[tag] || block?.messages?.[tag] || asked.current.has(tag))
        continue;
      asked.current.add(tag);
      Promise.resolve()
        .then(() => loadMessages(tag))
        .then((m) => setLoaded((l) => ({ ...l, [tag]: unwrap(m) })))
        .catch(() => {}); // ponytail: a missing catalog falls back to the source text
    }
  }, [chain, messages, block, loadMessages]);

  return useMemo(
    () =>
      chain.flatMap((t) => {
        const c = messages?.[t] ?? loaded[t] ?? block?.messages?.[t];
        return c ? [c] : [];
      }),
    [chain, messages, loaded, block],
  );
};
