import { type ClassValue, clsx } from 'clsx';

/** Joins class names (`clsx`). Kept as a named export for existing consumers. */
export const cn = (...inputs: Array<ClassValue>): string => clsx(inputs);
