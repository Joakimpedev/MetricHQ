'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  setTheme: () => {},
  isDark: false,
});

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    const stored = localStorage.getItem('metrichq-theme') as Theme | null;
    if (stored === 'light' || stored === 'dark') {
      setThemeState(stored);
      document.documentElement.setAttribute('data-theme', stored);
    }

    // Listen for theme messages from parent (when inside iframe)
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'theme' && (e.data.theme === 'light' || e.data.theme === 'dark')) {
        setThemeState(e.data.theme);
        localStorage.setItem('metrichq-theme', e.data.theme);
        document.documentElement.setAttribute('data-theme', e.data.theme);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('metrichq-theme', t);
    document.documentElement.setAttribute('data-theme', t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}
