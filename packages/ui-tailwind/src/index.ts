import type { ArtisanUiKit } from 'artisanform';

/**
 * Tailwind CSS for ArtisanForm: the default UI is switched off (`unstyled`)
 * and every part gets Tailwind utilities. Tell Tailwind to scan this file:
 *   v3: content: ['./node_modules/@beardartisans/ui-tailwind/dist/**\/*.js']
 *   v4: @source "../node_modules/@beardartisans/ui-tailwind/dist";
 * Error states use the `aria-[invalid=true]:` variant (Tailwind 3.2+).
 */
export const tailwindKit = {
  name: 'tailwind',
  unstyled: true,
  classNames: {
    root: 'w-full',
    stepper: 'mb-6',
    stepperList: 'flex gap-2 list-none p-0 m-0',
    stepperItem:
      'flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-500 data-[state=current]:border-blue-600 data-[state=current]:font-semibold data-[state=current]:text-blue-700 data-[state=done]:text-gray-900',
    stepHeader: 'mb-4 text-lg font-semibold text-gray-900',
    fieldGrid: 'grid grid-cols-1 gap-4 sm:grid-cols-2',
    fieldCell: 'col-span-1 data-[span="2"]:sm:col-span-2',
    field: 'flex flex-col gap-1',
    label: 'text-sm font-medium text-gray-700',
    groupLabel: 'mb-1 block text-sm font-medium text-gray-700',
    description: 'text-xs text-gray-500',
    error: 'text-xs text-red-600',
    input:
      'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100 aria-[invalid=true]:border-red-500 aria-[invalid=true]:ring-red-200',
    inputWrap: 'flex items-center gap-2',
    adornment: 'text-sm text-gray-500',
    select:
      'w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 pr-8 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200 aria-[invalid=true]:border-red-500',
    selectWrap: 'relative',
    selectIcon:
      'pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-gray-500',
    choiceGroup: 'flex flex-col gap-2',
    choice: 'flex items-center gap-2 text-sm text-gray-800',
    checkbox:
      'h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-200',
    chipList: 'mb-2 flex flex-wrap gap-1',
    chip: 'rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-800',
    comboWrap: 'relative',
    listbox:
      'absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg',
    option: 'cursor-pointer px-3 py-2 text-sm hover:bg-gray-100',
    range: 'w-full accent-blue-600',
    dropzone:
      'rounded-md border-2 border-dashed border-gray-300 p-6 text-center text-sm text-gray-600',
    fileList: 'mt-2 flex flex-col gap-1 text-sm',
    progress: 'mt-1 h-1.5 w-full overflow-hidden rounded bg-gray-200',
    progressBar: 'h-full bg-blue-600',
    link: 'text-blue-600 underline',
    smallButton:
      'rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50',
    arrayList: 'flex flex-col gap-3',
    arrayItem: 'rounded-md border border-gray-200 p-4',
    arrayItemHeader: 'mb-2 flex items-center justify-between',
    controls: 'mt-6 flex items-center justify-between gap-3',
    button:
      'rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50',
    formError:
      'mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700',
    status:
      'flex flex-col items-center gap-3 rounded-md border border-gray-200 p-6 text-center',
    statusTitle: 'text-base font-semibold',
    statusMessage: 'text-sm text-gray-600',
    statusActions: 'flex gap-2',
    spinner:
      'h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent',
    callout:
      'rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900',
    stack: 'flex flex-col gap-3',
    muted: 'text-gray-500',
    heading: 'text-base font-semibold',
    divider: 'my-2 border-t border-gray-200',
    reviewList: 'divide-y divide-gray-200 rounded-md border border-gray-200',
    reviewRow: 'flex justify-between gap-4 px-3 py-2 text-sm',
    srOnly: 'sr-only',
  },
} satisfies ArtisanUiKit;

export default tailwindKit;
