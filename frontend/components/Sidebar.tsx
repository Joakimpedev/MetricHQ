'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Plug, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/integrations', label: 'Integrations', icon: Plug },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-52 bg-bg-sidebar border-r border-border-dim flex flex-col z-50">
      {/* Brand */}
      <div className="h-14 px-5 flex items-center justify-center bg-[rgba(0,0,0,0.04)] border-b border-border-dim">
        <div className="flex items-center gap-2">
          <svg width="26" height="26" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="2" y="24" width="7" height="14" rx="1.5" fill="var(--accent)" opacity="0.35" />
            <rect x="12" y="16" width="7" height="22" rx="1.5" fill="var(--accent)" opacity="0.6" />
            <rect x="22" y="8" width="7" height="30" rx="1.5" fill="var(--accent)" opacity="0.85" />
            <rect x="32" y="2" width="7" height="36" rx="1.5" fill="var(--accent)" />
          </svg>
          <div className="flex items-baseline">
            <span className="text-[17px] font-bold text-text-heading tracking-tight">Metric</span>
            <span className="text-[17px] font-bold text-accent tracking-tight">HQ</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pt-3">
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
                    : 'text-text-dim hover:text-text-body hover:bg-bg-hover'
                }`}
              >
                <Icon size={16} strokeWidth={active ? 2 : 1.5} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
