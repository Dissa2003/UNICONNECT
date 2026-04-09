import React, { createContext, useContext, useState } from 'react';

const ThemeContext = createContext(null);

const DARK_PAL = {
  text:         '#FFFFFF',
  textMuted:    'rgba(255,255,255,.45)',
  textDim:      'rgba(255,255,255,.28)',
  textSemi:     'rgba(255,255,255,.75)',
  cardBg:       'rgba(255,255,255,.04)',
  cardBorder:   'rgba(255,255,255,.09)',
  inputBg:      'rgba(255,255,255,.05)',
  inputBorder:  'rgba(255,255,255,.12)',
  progressBg:   'rgba(255,255,255,.08)',
  surfaceBg:    'rgba(255,255,255,.04)',
};

const LIGHT_PAL = {
  text:         '#0A0E1A',
  textMuted:    'rgba(10,14,26,.55)',
  textDim:      'rgba(10,14,26,.35)',
  textSemi:     'rgba(10,14,26,.75)',
  cardBg:       '#ffffff',
  cardBorder:   'rgba(10,14,26,.12)',
  inputBg:      'rgba(10,14,26,.04)',
  inputBorder:  'rgba(10,14,26,.18)',
  progressBg:   'rgba(10,14,26,.08)',
  surfaceBg:    'rgba(10,14,26,.03)',
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark');
  const isDk = theme !== 'light';
  const pal  = isDk ? DARK_PAL : LIGHT_PAL;
  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDk, pal }}>
import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('uc-theme') || 'dark'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('uc-theme', theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Fallback when used outside a ThemeProvider (e.g. during tests)
    return { theme: 'dark', setTheme: () => {}, isDk: true, pal: DARK_PAL };
  }
  return ctx;
}
export const useTheme = () => useContext(ThemeContext);
