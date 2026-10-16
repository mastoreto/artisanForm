import Controls from '../Controls/Controls';
import type { ArtisanControlsProps } from '../ui/types';
import { useComponents, useCx } from '../ui/UiContext';
import Stepper from './Stepper';
import { useWizard, type WizardProps } from './useWizard';

const DefaultStepHeader = ({ title }: { title: string }) => {
  const cx = useCx();
  return <h2 className={cx('stepHeader')}>{title}</h2>;
};

const DefaultFormError = ({ message }: { message: string }) => {
  const cx = useCx();
  return (
    <p role="alert" className={cx('formError')}>
      {message}
    </p>
  );
};

/** The built-in controls speak the public contract; the store is only a fallback. */
const DefaultControls = ({ error: _error, ...props }: ArtisanControlsProps) => (
  <Controls {...props} />
);

export type { WizardProps };

/** Renders the current step; lives inside the form provider to read live values. */
export const Wizard = (props: WizardProps) => {
  const cx = useCx();
  const custom = useComponents();
  const wizard = useWizard(props);
  if (!wizard) return null;
  const { steps, step, current, definition, context, formRef, next, goTo } =
    wizard;
  const { labels, className, ui: formUi } = props;
  const { finalIndex, stepError, submitError, submitState } = wizard;
  const controls = { ...definition.controls, ...current.controls };
  const formError =
    stepError ?? (current.kind !== 'result' ? submitError : null);
  const controlLabels = {
    ...labels,
    ...(controls.nextLabel && {
      next: controls.nextLabel,
      submit: controls.nextLabel,
    }),
    ...(controls.previousLabel && { previous: controls.previousLabel }),
  };
  const StepperSlot = custom.Stepper ?? Stepper;
  const StepHeaderSlot = custom.StepHeader ?? DefaultStepHeader;
  const FormErrorSlot = custom.FormError ?? DefaultFormError;
  const ControlsSlot = custom.Controls ?? DefaultControls;

  return (
    <form
      noValidate
      ref={formRef}
      className={cx('root', className)}
      data-layout={formUi?.layout}
      data-density={formUi?.density}
      data-label-position={formUi?.labelPosition}
      onSubmit={(e) => {
        e.preventDefault();
        void next();
      }}
    >
      <StepperSlot
        steps={steps.map((s, i) => ({
          id: s.id ?? String(i),
          title: s.title,
          state: i < step ? 'done' : i === step ? 'current' : 'upcoming',
        }))}
        current={step}
        labels={labels}
      />
      <StepHeaderSlot title={current.title} index={step} total={steps.length} />
      {definition.render(context)}
      {formError && <FormErrorSlot message={formError} />}
      {!controls.hidden && (
        <ControlsSlot
          onNext={() => void next()}
          onPrevious={() => goTo(Math.max(0, step - 1))}
          isFirst={step <= 0}
          isLast={step >= finalIndex}
          hidePrevious={controls.hidePrevious}
          hideNext={controls.hideNext}
          nextDisabled={controls.nextDisabled}
          isSubmitting={submitState === 'submitting'}
          error={formError}
          labels={controlLabels}
        />
      )}
    </form>
  );
};
