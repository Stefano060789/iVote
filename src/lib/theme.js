export const THEME_STORAGE_KEY = "godwit-theme";
export const THEME_EVENT = "godwit-theme-change";

export function readTheme() {
  return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
}

export function applyTheme(theme) {
  const nextTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = nextTheme;
  window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: nextTheme }));
  return nextTheme;
}
