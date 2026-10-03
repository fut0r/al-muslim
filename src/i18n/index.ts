import { useMemo } from 'react';
import { useSettings, type Language } from '@/stores/settings';
import { ar } from './ar';
import { en, type Dictionary } from './en';

/** All dotted paths to string values in the dictionary, e.g. "home.nextPrayer". */
type StringPaths<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : T[K] extends readonly unknown[]
      ? never
      : StringPaths<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type TranslationKey = StringPaths<Dictionary>;
export type Translate = (key: TranslationKey, params?: Record<string, string | number>) => string;

const dictionaries: Record<Language, Dictionary> = { en, ar };

function lookup(dictionary: Dictionary, key: string): string | undefined {
  let node: unknown = dictionary;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

export function createTranslate(language: Language): Translate {
  const dictionary = dictionaries[language];
  return (key, params) => {
    const template = lookup(dictionary, key) ?? lookup(en, key) ?? key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      Object.hasOwn(params, name) ? String(params[name]) : match,
    );
  };
}

export interface I18n {
  language: Language;
  direction: 'ltr' | 'rtl';
  /**
   * BCP 47 tag for Intl formatting. Always the Gregorian calendar and Western
   * digits, so dates and times read the same way across the whole app.
   */
  locale: string;
  dictionary: Dictionary;
  t: Translate;
}

export function directionOf(language: Language): 'ltr' | 'rtl' {
  return language === 'ar' ? 'rtl' : 'ltr';
}

export function createI18n(language: Language): I18n {
  return {
    language,
    direction: directionOf(language),
    locale: `${language}-u-ca-gregory-nu-latn`,
    dictionary: dictionaries[language],
    t: createTranslate(language),
  };
}

export function useI18n(): I18n {
  const { language } = useSettings();
  return useMemo(() => createI18n(language), [language]);
}
