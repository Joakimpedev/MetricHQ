'use client';

import { useUser, SignInButton } from '@clerk/nextjs';
import Sidebar from '../../components/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-bg-body flex items-center justify-center">
        <div className="text-text-dim text-[13px]">Loading...</div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-bg-body flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-heading mb-2">MetricHQ</h1>
          <p className="text-text-dim text-[13px] mb-8">Sign in to access your dashboard</p>
          <SignInButton mode="modal">
            <button className="bg-accent hover:bg-accent-hover px-8 py-3 rounded-lg text-[13px] font-semibold text-accent-text transition-colors">
              Sign In
            </button>
          </SignInButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-body">
      <Sidebar />
      <main className="ml-56 p-8">{children}</main>
    </div>
  );
}
