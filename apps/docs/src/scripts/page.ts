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
