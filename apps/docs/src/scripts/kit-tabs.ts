// Accessible tabs: all panels are server-rendered (indexable); this only toggles `hidden`.
for (const root of document.querySelectorAll<HTMLElement>('[data-tabs]')) {
  const tabs = [...root.querySelectorAll<HTMLElement>('[role="tab"]')];
  const select = (tab: HTMLElement, focus = false) => {
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(
        t.getAttribute('aria-controls') ?? '',
      );
      if (panel) panel.hidden = !on;
    }
    if (focus) tab.focus();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (e) => {
      const keys: Record<string, number> = {
        ArrowRight: i + 1,
        ArrowDown: i + 1,
        ArrowLeft: i - 1,
        ArrowUp: i - 1,
        Home: 0,
        End: tabs.length - 1,
      };
      const to = keys[e.key];
      if (to === undefined) return;
      e.preventDefault();
      select(tabs[(to + tabs.length) % tabs.length], true);
    });
  });
}
