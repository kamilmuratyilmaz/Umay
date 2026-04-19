import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { LangCode } from '../i18n';
import { t as tFn } from '../i18n';

const STORAGE_NATIVE = 'umay_native';
const STORAGE_TARGET = 'umay_target';

type Pair = { native: LangCode; target: LangCode };

type Ctx = {
  pair: Pair | null;
  setPair: (p: Pair) => void;
  resetPair: () => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [pair, setPairState] = useState<Pair | null>(() => {
    if (typeof window === 'undefined') return null;
    const n = localStorage.getItem(STORAGE_NATIVE) as LangCode | null;
    const t = localStorage.getItem(STORAGE_TARGET) as LangCode | null;
    if (n && t && n !== t) return { native: n, target: t };
    return null;
  });

  useEffect(() => {
    if (pair) {
      localStorage.setItem(STORAGE_NATIVE, pair.native);
      localStorage.setItem(STORAGE_TARGET, pair.target);
    }
  }, [pair]);

  useEffect(() => {
    document.documentElement.lang = pair?.native ?? 'tr';
  }, [pair?.native]);

  const setPair = (p: Pair) => setPairState(p);
  const resetPair = () => {
    localStorage.removeItem(STORAGE_NATIVE);
    localStorage.removeItem(STORAGE_TARGET);
    setPairState(null);
  };

  const t = (key: string) => tFn(pair?.native ?? 'tr', key);

  return (
    <LanguageContext.Provider value={{ pair, setPair, resetPair, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): Ctx {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
