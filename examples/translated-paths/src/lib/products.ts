export const PRODUCTS = ['lamp', 'chair', 'desk'] as const;

export type Product = (typeof PRODUCTS)[number];

export const isProduct = (value: string): value is Product => (PRODUCTS as readonly string[]).includes(value);
