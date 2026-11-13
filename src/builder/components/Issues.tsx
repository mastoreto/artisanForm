import { useBuilder } from '../context';
import { useBx } from '../cx';
import { pathToSelection } from '../model/selection';

/** Problems of the schema, each one a way to jump to the element it is about. */
export const Issues = () => {
  const { result, schema, labels, actions } = useBuilder();
  const bx = useBx();
  const errors = result.issues.filter((i) => i.severity === 'error');
  const warnings = result.issues.filter((i) => i.severity === 'warning');
  const list = [...errors, ...warnings];
  return (
    <details className={bx('issues')} open={errors.length > 0}>
      <summary className={bx('issuesSummary')}>
        {labels.issuesTitle(errors.length, warnings.length)}
      </summary>
      {list.length === 0 ? (
        <p className={bx('help')}>{labels.noIssues}</p>
      ) : (
        <ul className={bx('issueList')}>
          {list.map((issue, i) => (
            <li key={`${issue.code}:${issue.path}:${i}`}>
              <button
                type="button"
                className={bx(
                  'issue',
                  issue.severity === 'error' ? 'afb-bad' : 'afb-warn',
                )}
                aria-label={labels.goToIssue(issue.path || '$')}
                onClick={() =>
                  actions.select(pathToSelection(schema, issue.path))
                }
              >
                <code>{issue.code}</code> {issue.message}
                {issue.path ? (
                  <span className={bx('issuePath')}> {issue.path}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
};

/** What changing the form would do to the answers already collected with the published one. */
export const Compatibility = () => {
  const { comparison, labels } = useBuilder();
  const bx = useBx();
  if (!comparison) return null;
  const { typeChanged, removed, requiredChanged, optionsRemoved } = comparison;
  const lines: { text: string; bad: boolean }[] = [];
  if (typeChanged.length)
    lines.push({
      text: labels.compatBreaking(
        typeChanged.map((t) => `${t.name} (${t.from} → ${t.to})`).join(', '),
      ),
      bad: true,
    });
  if (removed.length)
    lines.push({ text: labels.compatRemoved(removed.join(', ')), bad: false });
  const nowRequired = requiredChanged.filter((r) => r.to).map((r) => r.name);
  if (nowRequired.length)
    lines.push({
      text: labels.compatRequired(nowRequired.join(', ')),
      bad: false,
    });
  if (optionsRemoved.length)
    lines.push({
      text: labels.compatOptions(optionsRemoved.map((o) => o.name).join(', ')),
      bad: false,
    });
  if (lines.length === 0) return null;
  return (
    <aside
      className={bx('compat', comparison.compatible ? 'afb-warn' : 'afb-bad')}
      aria-label={labels.compatTitle}
    >
      <strong>{labels.compatTitle}</strong>
      <ul>
        {lines.map((l) => (
          <li key={l.text} className={l.bad ? bx('compatBad') : undefined}>
            {l.text}
          </li>
        ))}
      </ul>
    </aside>
  );
};
