# Locale domains

Each language at a domain of its own, from one app: `example.com` serves
English and German, `example.cz` Czech. The host gives the locale, and on
`example.com`, where English and German share it, the pathname does:
`/about` is English and `/de/ueber-uns` German, while `example.cz/o-nas` is
the Czech about page. A link to the other domain is all a language switch
takes.

Runs on `@sveltejs/adapter-node`, every page rendered per request: a page's
locale depends on the host it is requested at, which a prerendered file
cannot. A server `handle` sends a pathname of another host's locale to that
host.

## What to look at

| File | Why |
|---|---|
| [`src/lib/translations/index.ts`](./src/lib/translations/index.ts) | `localeDomains()` in the `domains` option: per origin, the locales its host serves, its own first — `localhost` and `cz.localhost` while `vite dev` runs. `translatePathnames()` beside it gives German the `/de` prefix and the Czech about page `/o-nas` |
| [`src/hooks.ts`](./src/hooks.ts) | `export { reroute }` — the universal hook that renders `example.cz/o-nas` from `src/routes/about` |
| [`src/hooks.server.ts`](./src/hooks.server.ts) | sends `example.com/o-nas` to `example.cz/o-nas`, and `example.cz/about` back to `example.com/about`, with a 308, then the i18n `handle` |
| [`src/routes/+layout.svelte`](./src/routes/+layout.svelte) | links through `localizeHref`, which names the other domain only where a link leaves this one; a switcher that links to each locale's page on its own host; `hreflang` alternates at the origins the map spells |
| [`src/routes/about/+page.svelte`](./src/routes/about/+page.svelte) | the host and the pathname requested, and what `delocalize` reads off them: the canonical path, the pathname's locale and the host's first |
| [`vite.config.ts`](./vite.config.ts) | no `paths.origin` and no prerendering, so each request keeps its own host; the dev server's port, which the development hosts name |

## One host per locale

A host the map lists renders its own locales alone, whatever the visitor's
`Accept-Language` asks for, and falls back to its first: `example.cz/nic` is
a Czech 404. A pathname of another host's locale is no page there, so
[`src/hooks.server.ts`](./src/hooks.server.ts) sends it where it belongs.
The target names the origin the map spells, never the request's.

A host the map does not list — `www.example.com`, a preview deployment, the
built app at `localhost:3000` — serves every locale, as an app without
`domains` does. There English and Czech share `/`, so the visitor's
`Accept-Language` picks between them, while `/o-nas` is Czech and `/de` German.

## In development

`vite dev` maps `http://localhost:5173` to English and German and
`http://cz.localhost:5173` to Czech: browsers resolve every `*.localhost`
name to the machine itself, and Vite serves it without `server.allowedHosts`.
The switcher's Czech link opens `cz.localhost:5173`. The map names port 5173,
so the dev server takes no other. Where a browser does not resolve
`cz.localhost`, an `/etc/hosts` entry does.

No StackBlitz link: a dev server inside a browser tab answers at a single
host, which the map does not list.

## Verified

Built and served with `node build`, asked with each host in the `Host`
header:

| URL | answer |
|---|---|
| `example.com/`, `example.com/about` | English, with an `Accept-Language` of `cs` too |
| `example.com/de`, `example.com/de/ueber-uns` | German |
| `example.cz/`, `example.cz/o-nas` | Czech, with an `Accept-Language` of `en` too |
| `example.com/o-nas` | 308 to `https://example.cz/o-nas` |
| `example.cz/about`, `example.cz/de/ueber-uns` | 308 to `https://example.com/about`, `https://example.com/de/ueber-uns` |
| `example.com/de/about` | 308 to `/de/ueber-uns` |
| `example.cz/nic`, `example.com/nic`, `example.com/de/nic` | 404 in Czech, English, German |

In a browser under `vite dev`, the links within a host navigate on the
client, and the switcher's link to the other host loads its page there.

## Typed keys

As in [`multi-page`](../multi-page#typed-keys): `@sveltekit-i18n/typegen` in
[`vite.config.ts`](./vite.config.ts) writes `src/i18n-schema.d.ts` from the
config's own loaders and registers it, so an unknown key or a payload its
message does not take is a type error. `localizeHref` and `delocalize`
complete `en`, `de` and `cs`. Run `vite dev` or `vite build` once before
`npm run check`.

## Run it

```bash
npm install
npm run dev -- --open
```

`npm run build` writes `build/`; `node build` serves it at `localhost:3000`,
a host the map does not list: English and Czech share `/` there, so the
switcher's `en` and `cs` lead to the same page, in the locale
`Accept-Language` picks. Name a listed host in the request to see it:

```bash
curl -H 'Host: example.cz' http://localhost:3000/o-nas
```
