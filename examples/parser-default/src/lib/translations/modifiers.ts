import type { Modifier } from '@sveltekit-i18n/parser-default';

export const test: Modifier.T = ({ value, defaultValue }) => `${value || defaultValue} 🥳`;

export type CurrencyProps = Intl.NumberFormatOptions & { ratio?: number };

export const currency: Modifier.T<CurrencyProps> = ({ value, props, defaultValue, locale }) => {
  const { ratio = 1, currency } = props || {};

  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(ratio * (value || defaultValue));
};
