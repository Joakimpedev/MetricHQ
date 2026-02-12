'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser, SignOutButton } from '@clerk/nextjs';
import { LayoutDashboard, Plug, Settings, LogOut, ChevronUp } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/integrations', label: 'Integrations', icon: Plug },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
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
    <aside className="fixed left-0 top-0 h-screen w-56 bg-bg-sidebar border-r border-border-dim flex flex-col z-50">
      {/* Brand */}
      <div className="px-5 pt-6 pb-5">
        <span className="text-[14px] font-semibold text-text-heading tracking-tight">
          Profit Tracker
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3">
        <p className="text-[10px] font-medium uppercase tracking-widest text-text-dim px-3 mb-2">
          Menu
        </p>
        <div className="space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors ${
                  active
                    ? 'bg-accent-muted text-text-heading font-medium'
                    : 'text-text-dim hover:text-text-body hover:bg-bg-elevated/40'
                }`}
              >
                <Icon size={16} strokeWidth={active ? 2 : 1.5} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User section with popover */}
      <div className="relative p-3" ref={menuRef}>
        {/* Popover */}
        {menuOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-1 bg-bg-surface border border-border rounded-lg shadow-xl overflow-hidden">
            <Link
              href="/settings"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 text-[12px] text-text-body hover:text-text-heading hover:bg-bg-elevated/50 transition-colors"
            >
              <Settings size={14} />
              Settings
            </Link>
            <div className="border-t border-border-dim" />
            <SignOutButton>
              <button className="flex items-center gap-2.5 w-full px-3 py-2.5 text-[12px] text-text-dim hover:text-red-400 hover:bg-red-400/5 transition-colors">
                <LogOut size={14} />
                Sign out
              </button>
            </SignOutButton>
          </div>
        )}

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg hover:bg-bg-elevated/40 transition-colors"
        >
          {user?.imageUrl ? (
            <img src={user.imageUrl} alt="" className="w-7 h-7 rounded-full" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-bg-elevated flex items-center justify-center text-[11px] font-medium text-text-body">
              {user?.firstName?.[0] || '?'}
            </div>
          )}
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[12px] text-text-heading truncate leading-tight">
              {user?.firstName || 'Account'}
            </p>
          </div>
          <ChevronUp size={14} className={`text-text-dim transition-transform ${menuOpen ? '' : 'rotate-180'}`} />
        </button>
      </div>
    </aside>
  );
}
