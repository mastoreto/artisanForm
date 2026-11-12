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
    root: 'w-full text-slate-900',
    stepper: 'mb-8',
    stepperList: 'm-0 flex list-none gap-6 border-b border-slate-200 p-0',
    stepperItem:
      '-mb-px border-b-2 border-transparent pb-3 text-sm font-medium text-slate-400 data-[state=current]:border-emerald-600 data-[state=current]:text-slate-900 data-[state=done]:text-emerald-700 data-[state=done]:before:mr-1 data-[state=done]:before:content-["✓"]',
    stepperButton:
      'cursor-pointer border-0 bg-transparent p-0 font-medium text-inherit hover:underline',
    stepHeader: 'mb-5 text-xl font-semibold tracking-tight text-slate-900',
    fieldGrid: 'grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2',
    fieldCell: 'col-span-1 data-[span="2"]:sm:col-span-2',
    field: 'flex flex-col gap-1.5',
    label: 'text-sm font-medium text-slate-800',
    groupLabel: 'mb-1.5 block text-sm font-medium text-slate-800',
    description: 'text-xs leading-5 text-slate-500',
    error: 'text-xs font-medium text-rose-600',
    input:
      'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 hover:border-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 aria-[invalid=true]:border-rose-500 aria-[invalid=true]:ring-rose-500/20',
    inputWrap: 'flex items-center gap-2',
    adornment: 'text-sm font-medium text-slate-500',
    select:
      'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 hover:border-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 aria-[invalid=true]:border-rose-500 aria-[invalid=true]:ring-rose-500/20 appearance-none pr-10',
    selectWrap: 'relative',
    selectIcon:
      'pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500',
    choiceGroup: 'flex flex-wrap gap-2',
    choice:
      'cursor-pointer select-none rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50 aria-[pressed=true]:border-emerald-600 aria-[pressed=true]:bg-emerald-600 aria-[pressed=true]:text-white aria-[checked=true]:border-emerald-600 aria-[checked=true]:bg-emerald-600 aria-[checked=true]:text-white data-[checked]:border-emerald-600 data-[checked]:bg-emerald-600 data-[checked]:text-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/25',
    switch:
      'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-0 bg-slate-300 p-0 transition-colors data-[checked]:bg-emerald-600 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/25',
    switchThumb:
      'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform [[data-checked]_&]:translate-x-5',
    checkbox:
      'h-[18px] w-[18px] cursor-pointer rounded-md border-slate-300 text-emerald-600 shadow-sm focus:ring-4 focus:ring-emerald-500/25',
    chipList: 'mb-2 flex flex-wrap gap-1.5',
    chip: 'inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200',
    comboWrap: 'relative',
    listbox:
      'absolute z-10 mt-2 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl shadow-slate-900/10',
    option:
      'cursor-pointer rounded-lg px-3 py-2 text-sm text-slate-700 data-[active]:bg-emerald-50 data-[active]:text-emerald-900 data-[selected]:font-semibold',
    optionHint: 'text-xs text-slate-400',
    otpGroup: 'flex gap-2',
    otpBox:
      'h-12 w-11 rounded-xl border border-slate-300 bg-white text-center text-lg font-semibold shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 aria-[invalid=true]:border-rose-500',
    rating: 'flex gap-1',
    star: 'cursor-pointer border-0 bg-transparent p-0 text-4xl leading-none text-slate-300 transition hover:scale-110 hover:text-amber-300 data-[filled]:text-amber-400 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/30 rounded',
    range: 'w-full accent-emerald-600',
    rangeValue:
      'flex items-center justify-between text-sm font-semibold text-emerald-700',
    dropzone:
      'rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600 transition hover:border-emerald-400 hover:bg-emerald-50/50 data-[dragging]:border-emerald-600 data-[dragging]:bg-emerald-50',
    fileList: 'mt-3 flex flex-col gap-2 text-sm',
    fileItem:
      'flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm',
    fileName: 'flex-1 truncate font-medium text-slate-800',
    fileThumb: 'h-10 w-10 rounded-lg object-cover',
    progress: 'mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200',
    progressBar: 'h-full rounded-full bg-emerald-600 transition-all',
    link: 'font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-800',
    smallButton:
      'cursor-pointer rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/25',
    action:
      'cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/25',
    paymentOptions: 'grid grid-cols-1 gap-3 sm:grid-cols-2',
    paymentOption:
      'flex cursor-pointer items-center gap-3.5 rounded-xl border border-slate-300 bg-white p-3.5 text-left shadow-sm transition hover:border-emerald-500 hover:shadow focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/25',
    paymentOptionIcon:
      'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 [&_svg]:h-6 [&_svg]:w-6',
    paymentOptionText: 'flex min-w-0 flex-col gap-0.5',
    paymentOptionName: 'text-[15px] font-semibold text-slate-900',
    paymentOptionHint: 'text-[13px] text-slate-500',
    arrayList: 'flex flex-col gap-3',
    arrayItem: 'rounded-2xl border border-slate-200 bg-slate-50/60 p-4',
    arrayItemHeader: 'mb-3 flex items-center justify-between',
    arrayItemTitle: 'text-sm font-semibold text-slate-800',
    arrayRow: 'grid gap-4',
    dependent: 'mt-4',
    dateRange: 'grid grid-cols-1 gap-4 sm:grid-cols-2',
    controls:
      'mt-8 flex items-center justify-between gap-3 border-t border-slate-200 pt-5',
    button:
      'cursor-pointer rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-900/20 transition hover:bg-emerald-700 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/25',
    formError:
      'mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm font-medium text-rose-700',
    status:
      'flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-10 text-center',
    statusIcon:
      'flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600',
    statusTitle: 'text-lg font-semibold text-slate-900',
    statusMessage: 'text-sm leading-6 text-slate-600',
    statusActions: 'mt-2 flex gap-2',
    spinner:
      'h-7 w-7 animate-spin rounded-full border-[3px] border-emerald-600 border-t-transparent',
    callout:
      'rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm leading-6 text-emerald-900',
    stack: 'flex flex-col gap-4',
    review: 'flex flex-col gap-4',
    terms:
      'mb-4 max-h-64 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700',
    text: 'text-sm text-slate-700',
    paragraph: 'text-sm leading-6 text-slate-600',
    muted: 'text-slate-500',
    heading: 'text-base font-semibold text-slate-900',
    divider: 'my-3 border-t border-slate-200',
    reviewList:
      'divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white',
    reviewRow:
      'flex justify-between gap-4 px-4 py-3 text-sm [&_dt]:text-slate-500 [&_dd]:font-medium [&_dd]:text-slate-900',
    srOnly: 'sr-only',
  },
} satisfies ArtisanUiKit;

export default tailwindKit;
