import type { ModifierOption } from './types';

export const useDefault = <T = any>(value: any, def:any = {}): T => value || def;

export const findOption = <T = string>(options: ModifierOption[], key: string, defaultValue?: string): T => ((options.find((option) => option.key === key))?.value || defaultValue) as any;
