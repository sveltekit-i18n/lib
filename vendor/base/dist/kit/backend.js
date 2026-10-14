import { logger } from '../logger.js';
import { matchLocale, routePrefix, textDirection, withoutBasePath } from '../utils.js';
export const serverHalf = ({ create, negotiate, locales, basePath, canonical, handOver }) => {
    const answer = (event) => negotiate(event, event.request.headers.get('accept-language'));
    // The instance each page render loaded, under the payload it returned:
    // SvelteKit hands that very object to the universal load of the same
    // request.
    const built = new WeakMap();
    let warned = false;
    // A base path SvelteKit strips and `basePath` does not keeps every
    // route-scoped loader from matching, silently. Here, on the server only, so
    // the matcher stays out of the browser bundle. SvelteKit matched the route
    // by the canonical pathname of a translated one.
    const check = (event, pathname) => {
        if (warned)
            return;
        const available = locales();
        const found = routePrefix(pathname, event.route.id);
        if (!found)
            return;
        const segments = found.split('/');
        const last = segments[segments.length - 1].toLowerCase();
        // A locale segment in front of the route is a `reroute` that strips it,
        // spelled in the URL as a language (`en`) or a region (`en-gb`) of one.
        const isLocale = matchLocale(last, available) !== undefined;
        const prefix = isLocale ? segments.slice(0, -1).join('/') : found;
        if (!prefix || withoutBasePath(prefix, basePath) === '/')
            return;
        warned = true;
        logger.warn(`'${prefix}' precedes the route SvelteKit matched. If it is kit.paths.base, set basePath: '${prefix}'.`);
    };
    return {
        handle: ({ event, resolve }) => {
            let lang;
            // Negotiated only for a chunk that asks for it, so a data request never
            // negotiates here; a function replacement is inserted as it is.
            const negotiated = () => {
                if (lang === undefined) {
                    check(event, canonical(event.url));
                    lang = answer(event).locale ?? '';
                }
                return lang;
            };
            let filled = false;
            // Only the `<html>` start tag is filled: the template writes it, while
            // the head and the body carry the app's content, where a placeholder
            // stays as it is written.
            return Promise.resolve(resolve(event, {
                transformPageChunk: ({ html }) => {
                    if (filled)
                        return html;
                    filled = true;
                    const start = html.search(/<html[\s>]/i);
                    const end = start === -1 ? -1 : html.indexOf('>', start) + 1;
                    if (end < 1)
                        return html;
                    const tag = html.slice(start, end)
                        .replaceAll('%lang%', negotiated)
                        .replaceAll('%dir%', () => textDirection(negotiated()));
                    return html.slice(0, start) + tag + html.slice(end);
                },
            }));
        },
        load: async (event) => {
            // Read before anything returns: SvelteKit re-runs a load on a
            // navigation only for what it read.
            const route = canonical(event.url);
            check(event, route);
            const { locale, preferred } = answer(event);
            if (event.isDataRequest)
                return { i18n: { locale, route: withoutBasePath(route, basePath) } };
            const i18n = create();
            await (locale ? i18n.loadTranslations(locale, route) : i18n.setRoute(route));
            const payload = { ...i18n.snapshot({ records: true }), ...(preferred ? { preferred: true } : {}) };
            if (handOver())
                built.set(payload, i18n);
            return { i18n: payload };
        },
        // Once, so a payload an app keeps and returns again shares no instance.
        take: (payload) => {
            if (!payload)
                return undefined;
            const i18n = built.get(payload);
            built.delete(payload);
            return i18n;
        },
    };
};
