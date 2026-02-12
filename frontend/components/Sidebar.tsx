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
      <div className="px-5 pt-5 pb-4">
        <span className="text-[14px] font-semibold text-text-heading tracking-tight">
          MetricHQ
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3">
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
