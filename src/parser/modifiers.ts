import { useDefault, findOption } from './utils';
import type { Modifier, ModifierOption } from './types';

export const eq: Modifier = (value, options = [], defaultValue = '') => useDefault(options.find(
  ({ key }) => `${key}`.toLowerCase() === `${value}`.toLowerCase(),
)).value || defaultValue;

export const ne: Modifier = (value, options = [], defaultValue = '') => useDefault(options.find(
  ({ key }) => `${key}`.toLowerCase() !== `${value}`.toLowerCase(),
)).value || defaultValue;

export const lt: Modifier = (value, options = [], defaultValue = '') => {
  const sortedOptions = options.sort((a, b) => +a.key - +b.key);

  return useDefault<ModifierOption>(sortedOptions.find(
    ({ key }) => +value < +key,
  )).value || defaultValue;
};

export const gt: Modifier = (value, options = [], defaultValue = '') => {
  const sortedOptions = options.sort((a, b) => +b.key - +a.key);

  return useDefault<ModifierOption>(sortedOptions.find(
    ({ key }) => +value > +key,
  )).value || defaultValue;
};

export const lte: Modifier = (value, options = [], defaultValue = '') => eq(value, options, lt(value, options, defaultValue));

export const gte: Modifier = (value, options = [], defaultValue = '') => eq(value, options, gt(value, options, defaultValue));

export const number:Modifier = (value, options = [], defaultValue = '', locale = '') => (
  locale && new Intl.NumberFormat(locale, {
    maximumFractionDigits: findOption(options, 'decimals', findOption(options, 'maxDecimals', '2')),
    minimumFractionDigits: findOption(options, 'minDecimals'),
  }).format(+value || +defaultValue)
);

export const date:Modifier = (value, options = [], defaultValue = '', locale = '') => (
  locale && new Intl.DateTimeFormat(locale, {
    dateStyle: findOption(options, 'dateStyle', 'medium'),
    timeStyle: findOption(options, 'timeStyle', 'short'),
  }).format(+value || +defaultValue)
);

const agoMap = [
  { key:'second', multiplier:1000 },
  { key:'minute', multiplier:60 },
  { key:'hour', multiplier:60 },
  { key:'day', multiplier:24 },
  { key:'week', multiplier:7 },
  { key:'month', multiplier:13 / 3 },
  { key:'year', multiplier:12 },
] as { key: Intl.RelativeTimeFormatUnit, multiplier: number }[];

const findIndex = (currentKey: string) => agoMap.indexOf(agoMap.find((item) => item.key === currentKey) as any);

const autoFormat = (millis: number): [number, Intl.RelativeTimeFormatUnit] => agoMap.reduce(([value, currentKey], { key, multiplier }, index) => {
  if (!currentKey || index === findIndex(currentKey) + 1) {
    const output = Math.round(value / multiplier);

    if (!currentKey || Math.abs(output) >= 1) return [output, key];
  }

  return [value, currentKey];
}, [millis, '' as Intl.RelativeTimeFormatUnit]);

export const ago:Modifier = (value, options = [], defaultValue = '', locale = '') => {
  if (!locale) return '';

  const format: Intl.RelativeTimeFormatUnit | 'auto' = findOption(options, 'format', 'auto');
  const inputValue = (+value || +defaultValue) - Date.now();

  const formatParams: [number, Intl.RelativeTimeFormatUnit] = (format ===  'auto') ? autoFormat(inputValue) : [inputValue, format];

  return new Intl.RelativeTimeFormat(locale, {
    numeric: findOption(options, 'numeric', 'auto'),
    style: findOption(options, 'style', 'long'),
  }).format(...formatParams);
};