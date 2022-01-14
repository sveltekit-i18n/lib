# API Docs

[Config](#config)\
[Properties and methods](#instance-methods-and-properties)\
[Translations](#translations)


## Config

### `translations`?: __{ [locale: string]: Record<string, any> }__
This parameter defines translations, which should be in place before `loads` will trigger. It's useful for synchronous translations (e.g. locally defined language names).

### `loaders`?: __Array<{ locale: string; key: string; loader: () => Promise<Record<any, any>> }>__
You can use `loaders` to define your asyncronous translation load. All loaded data are stored so loader is triggered only once – in case there is no previous version of the translation.
Each loader can include:

`locale`: __string__ – locale (e.g. `en`, `de`) which is this loader for.

`key`: __string__ – represents the translation module. This key is used as a translation prefix so it should be module-unique. You can access your translation later using `$t('key.yourTranslation')`. It shouldn't include `.` (dot) character.

`loader`:__() => Promise<Record<any, any>> | Record<any, any>__ – is a function returning a `Promise` with translation data, or translation data itself. You can use it to load files locally, fetch it from your API etc...

`routes`?: __Array<string | RegExp>__ – can define routes this loader should be triggered for. You can use Regular expressions too. For example `[/\/.ome/]` will be triggered for `/home` and `/rome` route as well (but still only once). Leave this `undefined` in case you want to load this module with any route (useful for common translations).

### `initLocale`?: __string__
If you set this parameter, translations will be initialized immediately using this locale.

### `fallbackLocale`?: __string__
If you set this parameter, translations are automatically loaded not for current `$locale` only, but for this locale as well. In case there is no translation for current `$locale`, fallback locale translation is used instead of translation key placeholder.

NOTE: It's not recommended to use this parameter if you don't really need it. It may affect your data load.

### `customModifiers`?: __Record<string, (value: string, options: Array<{ key: string; value: string; }>, defaultValue?: string, locale?: string) => string>__
You can use this parameter to include your own set of modifiers.

For example custom modifier `eqAbs`...
```typescript
{
  eqAbs: (value, options, defaultValue, locale) => options.find(({ key }) => Math.abs(key) === Math.abs(value))?.value || defaultValue
}

```

...can be used in the definitions like this:

```hbs
{{placeholder:eqAbs; key1:value1; key2:value2; default:defaultValue;}}
```
Read more about [Modifiers](#modifiers).


## Instance methods and properties

Each `sveltekit-i18n` instance includes these properties and methods:

### `loading`: __Readable\<boolean> & { toPromise: () => Promise<void[]>; get: () => boolean; }__ 
This readable store indicates wheter translations are loading or not. It can be converted to promise using `.toPromise()` method.

### `initialized`: __Readable\<boolean>__
This readable store returns `true` after first translation successfully initialized.

### `locale`: __Writable\<string> & { get: () => string }__
You can obtain and set current locale using this writable store.

### `locales`: __Readable<string[]>__
Readable store, containing all instance locales.

### `translations`: __Readable\<{ [locale: string]: { [key: string]: string; } }> & { get: () => string; }__
Readable store, containing all loaded translations in dot-notation format.

### `t`: __Readable<(key: string, vars?: Record<any, any>) => string> & { get: (key: string; vars?: Record<any, any>) => string; }__
This readable store returns a function you can use to obtain your (previously loaded) translations for given translation key and interpolation variables (you can use it like `$t('my.key', { variable: 'value' })` in Svelte files). You can also use `t.get` method to get the translation (e.g. `t.get('my.key', { variable: 'value' })`), which is handy in `.js` (or `.ts`) files.

### `l`: __Readable<(locale: string, key: string, vars?: Record<any, any>) => string> & { get: (locale: string, key: string, vars?: Record<any, any>) => string; }__
This readable store returns a function you can use to obtain your (previously loaded) translations for given locale, translation key and interpolation variables (you can use it like `$l('en', 'my.key', { variable: 'value' })` in Svelte files). You can also use `l.get` method to get the translation (e.g. `l.get('en', 'my.key', { variable: 'value' })`), which is handy in `.js` (or `.ts`) files.

### `loadConfig`: __(config: Config) => Promise\<void>__
You can load a new `config` using this method.

### `setLocale`: __(locale: string) => Promise<void>__
This method sets a locale safely. It prevents uppercase characters and doesn't set it in case the locale does not exist in `loaders` config or `translations` store.

### `setRoute`: __(route: string) => Promise<void>__
Sets a new route value, if given value is not equal to current value.

### `getTranslationProps`: __(locale: string, route?: string) => Promise\<Array<{ [locale: string]: Record<string, string>; }, Record<string, string[]>>>__
According to input props (`locale` and `route`), this method triggers `loaders`, which haven't been already triggered, and returns appropriate `translations` and `keys`. This output can be used later as input parameters of `addTranslations` method.

### `addTranslations`: __(translations?: { [locale: string]: Record<string, any>; }, keys?: Record<string, string[]> | undefined) => void__
This method allows you to store loaded translations in `translations` readable.

`translations` – this parameter should contain an object, containing translations objects for locales you want to add.

For example: 
```jsonc
{
  "en": {
    "common": {
      "title": "text"
    }
  }
}
```

or with dot notation:
```json
{
  "en": {
    "common.text": "Enghlish text"
  },
  "es": {
    "common.text": "Spanish text"
  }
}
```

`keys` – this parameter should contain corresponding keys from your `loaders` config, so the translation is not loaded duplicitly in future. If `keys` are not provided, translation keys are taken automatically from the `translations` parameter as the first key (or value before the first dot in dot notation) under every locale.

For example, for the previous case it would be:
```json
{
  "en": ["common"],
  "es": ["common"]
}
```

### `loadTranslations`: __(locale: string, route?: string) => Promise\<void>__
This method encapsulates `setLocale` and `setRoute` methods. According on changes, `getTranslationProps` and `addTranslations` methods are called and new translations are stored in `translations` readable.


## Translations

Your translations should be formatted as standard objects or dot-notated objects containing strings as translation values. You can use `placehoders` and `modifiers` for interpolation.

Example:
```jsonc
{
  "prop": "Some value",
  "module": {
    "placeholder": "Title with {{placeholder}}.",
    "placeholder_with_default_value": "{{placeholder; default:Default value;}}.",
    "modifier": "{{gender; female:She; male:He;}} has a dog.",
    "combined": "You have {{number:gt; 0:{{number}} new {{number; 1:message; default:messages;}}!; default:no messages.;}}"
  }
} 
```

### Placeholders

Placeholders work as a connection between static translations and dynamic content. They are usually replaced by dynamic values, which are same for all language mutations.

Placeholder notation looks like this:
```hbs
{{placeholder}}

<!-- or: -->
{{placeholder;}}
```

You can also use `default` value. This value is used in case there is no appropriate value in translation payload. 

```hbs
{{placeholder; default:This is default value;}}
```

### Modifiers
Modifiers don't represent the payload value directly, but they can use it for further calculations. Currently, these modifiers are in place:

`eq` – input value is equal to the value in your definition (string comparison, case insensitive).\
`ne` – input value is not equal to the value in your definition (string comparison, case insensitive).\
`lt` – input value is lower than the value in your definition.\
`lte` – input value is lower than or equal to the value in your definition.\
`gt` – input value is greater than the value in your definition.\
`gte` – input value is greater than or equal to the value in your definition.\
`number` – input value is converted to locale formatted number string.\
`date` – input value is converted to locale date string.\
`ago` – input value is converted to locale relative date string.

Each modifier returns a string value based on these input parameters:

1) input value from payload (placeholder value)
2) parsed interpolation options from the definition
3) default value
4) current locale

When placeholder value is not matched and you don't specify the `default` value, modifier returns an empty string.

You can include your own modifiers in the [Config](#custommodifiers-recordstring-value-string-options-arraykey-string-value-string-defaultvalue-string--string)! See [Examples](https://github.com/jarda-svoboda/sveltekit-i18n/tree/master/examples).


Modifier definition looks like this:
```hbs
{{placeholder:modifier; placeholderVal1:Interpolation value 1; placeholderVal2:Interpolation value 2; ... ; default:Default value;}}
```

In case you don't specify the modifier, but interpolation options are set, `eq` modifier is used by default:

```hbs
<!-- this modifier definition uses `eq` modifier by default -->
{{placeholder; placeholder_value:Interpolation value;}}
```

You are allowed to use nested `placeholders` and `modifiers` within your modifier definition. 


__NOTE: `;`, `:`, `{` and `}` characters are used as placeholder identifiers and separators, so you shouldn't use them within your definition keys and values. You should use their escaped form insead (`\\;`, `\\:`, `\\{` or `\\}`).__
