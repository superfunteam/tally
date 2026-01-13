import { useEffect, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

export type ColorMode = 'light' | 'dark' | 'sepia' | 'eink';

export function useColorMode() {
  const [mode, setMode] = useLocalStorage<ColorMode>('tally-color-mode', 'light');

  const applyMode = useCallback((newMode: ColorMode) => {
    const root = document.documentElement;

    // Remove all mode classes
    root.classList.remove('light', 'dark', 'sepia', 'eink');

    // Add new mode class
    root.classList.add(newMode);

    // Update meta theme-color
    const themeColors: Record<ColorMode, string> = {
      light: '#4f46e5',
      dark: '#1e1b4b',
      sepia: '#92400e',
      eink: '#374151',
    };

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', themeColors[newMode]);
    }
  }, []);

  useEffect(() => {
    applyMode(mode);
  }, [mode, applyMode]);

  return [mode, setMode] as const;
}
