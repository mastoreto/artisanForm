import { useState } from 'react';
import ArtisanForm from '../../components/ArtisanForm/ArtisanForm';
import { useBuilder } from '../context';
import { useBx } from '../cx';

const WIDTHS = { mobile: 375, tablet: 768, desktop: undefined } as const;
type Device = keyof typeof WIDTHS;

/** The real form, rendered from the schema as it is right now. */
export const Preview = () => {
  const { schema, selection, labels, previewProps, previewLocale } =
    useBuilder();
  const bx = useBx();
  const [device, setDevice] = useState<Device>('desktop');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const stepIndex =
    selection.kind === 'form'
      ? 0
      : Math.max(
          0,
          schema.steps.findIndex((s) => s.id === selection.stepId),
        );
  const devices: [Device, string][] = [
    ['mobile', labels.previewMobile],
    ['tablet', labels.previewTablet],
    ['desktop', labels.previewDesktop],
  ];
  return (
    <section className={bx('preview')} aria-label={labels.previewTitle}>
      <div className={bx('previewBar')}>
        <h2 className={bx('panelTitle')}>{labels.previewTitle}</h2>
        <fieldset aria-label={labels.previewTitle} className={bx('segmented')}>
          {devices.map(([d, text]) => (
            <button
              key={d}
              type="button"
              className={bx('segment', device === d && 'afb-selected')}
              aria-pressed={device === d}
              onClick={() => setDevice(d)}
            >
              {text}
            </button>
          ))}
          <button
            type="button"
            className={bx('segment')}
            aria-pressed={theme === 'dark'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? labels.previewLight : labels.previewDark}
          </button>
        </fieldset>
      </div>
      <div
        className={bx('frame')}
        style={{ maxWidth: WIDTHS[device] }}
        data-device={device}
      >
        <ArtisanForm
          scheme={schema}
          step={stepIndex}
          theme={theme}
          showSchemaIssues
          locale={previewLocale}
          {...(previewProps as object)}
          onSubmit={() => {}}
        />
      </div>
    </section>
  );
};
