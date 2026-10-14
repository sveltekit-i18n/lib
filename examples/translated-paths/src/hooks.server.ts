import { redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit/hooks';

import { delocalize, handle as i18nHandle, localizePath } from '#lib/translations/index.js';

/**
 * `reroute` serves a page only at the pathname `localizePath` gives it, so
 * `/cs/about` — Czech by its prefix, but not the Czech about page's pathname —
 * would be a 404. This sends it to `/cs/o-nas` instead. The target depends on
 * the URL alone, so the redirect is permanent. A remote function's request
 * can carry the URL of the page that called it, so it is left alone.
 */
const localize: Handle = ({ event, resolve }) => {
  const { path, locale } = delocalize(event.url);

  if (locale !== undefined && !event.isRemoteRequest) {
    // SvelteKit drops a trailing slash before `handle` only from a pathname
    // a route matches, so the target leaves it out, as the default
    // `trailingSlash: 'never'` serves it (an app on `'always'` ends it with
    // one instead), and the pathnames are compared without it.
    const href = localizePath(path.replace(/^([^?#]+?)\/(?=[?#]|$)/, '$1'), locale);

    if (href.split(/[?#]/)[0].replace(/\/$/, '') !== event.url.pathname.replace(/\/$/, '')) {
      redirect(308, href);
    }
  }

  return resolve(event);
};

// The i18n `handle` fills `%lang%` and `%dir%` of the page `localize` lets
// through.
export const handle = sequence(localize, i18nHandle);
