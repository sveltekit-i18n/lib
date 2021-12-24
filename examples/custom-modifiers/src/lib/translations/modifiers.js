const findOption = (options, key, defaultValue) => (options.find((option) => option.key === key) || {}).value || defaultValue;

export const date = (value, options, defaultValue = '', locale = '') => (
  locale && new Intl.DateTimeFormat(locale, {
    dateStyle: findOption(options, 'dateStyle', 'medium'),
    timeStyle: findOption(options, 'timeStyle', 'short')
  }).format(+value || +defaultValue)
);

export const ago = (value, options, defaultValue = '', locale = '') => (
  locale && new Intl.RelativeTimeFormat(locale, {
    numeric: findOption(options, 'numeric', 'auto'),
    style: findOption(options, 'style', 'long'),
  }).format(((+value || +defaultValue) - Date.now()) / (60 * 1000), 'minute')
);