import { createContext, useContext } from 'react';

/** Class names of the builder: `afb-<slot>`, with the consumer's own added. */
export interface BuilderUi {
  classNames?: Partial<Record<string, string>>;
  unstyled?: boolean;
}

export const BuilderUiContext = createContext<BuilderUi>({});

const kebab = (slot: string) =>
  slot.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

export type Bx = (
  slot: string,
  ...extra: (string | false | undefined)[]
) => string;

/** `bx('palette')` → `afb-palette` (and the consumer's `classNames.palette`). */
export const useBx = (): Bx => {
  const { classNames, unstyled } = useContext(BuilderUiContext);
  return (slot, ...extra) =>
    [unstyled ? '' : `afb-${kebab(slot)}`, classNames?.[slot], ...extra]
      .filter(Boolean)
      .join(' ');
};
