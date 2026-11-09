// Landing demo wizard: real validation, a persisted draft and an accessible stepper.
const KEY = 'artisanform-demo-draft';

function init(root: HTMLElement) {
  const form = root.querySelector('form') as HTMLFormElement;
  const panels = [...root.querySelectorAll<HTMLElement>('[data-panel]')];
  const nodes = [...root.querySelectorAll<HTMLElement>('[data-node]')];
  const prev = root.querySelector<HTMLButtonElement>(
    '[data-prev]',
  ) as HTMLButtonElement;
  const next = root.querySelector<HTMLButtonElement>(
    '[data-next]',
  ) as HTMLButtonElement;
  const nextLabel = root.querySelector('[data-next-label]') as HTMLElement;
  const done = root.querySelector<HTMLElement>('[data-done]') as HTMLElement;
  const fields = [...root.querySelectorAll<HTMLInputElement>('[data-field]')];
  let step = 0;

  const read = (): Record<string, string | boolean> => {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? '{}');
    } catch {
      return {};
    }
  };
  const save = () => {
    try {
      const data: Record<string, string | boolean> = {};
      for (const f of fields)
        data[f.name] = f.type === 'checkbox' ? f.checked : f.value;
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {}
  };
  const restore = () => {
    const data = read();
    for (const f of fields) {
      if (!(f.name in data)) continue;
      if (f.type === 'checkbox') f.checked = data[f.name] === true;
      else f.value = String(data[f.name]);
    }
  };

  const showError = (input: HTMLInputElement, on: boolean) => {
    input.setAttribute('aria-invalid', String(on));
    const msg = root.querySelector<HTMLElement>(
      `[data-error-for="${input.id}"]`,
    );
    if (msg) msg.hidden = !on;
    const hint = input.id === 'wz-project' ? 'wz-project-hint' : '';
    if (msg)
      input.setAttribute(
        'aria-describedby',
        [hint, on ? `${input.id}-err` : ''].filter(Boolean).join(' '),
      );
    if (msg) msg.id = `${input.id}-err`;
  };

  const validate = () => {
    let first: HTMLInputElement | null = null;
    for (const input of panels[step].querySelectorAll<HTMLInputElement>(
      '[data-field]',
    )) {
      const ok = input.checkValidity();
      showError(input, !ok);
      if (!ok) first ??= input;
    }
    first?.focus();
    return !first;
  };

  const summary = () => {
    const fd = new FormData(form);
    const set = (k: string, v: string) => {
      const el = root.querySelector(`[data-out="${k}"]`);
      if (el) el.textContent = v;
    };
    const t = form.dataset;
    set('project', String(fd.get('project') ?? ''));
    set('email', String(fd.get('email') ?? ''));
    set('kit', String(fd.get('kit') ?? ''));
    set('strict', fd.get('strict') ? (t.yes ?? 'Yes') : (t.no ?? 'No'));
  };

  const render = () => {
    panels.forEach((p, i) => {
      p.hidden = i !== step;
    });
    nodes.forEach((n, i) => {
      n.dataset.state =
        i < step ? 'complete' : i === step ? 'current' : 'upcoming';
      if (i === step) n.setAttribute('aria-current', 'step');
      else n.removeAttribute('aria-current');
    });
    root.style.setProperty(
      '--wizard-progress',
      `${(step / (panels.length - 1)) * 100}%`,
    );
    prev.disabled = step === 0;
    const last = step === panels.length - 1;
    nextLabel.textContent =
      (last ? next.dataset.labelFinish : next.dataset.labelNext) ?? '';
    if (last) summary();
    if (!last) done.hidden = true;
  };

  next.addEventListener('click', () => {
    if (!validate()) return;
    if (step < panels.length - 1) {
      step++;
      render();
    } else {
      (done.querySelector('[data-done-text]') as HTMLElement).textContent =
        form.dataset.doneText ?? '';
      done.hidden = false;
    }
  });
  prev.addEventListener('click', () => {
    step = Math.max(0, step - 1);
    render();
  });
  form.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.getAttribute('aria-invalid') === 'true' && t.checkValidity())
      showError(t, false);
    save();
  });
  form.addEventListener('submit', (e) => e.preventDefault());
  root.querySelector('[data-reset]')?.addEventListener('click', () => {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    form.reset();
    for (const f of fields) showError(f, false);
    step = 0;
    render();
  });

  restore();
  render();
}

for (const root of document.querySelectorAll<HTMLElement>('[data-wizard]'))
  init(root);
