import { icon } from './ui.js';

export const THEME_KEY = 'taskflow.theme.v1';
export function loadTheme({ storage, systemDark = false } = {}) {
  try {
    storage ??= globalThis.localStorage;
    const saved = storage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return { theme: saved, source: 'saved' };
  } catch { /* A theme preference must never prevent the workspace from opening. */ }
  return { theme: systemDark ? 'dark' : 'light', source: 'system' };
}

export function saveTheme(theme, storage) {
  if (!['dark', 'light'].includes(theme)) return false;
  try { storage ??= globalThis.localStorage; storage.setItem(THEME_KEY, theme); return true; }
  catch { return false; }
}

export function initializeTheme(onStorageError) {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const preference = loadTheme({ systemDark: media.matches });
  let theme = preference.theme;
  let manual = preference.source === 'saved';
  const button = document.getElementById('theme-toggle');
  function apply() {
    document.documentElement.dataset.theme = theme;
    const label = `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`;
    button.setAttribute('aria-label', label); button.title = label;
    button.setAttribute('aria-pressed', theme === 'dark');
    button.replaceChildren(icon(theme === 'dark' ? 'sun' : 'moon'));
    document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#201e2d' : '#7359d9';
  }
  apply(); button.disabled = false;
  button.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark'; manual = true; apply();
    if (!saveTheme(theme)) onStorageError('Theme changed for this visit. Your browser could not save the preference.');
  });
  media.addEventListener('change', event => { if (!manual) { theme = event.matches ? 'dark' : 'light'; apply(); } });
}
