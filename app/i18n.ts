import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { Platform } from "react-native";
import en from "./locales/en";
import fr from "./locales/fr";

const resources = {
  en: { translation: en },
  fr: { translation: fr },
} as const;

const SUPPORTED_LANGUAGES = ["fr", "en"] as const;
const LANGUAGE_STORAGE_KEY = "app_language";
const DEFAULT_LANGUAGE: "fr" | "en" = "fr";

type AppLanguage = "fr" | "en";

const normalizeLanguage = (value?: string | null): AppLanguage => {
  const code = value?.toLowerCase().slice(0, 2);
  return SUPPORTED_LANGUAGES.includes(code as AppLanguage)
    ? (code as AppLanguage)
    : DEFAULT_LANGUAGE;
};

const getDeviceLanguage = (): AppLanguage => {
  try {
    if (Platform.OS === "web") {
      const browserLanguage =
        typeof navigator !== "undefined" ? navigator.language : null;
      return normalizeLanguage(browserLanguage);
    }

    const RNLocalize = require("react-native-localize");
    const locale = RNLocalize?.getLocales?.()?.[0]?.languageCode ?? null;
    return normalizeLanguage(locale);
  } catch {
    return DEFAULT_LANGUAGE;
  }
};

const getAsyncStorage = () => {
  try {
    const module = require("@react-native-async-storage/async-storage");
    const storage = module?.default ?? module;
    if (
      storage &&
      typeof storage.getItem === "function" &&
      typeof storage.setItem === "function"
    ) {
      return storage;
    }
    return null;
  } catch {
    return null;
  }
};

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: getDeviceLanguage(),
    fallbackLng: DEFAULT_LANGUAGE,
    compatibilityJSON: "v4",
    showSupportNotice: false,
    interpolation: { escapeValue: false },
  });
}

const readSavedLanguage = async (): Promise<AppLanguage | null> => {
  try {
    if (Platform.OS === "web" && typeof globalThis.localStorage !== "undefined") {
      const value = globalThis.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      return value === "fr" || value === "en" ? value : null;
    }

    const storage = getAsyncStorage();
    if (!storage) {
      return null;
    }

    const value = await storage.getItem(LANGUAGE_STORAGE_KEY);
    return value === "fr" || value === "en" ? value : null;
  } catch {
    return null;
  }
};

const saveLanguage = async (language: AppLanguage) => {
  try {
    if (Platform.OS === "web" && typeof globalThis.localStorage !== "undefined") {
      globalThis.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      return;
    }

    const storage = getAsyncStorage();
    if (!storage) {
      return;
    }

    await storage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Ignore persistence errors to avoid blocking language change.
  }
};

void readSavedLanguage().then((saved) => {
  if (saved && saved !== i18n.language) {
    void i18n.changeLanguage(saved);
  }
});

export const setAppLanguage = async (language: AppLanguage) => {
  await saveLanguage(language);
  await i18n.changeLanguage(language);
};

export default i18n;
