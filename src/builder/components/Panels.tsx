import { useRef, useState } from 'react';
import {
  checkSchema,
  normalizeArtisanSchema,
  type SchemaIssue,
} from '../../schema';
import type { ArtisanSchemaV1 } from '../../schema/contract/define';
import { useBuilder } from '../context';
import { useBx } from '../cx';
import {
  addLocale,
  removeLocale,
  setMessage,
  setSourceLocale,
  translationRows,
} from '../model/i18n';

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** The schema as JSON: copy it, download it, or paste or load another one (a 0.2.0 schema is converted). */
export const JsonPanel = () => {
  const { schema, labels, actions, features, readOnly } = useBuilder();
  const bx = useBx();
  const [text, setText] = useState(() => JSON.stringify(schema, null, 2));
  const [seen, setSeen] = useState(schema);
  const [notice, setNotice] = useState<string | undefined>();
  const [refused, setRefused] = useState<SchemaIssue[] | string | undefined>();
  const file = useRef<HTMLInputElement>(null);
  // Follow edits made elsewhere (the canvas, undo) unless the person is typing here.
  if (seen !== schema) {
    setSeen(schema);
    setText(JSON.stringify(schema, null, 2));
  }

  const apply = (raw: string) => {
    setNotice(undefined);
    setRefused(undefined);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      setRefused(labels.invalidJson);
      return;
    }
    let next: ArtisanSchemaV1 | undefined;
    let notes = 0;
    if (isObj(parsed) && 'schemaVersion' in parsed) {
      const checked = checkSchema(parsed, { lint: false });
      if (!checked.schema)
        return setRefused(checked.issues.filter((i) => i.severity === 'error'));
      next = checked.schema;
    } else {
      try {
        const normalized = normalizeArtisanSchema(parsed as never);
        next = normalized.schema;
        notes = normalized.issues.length;
        setNotice(notes ? labels.importedNotes(notes) : labels.importedLegacy);
      } catch {
        return setRefused(labels.invalidJson);
      }
    }
    actions.replaceSchema(next);
  };

  const download = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(schema, null, 2)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `${schema.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className={bx('panel')} aria-label={labels.jsonTitle}>
      <h2 className={bx('panelTitle')}>{labels.jsonTitle}</h2>
      <textarea
        className={bx('input', 'afb-mono')}
        rows={14}
        aria-label={labels.jsonTitle}
        value={text}
        readOnly={readOnly}
        onChange={(e) => setText(e.target.value)}
      />
      <div className={bx('panelActions')}>
        {features.import && (
          <>
            <button
              type="button"
              className={bx('button', 'afb-primary')}
              disabled={readOnly}
              onClick={() => apply(text)}
            >
              {labels.applyJson}
            </button>
            <button
              type="button"
              className={bx('button')}
              disabled={readOnly}
              onClick={() => file.current?.click()}
            >
              {labels.loadFile}
            </button>
            <input
              ref={file}
              type="file"
              accept="application/json,.json"
              hidden
              aria-label={labels.loadFile}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) {
                  const raw = await f.text();
                  setText(raw);
                  apply(raw);
                }
                e.target.value = '';
              }}
            />
          </>
        )}
        <button type="button" className={bx('button')} onClick={download}>
          {labels.downloadJson}
        </button>
      </div>
      {notice && (
        <p className={bx('notice')} role="status">
          {notice}
        </p>
      )}
      {refused && (
        <div role="alert" className={bx('error')}>
          {typeof refused === 'string' ? (
            refused
          ) : (
            <>
              {labels.jsonRefused}
              <ul>
                {refused.slice(0, 5).map((i) => (
                  <li key={`${i.code}:${i.path}`}>
                    {i.code} {i.path} {i.message}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
};

/** A gallery of starting points. Replacing a form that already has content asks twice. */
export const TemplatesPanel = () => {
  const { schema, labels, actions, templates, readOnly } = useBuilder();
  const bx = useBx();
  const [pending, setPending] = useState<string | undefined>();
  const hasContent =
    schema.steps.some((s) => s.type !== 'form' || s.fields.length > 0) &&
    JSON.stringify(schema).length > 400;
  return (
    <section className={bx('panel')} aria-label={labels.templatesTitle}>
      <h2 className={bx('panelTitle')}>{labels.templatesTitle}</h2>
      <ul className={bx('templates')}>
        {templates.map((t) => (
          <li key={t.id} className={bx('template')}>
            <strong>{t.title}</strong>
            <span className={bx('help')}>{t.description}</span>
            <button
              type="button"
              className={bx('button')}
              disabled={readOnly}
              aria-label={labels.useTemplate(t.title)}
              onClick={() => {
                if (hasContent && pending !== t.id) return setPending(t.id);
                setPending(undefined);
                actions.replaceSchema(structuredClone(t.schema));
              }}
            >
              {pending === t.id
                ? labels.confirmReplace
                : labels.useTemplate(t.title)}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};

/** Translations by language: every text of the form, its state, and a preview in each language. */
export const TranslationsPanel = () => {
  const { schema, labels, actions, readOnly, previewLocale, setPreviewLocale } =
    useBuilder();
  const bx = useBx();
  const locales = Object.keys(schema.i18n?.messages ?? {});
  const [chosen, setChosen] = useState<string | undefined>();
  const locale = chosen && locales.includes(chosen) ? chosen : locales[0];
  const [tag, setTag] = useState('');
  const [error, setError] = useState<string | undefined>();
  const { rows, orphans } = locale
    ? translationRows(schema, locale)
    : { rows: [], orphans: [] };
  const done = rows.filter((r) => r.state !== 'missing').length;

  const add = () => {
    const change = addLocale(schema, tag);
    if (change.error)
      return setError(
        change.error === 'duplicate-name'
          ? labels.languageExists
          : labels.invalidLanguage,
      );
    setError(undefined);
    actions.apply((s) => addLocale(s, tag));
    setChosen(tag.trim());
    setTag('');
  };

  return (
    <section className={bx('panel')} aria-label={labels.transTitle}>
      <h2 className={bx('panelTitle')}>{labels.transTitle}</h2>
      <div className={bx('panelActions')}>
        <label className={bx('propertyLabel')}>
          {labels.sourceLanguage}
          <input
            className={bx('input')}
            value={schema.i18n?.sourceLocale ?? ''}
            disabled={readOnly}
            onChange={(e) =>
              actions.apply(
                (s) => setSourceLocale(s, e.target.value.trim() || undefined),
                'source-locale',
              )
            }
          />
        </label>
        <label className={bx('propertyLabel')}>
          {labels.languageTag}
          <input
            className={bx('input')}
            value={tag}
            disabled={readOnly}
            onChange={(e) => setTag(e.target.value)}
          />
        </label>
        <button
          type="button"
          className={bx('button')}
          disabled={readOnly || tag.trim() === ''}
          onClick={add}
        >
          {labels.addLanguage}
        </button>
      </div>
      {error && (
        <p className={bx('error')} role="alert">
          {error}
        </p>
      )}
      {locales.length === 0 ? (
        <p className={bx('help')}>{labels.noLanguages}</p>
      ) : (
        <>
          <div
            className={bx('stepTabs')}
            role="tablist"
            aria-label={labels.transTitle}
          >
            {locales.map((l) => (
              <button
                key={l}
                type="button"
                role="tab"
                aria-selected={l === locale}
                className={bx('stepTab', l === locale && 'afb-selected')}
                onClick={() => setChosen(l)}
              >
                {l}
              </button>
            ))}
          </div>
          {locale && (
            <div className={bx('panelActions')}>
              <span>{labels.translatedCount(done, rows.length)}</span>
              <button
                type="button"
                className={bx('button')}
                aria-pressed={previewLocale === locale}
                onClick={() =>
                  setPreviewLocale(
                    previewLocale === locale ? undefined : locale,
                  )
                }
              >
                {labels.previewInLanguage}
              </button>
              <button
                type="button"
                className={bx('button')}
                disabled={readOnly}
                aria-label={labels.removeLanguage(locale)}
                onClick={() => actions.apply((s) => removeLocale(s, locale))}
              >
                {labels.removeLanguage(locale)}
              </button>
            </div>
          )}
          {orphans.length > 0 && (
            <p className={bx('notice')} role="status">
              {labels.transOrphans(orphans.length)}
            </p>
          )}
          <table className={bx('transTable')}>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} data-state={row.state}>
                  <th scope="row">
                    <span>{row.source}</span>
                    <code className={bx('issuePath')}>{row.key}</code>
                  </th>
                  <td>
                    {row.plural ? (
                      <span className={bx('help')}>{labels.transPlural}</span>
                    ) : (
                      <input
                        className={bx('input')}
                        aria-label={`${locale}: ${row.source}`}
                        value={row.text}
                        disabled={readOnly || !locale}
                        aria-invalid={row.state === 'bad-placeholders'}
                        onChange={(e) =>
                          locale &&
                          actions.apply(
                            (s) =>
                              setMessage(s, locale, row.key, e.target.value),
                            `msg:${locale}:${row.key}`,
                          )
                        }
                      />
                    )}
                    {row.state === 'missing' && (
                      <span className={bx('help')}>{labels.transMissing}</span>
                    )}
                    {row.state === 'bad-placeholders' && (
                      <span className={bx('error')}>
                        {labels.transBadPlaceholders}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
};
