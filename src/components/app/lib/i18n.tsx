import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { getDict, translate, type DictKey, type Lang } from '../../../lib/i18n';

export type { Lang } from '../../../lib/i18n';

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('lang');
      if (stored === 'es' || stored === 'en') return stored;
    }
    if (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('es')) {
      return 'es';
    }
    return 'en';
  });

  const value = useMemo<I18nValue>(() => {
    const dict = getDict(lang);
    return {
      lang,
      setLang: (l: Lang) => {
        setLangState(l);
        localStorage.setItem('lang', l);
      },
      t: (key: string, vars?: Record<string, string | number>) =>
        translate(dict, key as DictKey, vars),
    };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n debe usarse dentro de I18nProvider');
  return ctx;
}