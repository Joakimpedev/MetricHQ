'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser, SignInButton } from '@clerk/nextjs';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export default function InvitePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'no-token'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('no-token');
      return;
    }
    if (!isLoaded || !user) return;

    async function acceptInvite() {
      try {
        const res = await fetch(`${API_URL}/api/team/accept`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user!.id, token }),
        });
        const data = await res.json();
        if (!res.ok) {
          setStatus('error');
          setErrorMsg(data.error || 'Failed to accept invite');
          return;
        }
        setStatus('success');
        setTimeout(() => router.push('/dashboard'), 1500);
      } catch {
        setStatus('error');
        setErrorMsg('Network error');
      }
    }

    acceptInvite();
  }, [token, user, isLoaded]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-bg-surface rounded-xl border border-border-dim p-8 max-w-sm w-full text-center">
        {status === 'no-token' && (
          <>
            <h2 className="text-[14px] font-medium text-text-heading mb-2">Invalid invite</h2>
            <p className="text-[12px] text-text-dim">No invite token found. Check your invite link.</p>
          </>
        )}

        {status === 'loading' && !isLoaded && (
          <div className="h-12 bg-bg-elevated animate-pulse rounded-lg" />
        )}

        {status === 'loading' && isLoaded && !user && (
          <>
            <h2 className="text-[14px] font-medium text-text-heading mb-3">Sign in to accept invite</h2>
            <p className="text-[12px] text-text-dim mb-4">You need to sign in or create an account to join the team.</p>
            <SignInButton mode="modal">
              <button className="px-4 py-2 bg-accent text-white text-[12px] font-medium rounded-lg hover:bg-accent-hover transition-colors">
                Sign in
              </button>
            </SignInButton>
          </>
        )}

        {status === 'loading' && isLoaded && user && (
          <>
            <h2 className="text-[14px] font-medium text-text-heading mb-2">Accepting invite...</h2>
            <div className="h-8 bg-bg-elevated animate-pulse rounded-lg mt-3" />
          </>
        )}

        {status === 'success' && (
          <>
            <h2 className="text-[14px] font-medium text-success mb-2">Invite accepted!</h2>
            <p className="text-[12px] text-text-dim">Redirecting to dashboard...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <h2 className="text-[14px] font-medium text-error mb-2">Could not accept invite</h2>
            <p className="text-[12px] text-text-dim">{errorMsg}</p>
          </>
        )}
      </div>
    </div>
  );
}
