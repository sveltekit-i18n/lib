export const filterTranslationKeys = (localeTranslation: any, keys: string[]) => keys.reduce((a, key) => ({
  ...a,
  ...Object.keys(localeTranslation).filter((k: string) => `${k}`.startsWith(`${key}.`)).reduce((acc, k) => ({ ...acc, [k]: localeTranslation[k] }), {}),
}),
{},
);

export module DotNotation {
  export type Input = Record<string, any> | null | undefined | any;

  export type Output<V = any, K extends keyof V = keyof V> = { [P in K]?: V[K] };

  export type T = <I = Input>(input: I, preserveArrays?: boolean, parentKey?: string) => Output<I>;
}

export const toDotNotation: DotNotation.T = (input, preserveArrays, parentKey) => Object.keys(input || {}).reduce((acc, key) => {
  const value = (input as any)[key];
  const outputKey = parentKey ? `${parentKey}.${key}` : `${key}`;

  if (preserveArrays && Array.isArray(value)) return ({ ...acc, [outputKey]: value.map(v => toDotNotation(v, preserveArrays)) });

  if (value && typeof value === 'object') return ({ ...acc, ...toDotNotation(value, preserveArrays, outputKey) });

  return ({ ...acc, [outputKey]: value });
}, {});