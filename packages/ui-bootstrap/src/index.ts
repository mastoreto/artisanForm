import type { ArtisanUiKit } from 'artisanform';

/**
 * Bootstrap 5 for ArtisanForm. No `react-bootstrap` needed: the default UI is
 * switched off (`unstyled`) and every part gets Bootstrap's own classes.
 * Load Bootstrap's CSS yourself and import `@beardartisans/ui-bootstrap/style.css`
 * (a small bridge that maps `aria-invalid` to Bootstrap's invalid look).
 */
export const bootstrapKit = {
  name: 'bootstrap',
  unstyled: true,
  classNames: {
    root: 'container-fluid p-0',
    stepper: 'mb-4',
    stepperList: 'nav nav-pills gap-2',
    stepperItem: 'nav-link',
    stepperButton: 'btn btn-link p-0 text-reset text-decoration-none',
    stepHeader: 'h4 mb-3',
    fieldGrid: 'row g-3',
    fieldCell: 'col-12',
    field: 'mb-1',
    label: 'form-label',
    groupLabel: 'form-label d-block',
    description: 'form-text',
    error: 'invalid-feedback d-block',
    input: 'form-control',
    inputWrap: 'input-group',
    adornment: 'input-group-text',
    select: 'form-select',
    selectIcon: 'd-none',
    choiceGroup: 'd-flex flex-column gap-1',
    choice: 'form-check',
    checkbox: 'form-check-input',
    switch: 'form-check-input',
    switchThumb: 'd-none',
    chipList: 'd-flex flex-wrap gap-1 mb-2',
    chip: 'badge text-bg-secondary',
    listbox: 'list-group position-absolute w-100 shadow',
    option: 'list-group-item list-group-item-action',
    comboWrap: 'position-relative',
    range: 'form-range',
    rating: 'd-flex gap-1',
    star: 'btn btn-link p-0 fs-3 lh-1 text-decoration-none',
    dropzone: 'border rounded p-4 text-center',
    fileList: 'list-unstyled mt-2',
    progress: 'progress mt-1',
    progressBar: 'progress-bar',
    link: 'link-primary',
    smallButton: 'btn btn-sm btn-outline-secondary',
    paymentOptions: 'row row-cols-1 row-cols-md-2 g-3',
    paymentOption:
      'col btn btn-outline-secondary d-flex align-items-center gap-3 p-3 text-start',
    paymentOptionIcon:
      'd-inline-flex align-items-center justify-content-center bg-body-secondary rounded flex-shrink-0',
    paymentOptionText: 'd-flex flex-column',
    paymentOptionName: 'fw-semibold text-body',
    paymentOptionHint: 'small text-body-secondary',
    arrayList: 'd-flex flex-column gap-3',
    arrayItem: 'card card-body',
    arrayItemHeader: 'd-flex justify-content-between mb-2',
    controls: 'd-flex justify-content-between mt-4',
    button: 'btn btn-primary',
    formError: 'alert alert-danger mt-3',
    status: 'alert alert-info d-flex flex-column gap-2',
    statusActions: 'd-flex gap-2',
    spinner: 'spinner-border text-primary',
    callout: 'alert alert-secondary',
    stack: 'd-flex flex-column gap-3',
    muted: 'text-body-secondary',
    heading: 'h5',
    divider: 'border-top my-2',
    reviewList: 'list-group',
    reviewRow: 'list-group-item d-flex justify-content-between',
    srOnly: 'visually-hidden',
  },
} satisfies ArtisanUiKit;

export default bootstrapKit;
