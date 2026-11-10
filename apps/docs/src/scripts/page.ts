// Copy buttons.
for (const btn of document.querySelectorAll<HTMLElement>('[data-copy]')) {
  btn.addEventListener('click', async () => {
    const label = btn.querySelector<HTMLElement>('[data-copy-label]');
    const original = label?.textContent ?? '';
    try {
      await navigator.clipboard.writeText(btn.dataset.copy ?? '');
      if (label) label.textContent = btn.dataset.copied ?? original;
      setTimeout(() => {
        if (label) label.textContent = original;
      }, 2000);
    } catch {}
  });
}

// The shader beats on `mod(time, 3.2s)` of the document timeline. Pin every CSS
// strike/spark animation to that same origin, including ones that start later
// (a wizard panel becoming visible), so shader and panels hit together.
addEventListener('animationstart', (e) => {
  if (!/^(strike|spark)/.test(e.animationName)) return;
  for (const a of (e.target as Element).getAnimations({ subtree: true })) {
    if ((a as CSSAnimation).animationName === e.animationName) a.startTime = 0;
  }
});

// Animations that began before this module ran.
for (const a of document.getAnimations()) {
  if (/^(strike|spark)/.test((a as CSSAnimation).animationName))
    a.startTime = 0;
}

// Animate only while the section is on screen.
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    (e.target as HTMLElement).toggleAttribute('data-visible', e.isIntersecting);
  }
});
for (const el of document.querySelectorAll('[data-forge]')) io.observe(el);

// Mobile menu (<details>): close on link click, Escape or outside click.
const menu = document.querySelector<HTMLDetailsElement>('[data-menu]');
if (menu) {
  const close = () => {
    menu.open = false;
  };
  menu.addEventListener('click', (e) => {
    if ((e.target as Element).closest('nav a')) close();
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.open) {
      close();
      menu.querySelector('summary')?.focus();
    }
  });
  addEventListener('click', (e) => {
    if (!menu.contains(e.target as Node)) close();
  });
}

// Install command: package manager picker (remembered per browser).
const pmButtons = document.querySelectorAll<HTMLButtonElement>('[data-pm]');
if (pmButtons.length) {
  const cmd = document.querySelector<HTMLElement>('[data-install-cmd]');
  const copy = document.querySelector<HTMLElement>('[data-install-copy]');
  const pick = (id: string) => {
    for (const b of pmButtons) {
      const on = b.dataset.pm === id;
      b.setAttribute('aria-pressed', String(on));
      if (on && cmd && copy) {
        cmd.textContent = b.dataset.cmd ?? '';
        copy.dataset.copy = b.dataset.cmd ?? '';
      }
    }
  };
  for (const b of pmButtons) {
    b.addEventListener('click', () => {
      pick(b.dataset.pm ?? 'npm');
      try {
        localStorage.setItem('artisanform-pm', b.dataset.pm ?? 'npm');
      } catch {}
    });
  }
  try {
    const saved = localStorage.getItem('artisanform-pm');
    if (saved) pick(saved);
  } catch {}
}
