import { I18n } from 'sveltekit-i18n';
import { defineI18n } from 'sveltekit-i18n/kit';

// No schema in the config: the registry types the instance, without a cast.
const i18n = new I18n({ initLocale: 'en' });

i18n.t('home.title');
i18n.t('home.greeting', { name: 'Ada' });

// @ts-expect-error an unknown key
i18n.t('home.nope');
// @ts-expect-error a missing payload
i18n.t('home.greeting');

// The wiring's instances are typed by it as well.
const { get } = defineI18n({ initLocale: 'en' });

get().t('home.greeting', { name: 'Ada' });

// @ts-expect-error an unknown key
get().t('home.nope');

// A closed schema the config states wins over the registry.
const explicit = new I18n({ schema: {} as { 'other.key': never } });

explicit.t('other.key');
// @ts-expect-error a registered key the stated schema does not know
explicit.t('home.title');

// `schema: {}` opts out: keys stay plain strings.
new I18n({ schema: {} }).t('any.key');
defineI18n({ schema: {} }).get().t('any.key');
