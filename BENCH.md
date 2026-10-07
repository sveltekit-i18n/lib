# Benchmark

What `pnpm run bench` measured on `sveltekit-i18n` 3.4.1, written by the release that published it. A pull request compares its branch with its base in a comment; this file keeps the figures of each release beside its code.

Node v24.21.0, linux x64; times and heap readings are medians of 11 processes, a time each the median of its rounds; a spread leaves out the lowest and the highest quarter of them, rounded down. Sizes include the core and the parser, and leave out `svelte`, which is the app's.
Dependencies: @sveltekit-i18n/base 3.3.2, @sveltekit-i18n/parser-curly 3.2.2.

## Counts

Parsers built and checker instantiations: the same on every machine. A pull request that grows one fails its benchmark job unless it carries the `bench-accepted` label.

| Row | Value |
| --- | ---: |
| parsers built, new I18n | 1 parsers |
| parsers built, loadConfig | 1 parsers |
| parsers built, defineI18n and 100 page renders through its server and universal loads | 1 parsers |
| instantiations, new I18n with a schema (1,000 flat keys) | 4,023 instantiations |
| instantiations, new I18n with a schema (10,000 flat keys) | 40,023 instantiations |
| instantiations, new I18n with a schema (10,000 keys in namespaces) | 160,023 instantiations |
| instantiations, t with a payload (1,000 flat keys) | 106 instantiations |
| instantiations, t without a payload (1,000 flat keys) | 82 instantiations |
| instantiations, l with a payload (1,000 flat keys) | 106 instantiations |
| instantiations, t with a payload (10,000 flat keys) | 106 instantiations |
| instantiations, t without a payload (10,000 flat keys) | 82 instantiations |
| instantiations, l with a payload (10,000 flat keys) | 106 instantiations |
| instantiations, t with a payload (10,000 keys in namespaces) | 106 instantiations |
| instantiations, t without a payload (10,000 keys in namespaces) | 82 instantiations |
| instantiations, l with a payload (10,000 keys in namespaces) | 106 instantiations |

## Sizes

Bytes of a browser bundle: the same on every machine.

| Row | Value |
| --- | ---: |
| browser bundle of I18n from the entry, minified | 43,525 B |
| browser bundle of I18n from the entry, minified and gzipped | 15,572 B |
| browser bundle of defineI18n from /kit, minified | 50,082 B |
| browser bundle of defineI18n from /kit, minified and gzipped | 18,323 B |
| browser bundle of I18n from the entry, this package's code alone, minified | 412 B |
| browser bundle of I18n from the entry, this package's code alone, minified and gzipped | 270 B |
| browser bundle of defineI18n from /kit, this package's code alone, minified | 321 B |
| browser bundle of defineI18n from /kit, this package's code alone, minified and gzipped | 231 B |

## Times

Microseconds, of one machine at one time: compare them only with figures measured beside them.

| Row | Median | Spread |
| --- | ---: | --- |
| t, a hit (10,000 keys) | 1.12 µs | 1.01 µs to 1.25 µs |
| t, a hit with a placeholder (10,000 keys) | 1.86 µs | 1.85 µs to 2.12 µs |
| new I18n, a config of 10 loaders | 23.8 µs | 23.4 µs to 24.3 µs |
| loadConfig, a config of 10 loaders | 13.1 µs | 12.9 µs to 13.3 µs |
| defineI18n, a config of 10 loaders | 0.731 µs | 0.625 µs to 0.751 µs |

## Heap

Bytes of heap retained, read in a process of their own without V8's optimizing compilers: they move by a few bytes from process to process, differ from one Node version to another, and a reading near zero, on either side of it, means nothing retained.

| Row | Median | Spread |
| --- | ---: | --- |
| heap retained per instance built, loaded and dropped, from 1,500 to 4,500 instances | 0 B | 0 B to 0 B |
| heap retained per page render through the server and universal loads, from 1,500 to 4,500 renders | 0 B | 0 B to 0 B |
