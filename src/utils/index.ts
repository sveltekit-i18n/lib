import * as defaultModifiers from '../modifiers';
import { useDefault } from './common';

import type { ToDotNotation, GetTranslation, Translate, Route, ModifierOption, CustomModifiers } from '../types';

export const toDotNotation: ToDotNotation = (input, parentKey) => Object.keys(useDefault(input)).reduce((acc, key) => {
  const value = input[key];
  const outputKey = parentKey ? `${parentKey}.${key}` : `${key}`;

  if (value && typeof value === 'object') return ({ ...acc, ...toDotNotation(value, outputKey) });

  return ({ ...acc, [outputKey]: value });
}, {});

export const getTranslation: GetTranslation = async (loaders) => {
  try {
    const loadedModules = await Promise.all(loaders.map(async ({ key, loader }) => ({ [key]: await loader() })));
    const translation = loadedModules.reduce((acc, item) => ({ ...acc, ...item }), {});

    return toDotNotation(translation);
  } catch (error) {
    console.error(error);
    throw new Error('Failed to load translation. Verify the loader function.');
  }
};

export const testRoute = (route: string) => (input: Route) => {
  try {
    if (typeof input === 'string') return input === route;
    if (typeof input === 'object') return input.test(route);
  } catch (error) {
    throw new Error('Invalid route config!');
  }

  return false;
};

const hasPlaceholders = (text:string = '') => /{{(?:(?!{{|}}).)+}}/.test(`${text}`);

const unesc = (text:string) => text.replace(/\\(?=:|;|{|})/g, '');

const placeholders = (text: string, vars: Record<any, any> = {}, customModifiers: CustomModifiers = {}, locale?: string) => text.replace(/{{\s*(?:(?!{{|}}).)+\s*}}/g, (placeholder: string) => {
  const key = unesc(`${placeholder.match(/(?!{|\s).+?(?!\\[:;]).(?=\s*(?:[:;]|}}$))/)}`);
  const value = vars[key];
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

export const interpolate = (text: string, vars: Record<any, any> = {}, customModifiers?: CustomModifiers, locale?: string):string => {
  if (hasPlaceholders(text)) {
    const output = placeholders(text, vars, customModifiers, locale);

    return interpolate(output, vars, customModifiers, locale);
  } else {
    return unesc(`${text}`);
  }
};

export const translate: Translate = (translation, key, vars = {}, customModifiers = {}, locale = '') => {
  if (!key) throw new Error('no key provided to $t()');
  const text = `${useDefault(useDefault(translation)[key], key)}`;

  return interpolate(text, vars, customModifiers, locale);
};
