import { cn } from '../../commons/cn';
import { type ArtisanLabels, defaultLabels } from '../../commons/labels';
import { theme } from '../../commons/theme';
import type { StepSchema } from '../../schema/legacy/types';

interface StepperProps {
  steps: StepSchema[];
  current: number;
  labels?: ArtisanLabels;
}

/** Progress indicator; also announces the step change to screen readers. */
const Stepper = ({ steps, current, labels = defaultLabels }: StepperProps) =>
  // A single step has nothing to show progress for.
  steps.length < 2 ? null : (
    <nav aria-label={labels.progress} className="mb-4">
      <p className="sr-only" aria-live="polite">
        {labels.step(current + 1, steps.length, steps[current]?.title ?? '')}
      </p>
      <ol className="flex gap-2">
        {steps.map((step, i) => (
          <li
            key={i}
            aria-current={i === current ? 'step' : undefined}
            className={cn(
              'flex-1 border-t-4 pt-1 text-xs',
              i <= current
                ? cn('text-gray-800', theme.border)
                : 'border-gray-300 text-gray-500',
            )}
          >
            <span className="sr-only">{labels.stepItem(i + 1)}</span>
            {step.title}
          </li>
        ))}
      </ol>
    </nav>
  );

export default Stepper;
