import { STRINGS, type LangCode } from './strings';
export type { LangCode } from './strings';
export { LANG_META } from './strings';

export function t(lang: LangCode, key: string): string {
  return STRINGS[lang][key] ?? STRINGS.en[key] ?? key;
}
