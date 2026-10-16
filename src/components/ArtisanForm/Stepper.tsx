import { cn } from '../../commons/cn';
import type { StepSchema } from './types';

interface StepperProps {
  steps: StepSchema[];
  current: number;
}

/** Progress indicator; also announces the step change to screen readers. */
const Stepper = ({ steps, current }: StepperProps) => (
  <nav aria-label="Progreso" className="mb-4">
    <p className="sr-only" aria-live="polite">
      {`Paso ${current + 1} de ${steps.length}: ${steps[current]?.title ?? ''}`}
    </p>
    <ol className="flex gap-2">
      {steps.map((step, i) => (
        <li
          key={i}
          aria-current={i === current ? 'step' : undefined}
          className={cn(
            'flex-1 border-t-4 pt-1 text-xs',
            i <= current
              ? 'border-blue-500 text-gray-800'
              : 'border-gray-300 text-gray-500',
          )}
        >
          <span className="sr-only">{`Paso ${i + 1}: `}</span>
          {step.title}
        </li>
      ))}
    </ol>
  </nav>
);

export default Stepper;
