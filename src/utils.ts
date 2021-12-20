import type { ToDotNotation, GetTranslation, Translate, Route, ModifierKey, Modifier, ModifierOption } from './types';

export const useDefault = <T = any>(value: any, def:any = {}): T => value || def;

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

const hasPlaceholders = (text:string = '') => /{{(?:.(?<!{{|}}))+}}/.test(`${text}`);

const eq: Modifier = (value, options = [], defaultValue = '') => useDefault(options.find(
  ({ key }) => `${key}`.toLowerCase() === `${value}`.toLowerCase(),
)).value || defaultValue;

const lt: Modifier = (value, options = [], defaultValue = '') => {
  const sortedOptions = options.sort((a, b) => +a.key - +b.key);

  return useDefault<ModifierOption>(sortedOptions.find(
    ({ key }) => +value < +key,
  )).value || defaultValue;
};

const gt: Modifier = (value, options = [], defaultValue = '') => {
  const sortedOptions = options.sort((a, b) => +b.key - +a.key);

  return useDefault<ModifierOption>(sortedOptions.find(
    ({ key }) => +value > +key,
  )).value || defaultValue;
};

const lte: Modifier = (value, options = [], defaultValue = '') => eq(value, options) || lt(value, options, defaultValue);

const gte: Modifier = (value, options = [], defaultValue = '') => eq(value, options) || gt(value, options, defaultValue);

const MODIFIERS = {
  lt,
  lte,
  eq,
  gte,
  gt,
};

const unescape = (text:string) => text.replace(/\\(?=;|{)/g, '');

const placeholders = (text: string, vars: Record<any, any> = {}) => text.replace(/{{\s*(?:.(?<!{{|}}))+\s*}}/g, (placeholder: string) => {
  const key = `${placeholder.match(/(?<={{\s*\b)[^{}]+?(?=\s*(?:[;:](?<!\\;)|}}$))/)}`;
  const value = vars[key];
  const defaultValue = `${placeholder.match(/(?<=;\s*default\s*:\s*\b)(?:.(?<!{{|}}))+?(?=\s*(?:;(?<!\\;)|}}))/i) || ''}`;

  if (value === undefined) return defaultValue;

  let modifierKey = `${placeholder.match(/(?<={{\s*\w+\s*:\s*)\w+(?=\s*;)/)}`.toLowerCase();

  const hasModifier = !!+modifierKey;

  modifierKey = Object.keys(MODIFIERS).includes(modifierKey) ? modifierKey : 'eq';

  const modifier = MODIFIERS[modifierKey as ModifierKey];
  const options: ModifierOption[] = useDefault<any[]>(
    placeholder.match(/(?<={{.+?;(?<!\\;)\s*\b)(?:.(?<!\s*default\s*:\s*))+?(?=\s*(?:;(?<!\\;)|}}$))/gi), [],
  ).reduce(
    (acc, option) => {
      const optionKey = unescape(`${option.match(/.+?(?=\s*:\s*)/)}`);
      const optionValue = unescape(`${option.match(/(?<=.+\s*:\s*\b).+/)}`);

      if (optionKey && optionValue) return ([ ...acc, { key: optionKey, value: optionValue }]);

      return acc;
    }, [],
  );

  if (!hasModifier && !options.length) return `${value || defaultValue}`;

  return modifier(value, options, defaultValue);

});

export const interpolate = (text: string, vars: Record<any, any> = {}):string => {
  if (hasPlaceholders(text)) {
    const output = placeholders(text, vars);

    return interpolate(output, vars);
  } else {
    return text;
  }
};

export const translate: Translate = (translation, key, vars = {}) => {
  if (!key) throw new Error('no key provided to $t()');
  const text = `${useDefault(useDefault(translation)[key], key)}`;

  return interpolate(text, vars);
};
