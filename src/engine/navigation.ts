/**
 * Where the wizard should be when the visible steps change under it: stay on
 * the same step (by id) if it is still visible, otherwise the step now at the
 * same position, clamped to the last visible one.
 */
export const resolveStep = (
  steps: { id?: string }[],
  index: number,
  previousId?: string,
): number => {
  if (steps.length === 0) return 0;
  const sameId =
    previousId === undefined ? -1 : steps.findIndex((s) => s.id === previousId);
  if (sameId >= 0) return sameId;
  return Math.min(Math.max(index, 0), steps.length - 1);
};
