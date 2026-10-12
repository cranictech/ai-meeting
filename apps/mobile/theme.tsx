import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeName = 'light' | 'dark';

export type Colors = {
  name: ThemeName;
  background: string;
  card: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  primarySoft: string;
  inputBg: string;
  danger: string;
  dangerSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  neutralSoft: string;
};

const light: Colors = {
  name: 'light',
  background: '#f9fafb',
  card: '#ffffff',
  border: '#e5e7eb',
  text: '#111827',
  textMuted: '#6b7280',
  primary: '#2563eb',
  onPrimary: '#ffffff',
  primarySoft: '#eff6ff',
  inputBg: '#f9fafb',
  danger: '#dc2626',
  dangerSoft: '#fef2f2',
  success: '#16a34a',
  successSoft: '#dcfce7',
  warning: '#b45309',
  warningSoft: '#fef3c7',
  neutralSoft: '#f3f4f6',
};

const dark: Colors = {
  name: 'dark',
  background: '#0b0e14',
  card: '#151a22',
  border: '#252c37',
  text: '#f0f4f8',
  textMuted: '#9aa4b2',
  primary: '#3b82f6',
  onPrimary: '#ffffff',
  primarySoft: 'rgba(59, 130, 246, 0.14)',
  inputBg: '#0f131a',
  danger: '#ef4444',
  dangerSoft: 'rgba(239, 68, 68, 0.14)',
  success: '#22c55e',
  successSoft: 'rgba(34, 197, 94, 0.14)',
  warning: '#f59e0b',
  warningSoft: 'rgba(245, 158, 11, 0.16)',
  neutralSoft: '#1b212b',
};

const STORAGE_KEY = 'meeti-theme';

type ThemeContextValue = {
  theme: ThemeName;
  colors: Colors;
  isDark: boolean;
  setTheme: (t: ThemeName) => void;
  toggle: () => void;
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  colors: dark,
  isDark: true,
  setTheme: () => {},
  toggle: () => {},
  ready: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('dark');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') setThemeState(stored);
      } catch {
        // keep default dark
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setTheme = useCallback((t: ThemeName) => {
    setThemeState(t);
    AsyncStorage.setItem(STORAGE_KEY, t).catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const colors = theme === 'dark' ? dark : light;

  return (
    <ThemeContext.Provider value={{ theme, colors, isDark: theme === 'dark', setTheme, toggle, ready }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

/* Helper to build a themed StyleSheet: const styles = makeStyles(colors); */
export function makeStyles<T extends object>(factory: (c: Colors) => T): (c: Colors) => T {
  return factory;
}
