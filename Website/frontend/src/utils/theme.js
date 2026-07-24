import { useEffect, useState } from 'react';

export const THEME_MODE_KEY = 'societyhub-theme-mode';
export const LEGACY_THEME_KEY = 'societyhub-theme';

const getSystemTheme = () => (
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
);

export const getThemeMode = () => {
  const savedMode = localStorage.getItem(THEME_MODE_KEY);
  if (['light', 'dark'].includes(savedMode)) return savedMode;
  const legacyTheme = localStorage.getItem(LEGACY_THEME_KEY);
  if (['light', 'dark'].includes(legacyTheme)) return legacyTheme;
  return 'light';
};

export const resolveTheme = (mode) => (mode === 'system' ? getSystemTheme() : mode);

export const applyThemeMode = (mode = getThemeMode()) => {
  const safeMode = ['light', 'dark', 'system'].includes(mode) ? mode : 'system';
  const resolvedTheme = resolveTheme(safeMode);
  document.documentElement.dataset.themeMode = safeMode;
  document.documentElement.dataset.theme = resolvedTheme;
  localStorage.setItem(THEME_MODE_KEY, safeMode);
  localStorage.setItem(LEGACY_THEME_KEY, resolvedTheme);
  window.dispatchEvent(new CustomEvent('societyhubThemeChanged', {
    detail: { mode: safeMode, resolvedTheme }
  }));
  return { mode: safeMode, resolvedTheme };
};

export const initializeTheme = () => applyThemeMode(getThemeMode());

export const useTheme = () => {
  const [themeState, setThemeState] = useState(() => ({
    mode: getThemeMode(),
    resolvedTheme: document.documentElement.dataset.theme || resolveTheme(getThemeMode())
  }));

  useEffect(() => {
    const syncTheme = () => {
      setThemeState({
        mode: getThemeMode(),
        resolvedTheme: document.documentElement.dataset.theme || resolveTheme(getThemeMode())
      });
    };

    const systemMatcher = window.matchMedia?.('(prefers-color-scheme: dark)');
    const syncSystemTheme = () => {
      if (getThemeMode() === 'system') applyThemeMode('system');
    };

    window.addEventListener('societyhubThemeChanged', syncTheme);
    window.addEventListener('storage', syncTheme);
    systemMatcher?.addEventListener?.('change', syncSystemTheme);

    return () => {
      window.removeEventListener('societyhubThemeChanged', syncTheme);
      window.removeEventListener('storage', syncTheme);
      systemMatcher?.removeEventListener?.('change', syncSystemTheme);
    };
  }, []);

  const setThemeMode = (mode) => {
    const nextState = applyThemeMode(mode);
    setThemeState(nextState);
  };

  const cycleTheme = () => {
    setThemeMode(themeState.resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return { ...themeState, setThemeMode, cycleTheme };
};
