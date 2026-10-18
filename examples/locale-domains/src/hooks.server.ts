import { redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit/hooks';

import { delocalize, handle as i18nHandle, localizeHref } from '#lib/translations/index.js';

/**
 * Sends a pathname to the host and the pathname its locale serves it at:
 * `example.com/o-nas`, the Czech about page, to `example.cz/o-nas`, and
 * `example.cz/about` back to `example.com/about`. A pathname that belongs to no
 * locale of its own belongs to its host's first. The target depends on the URL
 * alone, so the redirect is permanent. A remote function's request can carry
 * the URL of the page that called it, so it is left alone.
 */
const localize: Handle = ({ event, resolve }) => {
  if (!event.isRemoteRequest) {
    const { path, locale, domain } = delocalize(event.url);
    const target = locale ?? domain;

    // On a host the map does not list, a pathname of no locale has nowhere
    // to go, and stays.
    if (target !== undefined) {
      // SvelteKit drops a trailing slash before `handle` only from a pathname
      // a route matches, so the target leaves it out, as the default
      // `trailingSlash: 'never'` serves it (an app on `'always'` ends it with
      // one instead), and the pathnames are compared without it.
      const href = localizeHref(path.replace(/^([^?#]+?)\/(?=[?#]|$)/, '$1'), target, event.url);

      // An origin means another host: the map spells it, never the request.
      if (/^https?:/.test(href)) redirect(308, href, { external: true });
      if (href.replace(/[?#].*/s, '').replace(/\/$/, '') !== event.url.pathname.replace(/\/$/, '')) redirect(308, href);
    }
  }

  return resolve(event);
};

// The i18n `handle` fills `%lang%` and `%dir%` of the page `localize` lets
// through.
export const handle = sequence(localize, i18nHandle);
