import { useBuilder } from '../context';
import { useBx } from '../cx';

const FLOW_CODES = new Set([
  'unreachable-step',
  'unbounded-loop',
  'payment-without-confirmation',
  'unknown-step-reference',
]);

/** Where each step leads, with the parser's warnings about the flow next to the step they are about. */
export const Flow = () => {
  const { schema, result, labels, actions } = useBuilder();
  const bx = useBx();
  const title = (id: string) =>
    schema.steps.find((s) => s.id === id)?.title ?? id;
  return (
    <details className={bx('flow')}>
      <summary>{labels.flowTitle}</summary>
      <ol>
        {schema.steps.map((step, i) => {
          const edges = (step as { next?: { to: string }[] }).next ?? [];
          const problems = result.issues.filter(
            (p) => FLOW_CODES.has(p.code) && p.path.startsWith(`steps[${i}]`),
          );
          return (
            <li key={step.id} className={bx('flowItem')}>
              <button
                type="button"
                className={bx('button')}
                onClick={() =>
                  actions.select({ kind: 'step', stepId: step.id })
                }
              >
                {step.title}
              </button>
              <span>
                {edges.length === 0
                  ? i === schema.steps.length - 1
                    ? labels.flowEnd
                    : `→ ${title(schema.steps[i + 1]?.id ?? '')}`
                  : edges.map((e) => `→ ${title(e.to)}`).join(', ')}
              </span>
              {problems.map((p) => (
                <span key={`${p.code}:${p.path}`} className={bx('flowBadge')}>
                  {p.code}
                </span>
              ))}
            </li>
          );
        })}
      </ol>
    </details>
  );
};
