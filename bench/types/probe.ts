import { I18n } from 'sveltekit-i18n';

type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

// Mapped types with an `as` clause: TypeScript instantiates the name type once
// per key each time it reads `keyof` of one, so a construction or a call that
// reads the whole key set shows in the instantiation count. A key starting
// with `0` takes no payload; `P` gives a schema of the same size new keys.
type Payload<K extends string> = K extends `0${string}` ? never : { name: string };
type Flat<N extends string, P extends string = 'k'> = { [K in N as `${P}${K}`]: Payload<K> };
type Namespaced<N extends string, P extends string = 'k'> = { [K in N as K extends `${infer A}${infer B}${infer C}` ? `ns${A}${B}.${P}${C}` : never]: Payload<K> };

// The first statement of each shape — a construction, or a call by its method
// and whether it passes a payload — instantiates what that shape needs once
// per subject; the second is the one measured, on a schema or on digits no
// earlier statement used, since the checker caches a conditional type by its
// arguments and every subject's payload reads them. `checker.ts` reads the
// subject and the shape from each statement, a construction's subject
// from the name it is bound to, an underscore leading that of the first.
const _flat1k = new I18n({ schema: {} as Flat<`${Digit}${Digit}${Digit}`, 'w'> });
const flat1k = new I18n({ schema: {} as Flat<`${Digit}${Digit}${Digit}`> });
const _flat10k = new I18n({ schema: {} as Flat<`${Digit}${Digit}${Digit}${Digit}`, 'w'> });
const flat10k = new I18n({ schema: {} as Flat<`${Digit}${Digit}${Digit}${Digit}`> });
const _namespaced10k = new I18n({ schema: {} as Namespaced<`${Digit}${Digit}${Digit}${Digit}`, 'w'> });
const namespaced10k = new I18n({ schema: {} as Namespaced<`${Digit}${Digit}${Digit}${Digit}`> });

flat1k.t('k999', { name: 'x' });
flat1k.t('k123', { name: 'x' });
flat1k.t('k099');
flat1k.t('k012');
flat1k.l('en', 'k888', { name: 'x' });
flat1k.l('en', 'k456', { name: 'x' });

flat10k.t('k9999', { name: 'x' });
flat10k.t('k1234', { name: 'x' });
flat10k.t('k0999');
flat10k.t('k0123');
flat10k.l('en', 'k8888', { name: 'x' });
flat10k.l('en', 'k4567', { name: 'x' });

namespaced10k.t('ns98.k76', { name: 'x' });
namespaced10k.t('ns23.k45', { name: 'x' });
namespaced10k.t('ns07.k65');
namespaced10k.t('ns02.k34');
namespaced10k.l('en', 'ns87.k65', { name: 'x' });
namespaced10k.l('en', 'ns56.k78', { name: 'x' });

// The schemas narrow: a key that takes a payload is refused without one. A
// block, so `checker.ts` measures none of it; were the schema lost, every call
// above would compile at a fraction of its count, and these would not.
{
  // @ts-expect-error
  flat1k.t('k777');
  // @ts-expect-error
  flat10k.t('k7777');
  // @ts-expect-error
  namespaced10k.t('ns77.k77');
  // @ts-expect-error
  flat1k.l('en', 'k777');
  // @ts-expect-error
  flat10k.l('en', 'k7777');
  // @ts-expect-error
  namespaced10k.l('en', 'ns77.k77');
}
