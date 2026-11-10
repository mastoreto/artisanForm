import { defaultLabels } from '../../commons/labels';
import type { ArtisanStepperProps } from '../ui/types';
import { useCx } from '../ui/UiContext';

/** Progress indicator; also announces the step change to screen readers. */
const Stepper = ({
  steps,
  current,
  onSelect,
  labels = defaultLabels,
}: Omit<ArtisanStepperProps, 'labels'> & {
  labels?: ArtisanStepperProps['labels'];
}) => {
  const cx = useCx();
  // A single step has nothing to show progress for.
  if (steps.length < 2) return null;
  return (
    <nav aria-label={labels.progress} className={cx('stepper')}>
      <p className={cx('srOnly')} aria-live="polite">
        {labels.step(current + 1, steps.length, steps[current]?.title ?? '')}
      </p>
      <ol className={cx('stepperList')}>
        {steps.map((step, i) => (
          <li
            key={step.id}
            aria-current={step.state === 'current' ? 'step' : undefined}
            className={cx('stepperItem')}
            data-state={step.state}
          >
            <span className={cx('srOnly')}>{labels.stepItem(i + 1)}</span>
            {onSelect && step.state === 'done' ? (
              <button
                type="button"
                className={cx('stepperButton')}
                onClick={() => onSelect(i)}
              >
                {step.title}
              </button>
            ) : (
              step.title
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Stepper;
