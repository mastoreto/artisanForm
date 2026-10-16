import { type ArtisanLabels, defaultLabels } from '../../commons/labels';
import { useArtisanStore } from '../../engine/store/useArtisanStore';
import { useCx } from '../ui/UiContext';

export interface ControlsProps {
  /** Overrides the default advance (e.g. to validate the step first). */
  onNext?: () => void;
  /** Disables "Finish" while a submit is in flight. */
  isSubmitting?: boolean;
  labels?: Partial<Pick<ArtisanLabels, 'previous' | 'next' | 'submit'>>;
  /** Replaces the default "go back" behavior. */
  onPrevious?: () => void;
  hidePrevious?: boolean;
  hideNext?: boolean;
  nextDisabled?: boolean;
  /** On the first step (no "Previous"). Defaults to the step state of the store. */
  isFirst?: boolean;
  /** On the step that submits (shows "Finish"). Defaults to the store. */
  isLast?: boolean;
  /** Extra classes for the container / for every button. */
  className?: string;
  buttonClassName?: string;
}

const Controls = ({
  onNext,
  onPrevious,
  hidePrevious,
  hideNext,
  nextDisabled,
  isSubmitting,
  isFirst,
  isLast,
  labels,
  className,
  buttonClassName,
}: ControlsProps) => {
  const cx = useCx();
  const storeIsFinal = useArtisanStore((state) => state.isFinalStep);
  const step = useArtisanStore((state) => state.step);
  const processStep = useArtisanStore((state) => state.processStep);
  const setStep = useArtisanStore((state) => state.setStep);
  const setProcessStep = useArtisanStore((state) => state.setProcessStep);

  const text = { ...defaultLabels, ...labels };
  const first = isFirst ?? (processStep <= 0 || step <= 0);
  const last = isLast ?? storeIsFinal;

  const handleNext = () => {
    setStep(step + 1);
    setProcessStep(processStep + 1);
  };

  const handlePrevious = () => {
    setStep(step - 1);
    setProcessStep(processStep - 1);
  };

  return (
    <div className={cx('controls', className)}>
      {!first && !hidePrevious && (
        <button
          type="button"
          className={cx('button', buttonClassName)}
          onClick={() => (onPrevious ?? handlePrevious)()}
        >
          {text.previous}
        </button>
      )}
      {!last && !hideNext && (
        <button
          type="button"
          className={cx('button', buttonClassName)}
          onClick={() => (onNext ?? handleNext)()}
          disabled={nextDisabled}
        >
          {text.next}
        </button>
      )}
      {last && !hideNext && (
        <button
          type="submit"
          className={cx('button', buttonClassName)}
          disabled={isSubmitting || nextDisabled}
        >
          {text.submit}
        </button>
      )}
    </div>
  );
};

export default Controls;
