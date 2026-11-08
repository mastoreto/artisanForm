import { useCx } from '../../components/ui/UiContext';

/**
 * Spinner + message shown while a provider SDK/session loads. Lives here (not
 * in the form components) so each payment entry stays independent of the main
 * bundle.
 */
const Loading = ({ message }: { message: string }) => {
  const cx = useCx();
  return (
    <div role="status" className={cx('status')} data-tone="pending">
      <span aria-hidden="true" className={cx('statusIcon')}>
        <span className={cx('spinner')} />
      </span>
      <p>{message}</p>
    </div>
  );
};

export default Loading;
