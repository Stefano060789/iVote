// Languages the UI can be displayed in. Add an entry here plus a matching
// `src/i18n/locales/<code>.json` file to enable a new language - the
// LanguageSwitcher component picks this list up automatically.
export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "ar", label: "العربية", dir: "rtl" },
  { code: "pt", label: "Português" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "nl", label: "Nederlands" },
  { code: "pl", label: "Polski" }
];

export const DEFAULT_LANGUAGE = "en";

export function getLanguageDirection(code) {
  const language = SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
  return language?.dir || "ltr";
}
