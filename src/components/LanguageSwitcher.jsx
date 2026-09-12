import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES } from "../i18n/languages";

// Renders as a plain <select> so it works without JS-heavy dropdown logic and
// is fully keyboard/screen-reader accessible out of the box. Automatically
// grows to list every language registered in `src/i18n/languages.js`.
export default function LanguageSwitcher({ className = "" }) {
  const { i18n } = useTranslation();

  if (SUPPORTED_LANGUAGES.length < 2) {
    // Nothing to switch to yet - render nothing rather than a useless
    // one-option dropdown. Remove this guard once a second language ships.
    return null;
  }

  return (
    <select
      className={`language-switcher ${className}`}
      value={i18n.resolvedLanguage || i18n.language}
      onChange={(event) => i18n.changeLanguage(event.target.value)}
      aria-label="Language"
    >
      {SUPPORTED_LANGUAGES.map((lang) => (
        <option key={lang.code} value={lang.code}>{lang.label}</option>
      ))}
    </select>
  );
}
