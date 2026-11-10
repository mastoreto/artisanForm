import Controls from '../Controls/Controls';
import type { ArtisanControlsProps } from '../ui/types';
import { useComponents, useCx } from '../ui/UiContext';
import Stepper from './Stepper';
import type { ArtisanWizard } from './useArtisanWizard';

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

/** Renders what `useArtisanWizard` returns; lives inside `ArtisanWizardProvider`. */
export const Wizard = ({
  wizard,
  className,
}: {
  wizard: ArtisanWizard;
  className?: string;
}) => {
  const cx = useCx();
  const custom = useComponents();
  const {
    current,
    steps,
    step,
    controls,
    labels,
    bindForm,
    ui: formUi,
  } = wizard;
  if (!current) return null;
  const formError =
    wizard.stepError ?? (current.kind !== 'result' ? wizard.submitError : null);
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
      ref={bindForm}
      className={cx('root', className)}
      data-layout={formUi.layout}
      data-density={formUi.density}
      data-label-position={formUi.labelPosition}
      onSubmit={(e) => {
        e.preventDefault();
        void wizard.next();
      }}
    >
      <StepperSlot steps={steps} current={step} labels={labels} />
      <StepHeaderSlot title={current.title} index={step} total={steps.length} />
      {wizard.renderStep()}
      {formError && <FormErrorSlot message={formError} />}
      {!controls.hidden && (
        <ControlsSlot
          onNext={() => void wizard.next()}
          onPrevious={wizard.back}
          isFirst={wizard.isFirst}
          isLast={wizard.isLast}
          hidePrevious={controls.hidePrevious}
          hideNext={controls.hideNext}
          nextDisabled={controls.nextDisabled}
          isSubmitting={wizard.submitState === 'submitting'}
          error={formError}
          labels={controlLabels}
        />
      )}
    </form>
  );
};
