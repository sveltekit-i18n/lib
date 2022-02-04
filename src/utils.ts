import { useDefault } from './parser/utils';

import type { ToDotNotation, FetchTranslations, Route, LoaderModule } from './types';

export { useDefault };

export const toDotNotation: ToDotNotation = (input, parentKey) => Object.keys(useDefault(input)).reduce((acc, key) => {
  const value = input[key];
  const outputKey = parentKey ? `${parentKey}.${key}` : `${key}`;

  if (value && typeof value === 'object') return ({ ...acc, ...toDotNotation(value, outputKey) });

  return ({ ...acc, [outputKey]: value });
}, {});

export const fetchTranslations: FetchTranslations = async (loaders) => {
  try {
    const data = await Promise.all(loaders.map(({ loader, ...rest }) => new Promise<LoaderModule & { data: any }>(async (res) => {
      let data;
      try {
        data = await loader();
      } catch (error) {
        console.error(`Failed to load translation. Verify your '${rest.locale}' > '${rest.key}' loader.`);
        console.error(error);
      }
      res({ loader, ...rest, data });
    })));

    return data.reduce<Record<string, any>>((acc, { key, data, locale }) => data ? ({
      ...acc,
      [locale]: toDotNotation({ ...useDefault<Record<any, any>>(acc[locale]), [key]: data }),
    }) : acc, {});
  } catch (error) {
    console.error(error);
  }

  return {};
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
