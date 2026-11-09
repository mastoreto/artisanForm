// Copy buttons + pause the forge animations while their section is off screen.
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

const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    (e.target as HTMLElement).toggleAttribute('data-visible', e.isIntersecting);
  }
});
for (const el of document.querySelectorAll('[data-forge]')) io.observe(el);
