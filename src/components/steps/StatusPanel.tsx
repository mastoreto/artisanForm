import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useCx } from '../ui/UiContext';

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
  // biome-ignore lint/a11y/useAnchorContent: children come through `rest`
  return <a {...rest} className={cx('action', className)} />;
};

type Tone = 'success' | 'error' | 'pending';

const icon: Record<Tone, string> = {
  success: 'M5 13l4 4L19 7',
  error: 'M6 6l12 12M18 6L6 18',
  pending: '',
};

/**
 * One look for every "state" screen (result, waiting, payment…): a status
 * icon (check, cross or spinner), a message and optional actions.
 */
const StatusPanel = ({
  tone,
  message,
  children,
  className,
}: {
  tone: Tone;
  message: ReactNode;
  /** Buttons/links shown under the message. */
  children?: ReactNode;
  className?: string;
}) => {
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

export default StatusPanel;
