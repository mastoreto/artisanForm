import type { ReactNode } from 'react';
import { cn } from '../../commons/cn';

export const actionClass =
  'inline-block rounded border px-4 py-2 text-sm hover:bg-gray-100';

type Tone = 'success' | 'error' | 'pending';

const icon: Record<Tone, string> = {
  success: 'M5 13l4 4L19 7',
  error: 'M6 6l12 12M18 6L6 18',
  pending: '',
};

const circle: Record<Tone, string> = {
  success: 'bg-green-100 text-green-600',
  error: 'bg-red-100 text-red-600',
  pending: 'bg-gray-100',
};

const text: Record<Tone, string> = {
  success: 'font-medium',
  error: 'font-medium text-red-700',
  pending: 'text-gray-600',
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
}) => (
  <div
    role={tone === 'error' ? 'alert' : 'status'}
    className={cn(
      'flex flex-col items-center gap-3 py-6 text-center',
      className,
    )}
  >
    <span
      aria-hidden="true"
      className={cn(
        'flex h-14 w-14 items-center justify-center rounded-full',
        circle[tone],
      )}
    >
      {tone === 'pending' ? (
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[var(--artisan-primary,#3b82f6)]" />
      ) : (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-8 w-8"
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
    <p className={cn('text-base', text[tone])}>{message}</p>
    {children && (
      <div className="flex flex-wrap justify-center gap-2">{children}</div>
    )}
  </div>
);

export default StatusPanel;
