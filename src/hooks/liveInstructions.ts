import type { LangCode } from '../i18n';

export const LANGUAGE_NAME_EN: Record<LangCode, string> = {
  tr: 'Turkish',
  en: 'English',
  zh: 'Chinese',
};

export const LIVE_SYSTEM_INSTRUCTION = (native: LangCode, target: LangCode) => {
  const tgt = LANGUAGE_NAME_EN[target];
  const nat = LANGUAGE_NAME_EN[native];
  return `You are a friendly ${tgt} teacher for a ${nat} speaker. You speak both ${nat} and ${tgt}. Help the user practice their conversational ${tgt}. Correct their mistakes gently. Keep responses concise.`;
};
