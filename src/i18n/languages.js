// Languages the UI can be displayed in. Add an entry here plus a matching
// `src/i18n/locales/<code>.json` file to enable a new language - the
// LanguageSwitcher component picks this list up automatically.
export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" }
];

export const DEFAULT_LANGUAGE = "en";

export function getLanguageDirection(code) {
  const language = SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
  return language?.dir || "ltr";
}
