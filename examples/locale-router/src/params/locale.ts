import { isLocale, type Locale } from '$lib/locale';

// A type guard, so `params.lang` is typed as a `Locale` in the routes.
export const match = (param: string): param is Locale => isLocale(param);
