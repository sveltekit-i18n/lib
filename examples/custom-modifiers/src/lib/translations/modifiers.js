const findOption = (options, key, defaultValue) => (options.find((option) => option.key === key) || {}).value || defaultValue;


export const currency = (value, options, defaultValue, locale) => new Intl.NumberFormat(locale, { style: 'currency', currency: findOption(options, 'currency', 'EUR') }).format(value || defaultValue)