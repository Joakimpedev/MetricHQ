'use client';

import { useUser } from '@clerk/nextjs';

export default function SettingsPage() {
  const { user } = useUser();

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-[20px] font-bold text-text-heading">Settings</h1>

      <div className="bg-bg-surface rounded-xl border border-border-dim p-5">
        <h2 className="text-[14px] font-medium text-text-heading mb-4">Account</h2>
        <div className="space-y-0">
          <div className="flex items-center justify-between py-2.5">
            <span className="text-[12px] text-text-dim">Email</span>
            <span className="text-[12px] text-text-heading">
              {user?.primaryEmailAddress?.emailAddress || '-'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2.5 border-t border-border-dim">
            <span className="text-[12px] text-text-dim">Name</span>
            <span className="text-[12px] text-text-heading">
              {user?.fullName || '-'}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-bg-surface rounded-xl border border-border-dim p-5">
        <h2 className="text-[14px] font-medium text-text-heading mb-1">More settings coming soon</h2>
        <p className="text-[12px] text-text-dim">
          Date range defaults, currency, and notifications.
        </p>
      </div>
    </div>
  );
}
