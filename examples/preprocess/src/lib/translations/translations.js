import lang from './lang.json';

export default ({
  en: {
    lang,
    content: [
      {
        title: 'Welcome to SvelteKit! :)',
        text: 'Visit <a href="{{link}}">kit.svelte.dev</a> to read the documentation',
        something: { else: ':)' },
      },
      {
        title: 'Some additional info...',
        text: ':) :) :)',
        something: { else: ':O' },
      },
    ],
  },
  cs: {
    lang,
    content: [
      {
        title: 'Vítejte ve SvelteKit! :)',
        text: 'Dokumentace je k přečtení na <a href="{{link}}">kit.svelte.dev</a>',
        something: { else: ':)' },
      },
      {
        title: 'Nějaké další informace...',
        text: ':) :) :)',
        something: { else: ':O' },
      },
    ],
  },
});