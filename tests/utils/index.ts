export const filterTranslationKeys = (localeTranslation: any, keys: string[]) => keys.reduce((a, key) => ({
  ...a,
  ...Object.keys(localeTranslation).filter((k:string) => `${k}`.startsWith(`${key}.`)).reduce((acc, k) => ({ ...acc, [k]: localeTranslation[k] }), {}),
}),
{},
);