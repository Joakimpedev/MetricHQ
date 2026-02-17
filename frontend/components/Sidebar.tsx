'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Plug, DollarSign, CreditCard, Settings, X, BarChart3, PlusCircle } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/events', label: 'Events', icon: BarChart3 },
  { href: '/integrations', label: 'Integrations', icon: Plug },
  { href: '/custom-costs', label: 'Custom Costs', icon: DollarSign },
  { href: '/custom-sources', label: 'Custom Sources', icon: PlusCircle },
  { href: '/pricing', label: 'Billing', icon: CreditCard },
  { href: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {/* Brand */}
      <div className="h-14 px-5 flex items-center justify-between border-b border-border-dim" style={{ background: 'var(--bg-logo)' }}>
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
        {onClose && (
          <button onClick={onClose} className="md:hidden p-1 rounded-md hover:bg-bg-hover text-text-dim">
            <X size={18} />
          </button>
        )}
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
    </>
  );
}

export default function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  // Auto-close on route change
  useEffect(() => {
    onMobileClose?.();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [mobileOpen]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-52 bg-bg-sidebar border-r border-border-dim flex-col z-50">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-bg-overlay" onClick={onMobileClose} />
          {/* Panel */}
          <aside className="fixed left-0 top-0 h-screen w-64 bg-bg-sidebar border-r border-border-dim flex flex-col">
            <SidebarContent onClose={onMobileClose} />
          </aside>
        </div>
      )}
    </>
  );
}
