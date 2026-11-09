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
