export const filterTranslationKeys = (localeTranslation: any, keys: string[]) => keys.reduce((a, key) => ({
  ...a,
  ...Object.keys(localeTranslation).filter((k:string) => `${k}`.startsWith(`${key}.`)).reduce((acc, k) => ({ ...acc, [k]: localeTranslation[k] }), {}),
}),
{},
);

export const useDefault = <T = any>(value: any, def:any = {}): T => value || def;

type DotNotationInput = Record<string, any> | null | undefined | any;

type DotNotationOutput = Record<string, any>;

type ToDotNotation = (input: DotNotationInput, parentKey?: string) => DotNotationOutput;

export const toDotNotation: ToDotNotation = (input, parentKey) => Object.keys(useDefault(input)).reduce((acc, key) => {
  const value = input[key];
  const outputKey = parentKey ? `${parentKey}.${key}` : `${key}`;

  if (value && typeof value === 'object') return ({ ...acc, ...toDotNotation(value, outputKey) });

  return ({ ...acc, [outputKey]: value });
}, {});