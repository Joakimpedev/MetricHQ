'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useUser, SignOutButton } from '@clerk/nextjs';
import { Sun, Moon, Settings, LogOut, Menu } from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface TopBarProps {
  title: string;
  syncSlot?: React.ReactNode;
  onMenuToggle?: () => void;
}

export default function TopBar({ title, syncSlot, onMenuToggle }: TopBarProps) {
  const { user } = useUser();
  const { theme, setTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  return (
    <div className="h-14 border-b border-border-dim bg-bg-body px-6 flex items-center justify-between shrink-0">
      {/* Left: hamburger + page title */}
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button onClick={onMenuToggle} className="md:hidden p-1 rounded-md hover:bg-bg-hover text-text-dim">
            <Menu size={20} />
          </button>
        )}
        <h1 className="text-[15px] font-semibold text-text-heading">{title}</h1>
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-2">
        {/* Sync slot (only on dashboard) */}
        {syncSlot}

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-lg hover:bg-bg-hover text-text-dim transition-colors"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-full overflow-hidden hover:ring-2 hover:ring-border-dim transition-all"
          >
            {user?.imageUrl ? (
              <img src={user.imageUrl} alt="" className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center text-[12px] font-medium text-text-body">
                {user?.firstName?.[0] || '?'}
              </div>
            )}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-56 bg-bg-surface border border-border rounded-lg shadow-xl overflow-hidden z-50">
              {/* User info */}
              <div className="px-3.5 py-3 border-b border-border-dim">
                <p className="text-[12px] font-medium text-text-heading truncate">
                  {user?.fullName || 'Account'}
                </p>
                <p className="text-[11px] text-text-dim truncate">
                  {user?.primaryEmailAddress?.emailAddress || ''}
                </p>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <Link
                  href="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-[12px] text-text-body hover:text-text-heading hover:bg-bg-hover transition-colors"
                >
                  <Settings size={14} />
                  Settings
                </Link>
                <SignOutButton>
                  <button className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[12px] text-text-dim hover:text-error hover:bg-error-bg transition-colors">
                    <LogOut size={14} />
                    Sign out
                  </button>
                </SignOutButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
