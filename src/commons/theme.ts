/**
 * Brand color classes. Override the colors from your own CSS:
 *   :root { --artisan-primary: #7c3aed; --artisan-primary-dark: #5b21b6; }
 * (Full class strings so Tailwind can detect them.)
 */
export const theme = {
  bg: 'bg-[var(--artisan-primary,#3b82f6)]',
  bgHover: 'hover:bg-[var(--artisan-primary-dark,#1d4ed8)]',
  border: 'border-[var(--artisan-primary,#3b82f6)]',
  focusBorder: 'focus:border-[var(--artisan-primary,#3b82f6)]',
  focusRing: 'focus:ring-[var(--artisan-primary,#3b82f6)]',
} as const;
