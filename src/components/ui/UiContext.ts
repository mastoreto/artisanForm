import { clsx } from 'clsx';
import { createContext, useContext } from 'react';
import type { ArtisanComponents } from './types';

/**
 * Every visible part of the default UI. Each renders with a stable `af-<slot>`
 * class (kebab-case); `classNames` adds yours and `unstyled` drops ours.
 */
export const SLOTS = [
  'root',
  'stepper',
  'stepperItem',
  'stepperButton',
  'stepHeader',
  'fieldGrid',
  'fieldCell',
  'field',
  'label',
  'groupLabel',
  'description',
  'error',
  'input',
  'inputWrap',
  'adornment',
  'select',
  'selectWrap',
  'selectIcon',
  'choiceGroup',
  'choice',
  'switch',
  'switchThumb',
  'checkbox',
  'chipList',
  'chip',
  'comboWrap',
  'listbox',
  'option',
  'optionHint',
  'otpGroup',
  'otpBox',
  'rating',
  'star',
  'range',
  'rangeValue',
  'dropzone',
  'fileList',
  'fileItem',
  'fileName',
  'fileThumb',
  'progress',
  'progressBar',
  'link',
  'smallButton',
  'arrayList',
  'arrayItem',
  'arrayItemHeader',
  'arrayItemTitle',
  'controls',
  'button',
  'formError',
  'status',
  'statusIcon',
  'statusTitle',
  'statusMessage',
  'statusActions',
  'spinner',
  'callout',
  'stack',
  'review',
  'terms',
  'text',
  'muted',
  'action',
  'reviewList',
  'reviewRow',
  'arrayRow',
  'dependent',
  'dateRange',
  'heading',
  'paragraph',
  'divider',
  'srOnly',
  'stepperList',
] as const;

export type ArtisanSlot = (typeof SLOTS)[number];
export type ArtisanClassNames = Partial<Record<ArtisanSlot, string>>;

export interface UiConfig {
  /** Extra classes per slot, added to the defaults (or used alone with `unstyled`). */
  classNames?: ArtisanClassNames;
  /** Do not emit the `af-*` classes (bring your own styles). */
  unstyled?: boolean;
  /** Replacement components (see `ArtisanComponents`). */
  components?: ArtisanComponents;
}

export const UiContext = createContext<UiConfig>({});

const kebab = (slot: string) =>
  slot.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

export type Cx = (
  slot: ArtisanSlot,
  ...extra: Parameters<typeof clsx>
) => string;

export const makeCx =
  (ui: UiConfig): Cx =>
  (slot, ...extra) =>
    clsx(
      // Screen-reader text must stay hidden even without the default styles.
      (!ui.unstyled || slot === 'srOnly') && `af-${kebab(slot)}`,
      ui.classNames?.[slot],
      ...extra,
    );

export const useComponents = (): ArtisanComponents =>
  useContext(UiContext).components ?? {};

/** `cx('input', error && 'is-invalid')` → default class + the consumer's + extras. */
export const useCx = (): Cx => makeCx(useContext(UiContext));
