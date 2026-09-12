import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import zh from "./locales/zh.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import ar from "./locales/ar.json";
import pt from "./locales/pt.json";
import de from "./locales/de.json";
import it from "./locales/it.json";
import nl from "./locales/nl.json";
import pl from "./locales/pl.json";
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, getLanguageDirection } from "./languages";

const resources = {
  en: { translation: en },
  zh: { translation: zh },
  es: { translation: es },
  fr: { translation: fr },
  ar: { translation: ar },
  pt: { translation: pt },
  de: { translation: de },
  it: { translation: it },
  nl: { translation: nl },
  pl: { translation: pl }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES.map((lang) => lang.code),
    interpolation: { escapeValue: false },
    detection: {
      // Remembers the visitor's choice; otherwise falls back to their browser
      // language if we support it, then to DEFAULT_LANGUAGE.
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "godwit_lang"
    }
  });

// Keep <html lang> and dir="rtl"/"ltr" in sync so Arabic (and any future
// right-to-left language) lays out correctly without a page reload.
function applyDocumentDirection(language) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = language;
  document.documentElement.dir = getLanguageDirection(language);
}

i18n.on("languageChanged", applyDocumentDirection);
if (i18n.resolvedLanguage) applyDocumentDirection(i18n.resolvedLanguage);

export default i18n;
