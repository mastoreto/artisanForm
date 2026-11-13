import type { ArtisanLabels } from '../../commons/labels';
import type { SchemaIssue } from '../../schema/contract/types';
import StatusPanel from '../steps/StatusPanel';
import { useCx } from '../ui/UiContext';

declare const process: { env?: { NODE_ENV?: string } } | undefined;

/** Outside production by default (the consumer's bundler replaces `NODE_ENV`). */
export const showsIssuesByDefault = (): boolean => {
  try {
    return process?.env?.NODE_ENV !== 'production';
  } catch {
    return false;
  }
};

/**
 * What `<ArtisanForm>` shows instead of a form whose schema cannot run. It is
 * a calm state screen, never an exception: the end user gets a short,
 * translatable message, and a developer (when `showIssues` is on, by default
 * outside production) also gets every error with its code and path.
 */
export const SchemaErrorPanel = ({
  issues,
  labels,
  showIssues,
  className,
}: {
  issues: readonly SchemaIssue[];
  labels: ArtisanLabels;
  showIssues: boolean;
  className?: string;
}) => {
  const cx = useCx();
  const errors = issues.filter((issue) => issue.severity === 'error');
  return (
    <div className={cx('root', className)}>
      <StatusPanel tone="error" message={labels.schemaErrorMessage}>
        {showIssues && errors.length > 0 && (
          <ul className={cx('schemaIssues')}>
            {errors.map((issue, i) => (
              <li key={`${issue.code}:${issue.path}:${i}`}>
                <code>{issue.code}</code>{' '}
                {issue.path && <code>{issue.path}</code>}
                {issue.path ? ' · ' : ' '}
                {issue.message}
              </li>
            ))}
          </ul>
        )}
      </StatusPanel>
    </div>
  );
};
