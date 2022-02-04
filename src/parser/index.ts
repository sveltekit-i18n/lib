import * as defaultModifiers from './modifiers';
import { useDefault } from './utils';

import type { CustomModifiers, ModifierOption, Parser } from './types';

const hasPlaceholders = (text:string = '') => /{{(?:(?!{{|}}).)+}}/.test(`${text}`);

const unesc = (text:string) => text.replace(/\\(?=:|;|{|})/g, '');

const placeholders = (text: string, payload: Record<any, any> = {}, customModifiers: CustomModifiers = {}, locale?: string) => text.replace(/{{\s*(?:(?!{{|}}).)+\s*}}/g, (placeholder: string) => {
  const key = unesc(`${placeholder.match(/(?!{|\s).+?(?!\\[:;]).(?=\s*(?:[:;]|}}$))/)}`);
  const value = payload?.[key];
  const [,defaultValue = ''] = useDefault(placeholder.match(/.+?(?!\\;).;\s*default\s*:\s*([^\s:;].+?(?:\\[:;]|[^;\s}])*)(?=\s*(?:;|}}$))/i), []);

  let [,modifierKey = ''] = useDefault(placeholder.match(/{{\s*(?:[^;]|(?:\\;))+\s*(?:(?!\\:).[:])\s*(?!\s)((?:\\;|[^;])+?)(?=\s*(?:[;]|}}$))/i), []);

  if (value === undefined && modifierKey !== 'ne') return defaultValue;

  const hasModifier = !!modifierKey;

  const modifiers: CustomModifiers = { ...defaultModifiers, ...useDefault(customModifiers) };

  modifierKey = Object.keys(modifiers).includes(modifierKey) ? modifierKey : 'eq';

  const modifier = modifiers[modifierKey];
  const options: ModifierOption[] = useDefault<any[]>(
    placeholder.match(/[^\s:;{](?:[^;]|\\[;])+[^\s:;}]/gi), [],
  ).reduce(
    (acc, option, i) => {
      // NOTE: First item is placeholder and modifier
      if (i > 0) {
        const optionKey = unesc(`${option.match(/(?:(?:\\:)|[^:])+/)}`.trim());
        const optionValue = `${option.match(/(?:(?:\\:)|[^:])+$/)}`.trim();

        if (optionKey && optionKey !== 'default' && optionValue) return ([ ...acc, { key: optionKey, value: optionValue }]);
      }

      return acc;
    }, [],
  );

  if (!hasModifier && !options.length) return `${value}`;

  return modifier(value, options, defaultValue, locale);

});

const interpolate = (text: string, payload: Record<any, any> = {}, customModifiers?: CustomModifiers, locale?: string):string => {
  if (hasPlaceholders(text)) {
    const output = placeholders(text, payload, customModifiers, locale);

    return interpolate(output, payload, customModifiers, locale);
  } else {
    return unesc(`${text}`);
  }
};


const parser: Parser = ({ customModifiers = {} }) => ({
  parse: ({ translations = {}, key, payload, locale, fallbackLocale }) => {
    if (!key) throw new Error('No key provided to $t()');
    if (!locale) throw new Error('No locale set!');

    let text = useDefault(translations[locale])[key];

    if (fallbackLocale && text === undefined) {
      text = useDefault(translations[fallbackLocale])[key];
    }

    if (payload?.default && text === undefined) {
      text = `${payload.default}`;
    }

    if (text === undefined) {
      text = `${key}`;
    }

    return interpolate(text, payload, customModifiers, locale);
  },
});

export default parser;