import type { ButtonHTMLAttributes } from 'react';
import type { ArtisanStatusPanelProps } from '../ui/types';
import { useComponents, useCx } from '../ui/UiContext';

/** Secondary action of a state screen (retry, back, links…). */
export const ActionButton = (
  props: ButtonHTMLAttributes<HTMLButtonElement>,
) => {
  const cx = useCx();
  return (
    <button
      type="button"
      {...props}
      className={cx('action', props.className)}
    />
  );
};

export const ActionLink = ({
  className,
  ...rest
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
  const cx = useCx();
  return <a {...rest} className={cx('action', className)} />;
};

type Tone = ArtisanStatusPanelProps['tone'];

const icon: Record<Tone, string> = {
  success: 'M5 13l4 4L19 7',
  error: 'M6 6l12 12M18 6L6 18',
  pending: '',
};

/**
 * One look for every "state" screen (result, waiting, payment…): a status
 * icon (check, cross or spinner), a message and optional actions.
 */
export const DefaultStatusPanel = ({
  tone,
  message,
  children,
  className,
}: ArtisanStatusPanelProps) => {
  const cx = useCx();
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cx('status', className)}
      data-tone={tone}
    >
      <span aria-hidden="true" className={cx('statusIcon')}>
        {tone === 'pending' ? (
          <span className={cx('spinner')} />
        ) : (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={icon[tone]} />
          </svg>
        )}
      </span>
      <p className={cx('statusMessage')}>{message}</p>
      {children && <div className={cx('statusActions')}>{children}</div>}
    </div>
  );
};

/** Renders `components.StatusPanel` when the app provides one. */
const StatusPanel = (props: ArtisanStatusPanelProps) => {
  const Custom = useComponents().StatusPanel;
  return Custom ? <Custom {...props} /> : <DefaultStatusPanel {...props} />;
};

export default StatusPanel;
