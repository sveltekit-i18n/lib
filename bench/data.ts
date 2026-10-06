// The inputs the rows share, in the dimensions the family's benchmarks share:
// 10,000 keys in namespaces of 20, the shape most apps load.

export type Table = Record<string, Record<string, string>>;

export type LoaderModule = { locale: string; namespace: string; loader: () => Promise<Record<string, string>> };

export const log = { level: 'error' } as const;

/** A message without parameters, and one with a placeholder, as an app writes them. */
export const plain = (index: number) => `Welcome back, visitor ${index}.`;
export const placeholder = (index: number) => `Hello, {{name}}, visitor ${index}.`;

/**
 * `keys` messages in namespaces of 20, the even ones plain and the odd ones
 * with a placeholder. Built from JSON, so flat, as a catalogue delivers them.
 */
export const table = (keys: number): Table => JSON.parse(JSON.stringify(Object.fromEntries(Array.from({ length: Math.ceil(keys / 20) }, (_, namespace) => [
  `ns${namespace}`,
  Object.fromEntries(Array.from({ length: Math.min(20, keys - namespace * 20) }, (_, i) => {
    const index = namespace * 20 + i;

    return [`k${index}`, index % 2 ? placeholder(index) : plain(index)];
  })),
]))));

/** The key of message `index` of `table()`, as `t` reads it. */
export const key = (index: number) => `ns${Math.floor(index / 20)}.k${index}`;

/** One loader per namespace of `data`, in each of `locales`. */
export const loaders = (data: Table, locales: readonly string[] = ['en']): LoaderModule[] => locales.flatMap((locale) => Object.keys(data).map((namespace) => ({
  locale,
  namespace,
  loader: () => Promise.resolve(data[namespace]),
})));

/** A page render's server event, as SvelteKit hands it to the root layout's server load. */
export const serverEvent = () => ({
  url: new URL('https://x.test/'),
  params: {},
  route: { id: '/' },
  isDataRequest: false,
  cookies: { get: () => undefined },
  request: new Request('https://x.test/', { headers: { 'accept-language': 'cs,en;q=0.8' } }),
});
