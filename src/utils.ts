import type { ToDotNotation, GetTranslation, Translate } from './types';

export const useDefault = <T = any>(value: any, def:any = {}): T => value || def;

export const toDotNotation: ToDotNotation = (input, parentKey) => Object.keys(useDefault(input)).reduce((acc, key) => {
  const value = input[key];
  const outputKey = parentKey ? `${parentKey}.${key}` : `${key}`;

  // NOTE: add `&& (!Array.isArray(value) || value.length)` to include empty arrays in output
  if (value && typeof value === 'object') return ({ ...acc, ...toDotNotation(value, outputKey) });

  return ({ ...acc, [outputKey]: value });
}, {});

export const getTranslation: GetTranslation = async (loaders) => {
  try {
    const loadedModules = await Promise.all(loaders.map(async ({ key, loader }) => ({ [key]: await loader() })));
    const translation = loadedModules.reduce((acc, item) => ({ ...acc, ...item }), {});
    
    console.log(translation);
    
    return toDotNotation(translation);
  } catch (error) {
    console.error(error);
    throw new Error('Failed to load translation. Verify the loader function.');
  }
};

export const translate: Translate = (translation, key, vars = {}) => {
  if (!key) throw new Error('no key provided to $t()');
  let text = `${useDefault(useDefault(translation)[key], key)}`;

  Object.keys(vars).map((k) => {
    const regex = new RegExp(`{{${k}}}`, 'g');
    text = text.replace(regex, vars[k]);
  });

  return text;
};