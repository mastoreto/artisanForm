/**
 * Spinner + message shown while a provider SDK/session loads. Lives here (not
 * in the form components) so each payment entry stays independent of the main
 * bundle.
 */
const Loading = ({ message }: { message: string }) => (
  <div
    role="status"
    className="flex flex-col items-center gap-3 py-6 text-center text-gray-600"
  >
    <span
      aria-hidden="true"
      className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100"
    >
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[var(--artisan-primary,#3b82f6)]" />
    </span>
    <p>{message}</p>
  </div>
);

export default Loading;
