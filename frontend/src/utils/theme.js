// ── Theme utility ─────────────────────────────────────────────────────────────
export const THEMES = { DARK: 'dark', LIGHT: 'light' };

export function getStoredTheme() {
  return localStorage.getItem('ir-theme') || THEMES.DARK;
}

export function applyTheme(theme) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  localStorage.setItem('ir-theme', theme);
}
