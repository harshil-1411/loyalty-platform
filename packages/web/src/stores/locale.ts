import { create } from "zustand";
import * as i18n from "@/i18n";

export type Locale = i18n.Locale;

function applyLocale(locale: Locale) {
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale === "hi" ? "hi" : "en";
  }
}

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: i18n.getLocale(),
  setLocale: (locale) => {
    i18n.setLocale(locale);
    applyLocale(locale);
    set({ locale });
  },
}));
