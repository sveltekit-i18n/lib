// The shape of the artifact a generator writes: a global script, with no
// top-level import or export.

interface TranslationSchema {
  'home.title': never;
  'home.greeting': { name: string };
}

declare namespace SvelteKitI18n {
  interface Register {
    schema: TranslationSchema;
  }
}
