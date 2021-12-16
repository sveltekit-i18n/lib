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
      text: 'Dokumentace je k přečtení na <a href="{{link}}">kit.svelte.dev</a>'
    }
  },
})