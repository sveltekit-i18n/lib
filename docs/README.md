# API Docs

[Config](#config)\
[Properties and methods](#instance-properties-and-methods)\
[Parsers](#parsers)


## Config

### `translations`?: __[Translations.T](https://github.com/sveltekit-i18n/base/blob/master/src/types.ts#L127)__
This property defines translations, which should be in place before `loaders` will trigger. It's useful for synchronous translations (e.g. locally defined language names which are same for all language mutations).

### `loaders`?: __[Loader.LoaderModule[]](https://github.com/sveltekit-i18n/base/blob/master/src/types.ts#L69-L74)__
You can use `loaders` to define your asyncronous translation load. All loaded data are stored so loader is triggered only once – in case there is no previous version of the translation. It can get refreshed according to `config.cache`.\
Each loader can include:

`locale`: __string__ – locale (e.g. `en`, `de`) which is this loader for.

`key`: __string__ – represents the translation namespace. This key is used as a translation prefix so it should be module-unique. You can access your translation later using `$t('key.yourTranslation')`. It shouldn't include `.` (dot) character.

`loader`:__() => Promise<Record<any, any>>__ – is a function returning a `Promise` with translation data. You can use it to load files locally, fetch it from your API etc...

`routes`?: __Array<string | RegExp>__ – can define routes this loader should be triggered for. You can use Regular expressions too. For example `[/\/.ome/]` will be triggered for `/home` and `/rome` route as well (but still only once). Leave this `undefined` in case you want to load this module with any route (useful for common translations).

### `initLocale`?: __string__
If you set this property, translations will be initialized immediately using this locale.

### `fallbackLocale`?: __string__
If you set this property, translations are automatically loaded not for current `$locale` only, but for this locale as well. In case there is no translation for current `$locale`, fallback locale translation is used instead of translation key placeholder. This is also used as a fallback when unknown locale is set.

Note that it's not recommended to use this property if you don't really need it. It may affect your data load.

### `fallbackValue`?: __any__
By default, translation key is returned in case no translation is found for given translation key. For example, `$t('unknown.key')` will result in `'unknown.key'` output. You can set this output value using this config prop.

### `cache`?: __number__
When you are running your app on Node.js server, translations are loaded only once during the SSR. This property allows you to setup a refresh period in milliseconds when your translations are refetched on the server. The default value is `86400000` (24 hours).

Tip: You can set to `Number.POSITIVE_INFINITY` to disable server-side refreshing.

### `log.level`?: __'error' | 'warn' | 'danger'__
You can manage log level using this property (default: `'warn'`).

### `log.prefix`?: __string__
You can prefix output logs using this property (default: `'[i18n]: '`).

### `log.logger`?: __[Logger.T](https://github.com/sveltekit-i18n/base/blob/b488f34b2c160b62943968929c9e6e1ee642c5e8/src/types.ts#L20-L22)__
You can setup your custom logger using this property (default: `console`).

### `parserOptions`?: __{ modifierDefaults?: Modifier.Defaults, customModifiers?: Modifier.CustomModifiers }__
This property includes configuration related to `@sveltekit-i18n/parser-default`.

Read more about `parserOptions` [here](https://github.com/sveltekit-i18n/parsers/tree/master/parser-default#options).


## Instance properties and methods

Each `sveltekit-i18n` instance includes all `@sveltekit-i18n/base` properties and methods described [here](https://github.com/sveltekit-i18n/base/blob/master/docs#instance-methods-and-properties).


## Parsers

`sveltekit-i18n` library uses `@sveltekit-i18n/parser-default` by default. You can find more [here](https://github.com/sveltekit-i18n/parsers/tree/master/parser-default#readme), including the message format syntax.

In case `@sveltekit-i18n/parser-default` syntax does not fit your needs, feel free to use standalone `@sveltekit-i18n/base` together with a [parser of your choice](https://github.com/sveltekit-i18n/parsers#readme) (or create your own!).

See parsers in [Examples](https://github.com/sveltekit-i18n/lib/tree/master/examples#parsers) for more information.
