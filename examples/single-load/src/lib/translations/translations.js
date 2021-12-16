import lang from './lang.json';

export default ({
  en: {
    lang,
    menu: {
      home: 'Home',
      about: 'About',
    },
    content: {
      title: 'Welcome to SvelteKit',
      info: 'You can now access all your language mutations using <code>{$l(LOCALE, TRANSLATION_KEY)}</code>:',
      text: 'Visit <a href="{{link}}">kit.svelte.dev</a> to read the documentation',
    },
  },
  cs: {
    lang,
    menu: {
      home: 'Domů',
      about: 'O nás'
    },
    content: {
      title: 'Vítejte ve SvelteKit',
      info: 'Nyní máte přístup ke všem jazykovým mutacím prostřednictvím <code>{$l(LOCALE, TRANSLATION_KEY)}</code>:',
      text: 'Dokumentace je k přečtení na <a href="{{link}}">kit.svelte.dev</a>'
    }
  },
})