'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SupportedLocale, getTranslations, isValidLocale, getBrowserLocale } from '@/lib/i18n';

interface I18nContextType {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string) => string;
  translations: Record<string, string>;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

interface I18nProviderProps {
  children: ReactNode;
  defaultLocale?: SupportedLocale;
}

export function I18nProvider({ children, defaultLocale }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<SupportedLocale>(defaultLocale || 'ko');
  const [translations, setTranslations] = useState<Record<string, string>>({});

  useEffect(() => {
    // Load locale from localStorage or browser
    const savedLocale = localStorage.getItem('locale');
    if (savedLocale && isValidLocale(savedLocale)) {
      setLocaleState(savedLocale);
    } else if (!defaultLocale) {
      setLocaleState(getBrowserLocale());
    }
  }, [defaultLocale]);

  useEffect(() => {
    setTranslations(getTranslations(locale));
  }, [locale]);

  const setLocale = (newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    localStorage.setItem('locale', newLocale);
  };

  const t = (key: string): string => {
    return translations[key] || key;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, translations }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

// Language selector component
export function LanguageSelector() {
  const { locale, setLocale } = useI18n();

  const languages = [
    { code: 'ko' as const, name: '한국어', flag: '🇰🇷' },
    { code: 'en' as const, name: 'English', flag: '🇺🇸' },
    { code: 'ja' as const, name: '日本語', flag: '🇯🇵' },
  ];

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value as SupportedLocale)}
      className="px-3 py-1.5 rounded border bg-background text-sm"
    >
      {languages.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.flag} {lang.name}
        </option>
      ))}
    </select>
  );
}
