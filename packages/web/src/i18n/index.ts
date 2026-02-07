/**
 * Task 4.5: i18n provision — message keys and locale structure. English and Hindi.
 */
import en from './en';
import hi from './hi';

const LOCALE_KEY = 'lp-locale';

export type Locale = 'en' | 'hi';
const messages: Record<Locale, Record<string, string>> = { en, hi };

function getStoredLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  const v = localStorage.getItem(LOCALE_KEY);
  if (v === 'en' || v === 'hi') return v;
  return 'en';
}

let currentLocale: Locale = getStoredLocale();

export function setLocale(locale: Locale): void {
  currentLocale = locale;
  if (typeof window !== 'undefined') localStorage.setItem(LOCALE_KEY, locale);
}

export function getLocale(): Locale {
  return currentLocale;
}

/** Call once at app init to sync in-memory locale with stored value. */
export function initLocale(): void {
  currentLocale = getStoredLocale();
}

export function t(key: string): string {
  const localeMessages = messages[currentLocale];
  return localeMessages?.[key] ?? key;
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDateIndia(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}
