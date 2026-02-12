'use client';

import { useState } from 'react';
import { SignInButton, SignOutButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';

const CLERK_ENABLED =
  typeof process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === 'string' &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY !== 'pk_test_xxxxx' &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith('pk_') &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.length > 30;

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

function ConnectPostHogForm({ userId }: { userId?: string }) {
  const [apiKey, setApiKey] = useState('');
  const [projectId, setProjectId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setMessage({ type: 'error', text: 'Sign in to save PostHog settings.' });
      return;
    }
    if (!apiKey.trim() || !projectId.trim()) {
      setMessage({ type: 'error', text: 'API key and Project ID are required.' });
      return;
    }
    setMessage(null);
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/settings/posthog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          apiKey: apiKey.trim(),
          projectId: projectId.trim()
        })
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to save.' });
        return;
      }
      setMessage({ type: 'success', text: 'PostHog connected.' });
      setApiKey('');
      setProjectId('');
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-t border-slate-700 pt-4 mt-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-2">Connect PostHog</h3>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="posthog-api-key" className="block text-xs text-slate-400 mb-1">API key</label>
          <input
            id="posthog-api-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="phx_…"
            className="bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white placeholder-slate-500 w-56"
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="posthog-project-id" className="block text-xs text-slate-400 mb-1">Project ID</label>
          <input
            id="posthog-project-id"
            type="text"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder="12345"
            className="bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white placeholder-slate-500 w-28"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium"
        >
          {loading ? 'Saving…' : 'Connect PostHog'}
        </button>
      </form>
      {message && (
        <p className={`mt-2 text-sm ${message.type === 'success' ? 'text-green-400' : 'text-amber-400'}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}

function MetricsBlock({ userId }: { userId?: string }) {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    if (!userId) {
      setError('Sign in to load metrics from your connected accounts.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const params = new URLSearchParams({ userId });
      const response = await fetch(`${API_URL}/api/metrics?${params}`);
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to load metrics');
        return;
      }
      setMetrics(data);
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError('Network error loading metrics.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
        <button
          onClick={fetchMetrics}
          disabled={loading || !userId}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-semibold mb-8"
        >
          {loading ? 'Loading...' : '🔄 Refresh Data'}
        </button>
        {error && (
          <p className="text-amber-400 mb-4">{error}</p>
        )}

        {metrics && metrics.countries?.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metrics.countries.map((country: any) => (
              <div key={country.code} className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">{country.code === 'NO' ? '🇳🇴' : '🇸🇪'}</span>
                  <h2 className="text-2xl font-bold">{country.name}</h2>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ad Spend:</span>
                    <span className="font-semibold">${country.spend}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Revenue:</span>
                    <span className="font-semibold">${country.revenue}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-700 pt-2 mt-2">
                    <span className="text-slate-400">Profit:</span>
                    <span className={`font-bold text-xl ${country.profit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${country.profit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">ROAS:</span>
                    <span className="font-semibold">{country.roas}x</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Purchases:</span>
                    <span className="font-semibold">{country.purchases}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {metrics && (!metrics.countries || metrics.countries.length === 0) && !error && (
          <p className="text-slate-400">No country data yet. Connect TikTok, Meta, or PostHog and refresh.</p>
        )}
    </>
  );
}

function DashboardWithAuth() {
  const { isSignedIn, user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">💰 Profit Tracker</h1>
          <p className="text-slate-400 mb-8">Track your app profit by country</p>
          <SignInButton mode="modal">
            <button className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg font-semibold">
              Sign In
            </button>
          </SignInButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-slate-400 hover:text-white text-sm">← Home</Link>
            <div>
              <h1 className="text-4xl font-bold mb-1">💰 Profit Tracker</h1>
              <p className="text-slate-400">
                See your real profit by country · {user?.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          </div>
          <SignOutButton>
            <button className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-sm font-medium">
              Sign Out
            </button>
          </SignOutButton>
        </div>

        <div className="mb-8 p-4 bg-slate-800 rounded-lg border border-slate-700">
          <h2 className="text-lg font-semibold mb-2">Connect ad accounts</h2>
          <p className="text-slate-400 text-sm mb-3">Link TikTok, Meta, and PostHog to pull spend and revenue.</p>
          <div className="flex flex-wrap gap-3 mb-4">
            <a
              href={`${API_URL}/auth/tiktok?userId=${encodeURIComponent(user?.id ?? '')}`}
              className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-sm font-medium"
            >
              TikTok Ads
            </a>
            <a
              href={`${API_URL}/auth/meta?userId=${encodeURIComponent(user?.id ?? '')}`}
              className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-sm font-medium"
            >
              Meta Ads
            </a>
          </div>
          <ConnectPostHogForm userId={user?.id} />
        </div>

        <MetricsBlock userId={user?.id} />
      </div>
    </div>
  );
}

function DashboardNoAuth() {
  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/" className="text-slate-400 hover:text-white text-sm">← Home</Link>
          <div>
            <h1 className="text-4xl font-bold mb-1">💰 Profit Tracker</h1>
            <p className="text-slate-400">See your real profit by country</p>
          </div>
        </div>

        <div className="mb-8 p-4 bg-slate-800 rounded-lg border border-slate-700">
          <h2 className="text-lg font-semibold mb-2">Connect ad accounts</h2>
          <p className="text-slate-400 text-sm mb-3">Link TikTok, Meta, and PostHog to pull spend and revenue. Sign in to connect accounts.</p>
          <div className="flex flex-wrap gap-3 mb-4">
            <span className="inline-flex items-center gap-2 bg-slate-700/50 px-4 py-2 rounded-lg text-sm text-slate-400 cursor-not-allowed">
              TikTok Ads (sign in)
            </span>
            <span className="inline-flex items-center gap-2 bg-slate-700/50 px-4 py-2 rounded-lg text-sm text-slate-400 cursor-not-allowed">
              Meta Ads (sign in)
            </span>
          </div>
          <ConnectPostHogForm userId={undefined} />
        </div>

        <MetricsBlock />
      </div>
    </div>
  );
}

export default function Dashboard() {
  if (CLERK_ENABLED) {
    return <DashboardWithAuth />;
  }
  return <DashboardNoAuth />;
}
