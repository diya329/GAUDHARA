import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, SupportedLanguage, Translations } from './translations';

export interface LanguageOption {
  code: SupportedLanguage;
  label: string;
  name: string;
  native: string;
  nativeName: string;
}

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: Translations;
  languages: LanguageOption[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = 'gaudhara_preferred_language';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>('en');

  useEffect(() => {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as SupportedLanguage;
    if (saved && translations[saved]) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  };

  const languages: LanguageOption[] = [
    { code: 'en', label: 'English', name: 'English', native: 'English', nativeName: 'English' },
    { code: 'hi', label: 'Hindi', name: 'Hindi', native: 'हिन्दी', nativeName: 'हिन्दी' },
    { code: 'as', label: 'Assamese', name: 'Assamese', native: 'অসমীয়া', nativeName: 'অসমীয়া' },
    { code: 'pa', label: 'Punjabi', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', nativeName: 'ਪੰਜਾਬੀ' },
    { code: 'gu', label: 'Gujarati', name: 'Gujarati', native: 'ગુજરાતી', nativeName: 'ગુજરાતી' },
    { code: 'mr', label: 'Marathi', name: 'Marathi', native: 'मराठी', nativeName: 'मराठी' },
    { code: 'bn', label: 'Bengali', name: 'Bengali', native: 'বাংলা', nativeName: 'বাংলা' },
    { code: 'ta', label: 'Tamil', name: 'Tamil', native: 'தமிழ்', nativeName: 'தமிழ்' },
  ];

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t: translations[language],
        languages
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
