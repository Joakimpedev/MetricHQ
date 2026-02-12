'use client';

import { useState } from 'react';
import { SignInButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { BarChart3, TrendingUp, Globe } from 'lucide-react';

const CLERK_ENABLED =
  typeof process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === 'string' &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY !== 'pk_test_xxxxx' &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith('pk_') &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.length > 30;

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Something went wrong.' });
        return;
      }
      setMessage({ type: 'success', text: data.message || "You're on the list!" });
      setEmail('');
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        required
        disabled={loading}
        className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={loading}
        className="px-6 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Joining…' : 'Join waitlist'}
      </button>
      {message && (
        <p className={`text-sm sm:col-span-2 ${message.type === 'success' ? 'text-amber-400' : 'text-red-400'}`}>
          {message.text}
        </p>
      )}
    </form>
  );
}

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useUser();

  // If signed in, show a simple redirect prompt to dashboard
  if (CLERK_ENABLED && isLoaded && isSignedIn) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">MetricHQ</h1>
          <p className="text-slate-400 mb-8">You&apos;re signed in. Go to your dashboard.</p>
          <Link
            href="/dashboard"
            className="inline-block bg-amber-500 hover:bg-amber-400 text-slate-900 px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            Open Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(245,158,11,0.15),transparent)]" />
        <nav className="relative max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <span className="text-xl font-bold">MetricHQ</span>
          {CLERK_ENABLED && (
            <SignInButton mode="modal">
              <button className="text-slate-400 hover:text-white text-sm font-medium transition-colors">
                Sign in
              </button>
            </SignInButton>
          )}
          {!CLERK_ENABLED && (
            <Link href="/dashboard" className="text-slate-400 hover:text-white text-sm font-medium transition-colors">
              Dashboard
            </Link>
          )}
        </nav>

        <div className="relative max-w-4xl mx-auto px-6 pt-16 pb-24 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
            See your real profit{' '}
            <span className="text-amber-400">by country</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10">
            Connect TikTok, Meta, and PostHog. Get ad spend and revenue in one dashboard. Know exactly where you make or lose money.
          </p>
          {CLERK_ENABLED && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
              <SignInButton mode="modal">
                <button className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-8 py-3 rounded-lg font-semibold transition-colors">
                  Try it free
                </button>
              </SignInButton>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center border border-white/20 hover:border-white/40 px-8 py-3 rounded-lg font-medium transition-colors"
              >
                Open dashboard
              </Link>
            </div>
          )}
          {!CLERK_ENABLED && (
            <Link
              href="/dashboard"
              className="inline-block bg-amber-500 hover:bg-amber-400 text-slate-900 px-8 py-3 rounded-lg font-semibold transition-colors mb-4"
            >
              Open dashboard
            </Link>
          )}
        </div>
      </header>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-2xl font-bold text-center mb-12">One dashboard for all your ad data</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800">
            <div className="mb-3"><BarChart3 size={28} className="text-amber-400" /></div>
            <h3 className="font-semibold text-lg mb-2">TikTok & Meta Ads</h3>
            <p className="text-slate-400 text-sm">Connect your ad accounts. We pull spend, impressions, and clicks by country.</p>
          </div>
          <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800">
            <div className="mb-3"><TrendingUp size={28} className="text-amber-400" /></div>
            <h3 className="font-semibold text-lg mb-2">PostHog revenue</h3>
            <p className="text-slate-400 text-sm">Link PostHog to get revenue and purchases. Profit = revenue − ad spend.</p>
          </div>
          <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800">
            <div className="mb-3"><Globe size={28} className="text-amber-400" /></div>
            <h3 className="font-semibold text-lg mb-2">Country-level breakdown</h3>
            <p className="text-slate-400 text-sm">See which countries are profitable. Stop wasting spend where it doesn't pay off.</p>
          </div>
        </div>
      </section>

      {/* Waitlist */}
      <section className="border-t border-slate-800">
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <h2 className="text-2xl font-bold mb-4">Get early access</h2>
          <p className="text-slate-400 mb-8">
            Join the waitlist and we&apos;ll let you know when new features drop.
          </p>
          <WaitlistForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-slate-500 text-sm">MetricHQ</span>
          <div className="flex gap-6">
            <Link href="/dashboard" className="text-slate-500 hover:text-slate-400 text-sm transition-colors">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
