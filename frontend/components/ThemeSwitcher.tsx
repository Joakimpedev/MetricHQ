'use client';

import { useTheme } from './ThemeProvider';
import { Sun, Moon } from 'lucide-react';

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex gap-2">
      <button
        onClick={() => setTheme('light')}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors border ${
          theme === 'light'
            ? 'bg-accent text-accent-text border-accent'
            : 'bg-bg-elevated text-text-dim border-border-dim hover:text-text-body'
        }`}
      >
        <Sun size={14} />
        Light
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors border ${
          theme === 'dark'
            ? 'bg-accent text-accent-text border-accent'
            : 'bg-bg-elevated text-text-dim border-border-dim hover:text-text-body'
        }`}
      >
        <Moon size={14} />
        Dark
      </button>
    </div>
  );
}
