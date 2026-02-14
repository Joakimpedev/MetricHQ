'use client';

import { useState, useEffect } from 'react';
import { SignInButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { Sun, Moon, Check } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import DashboardPreview from '@/components/DashboardPreview';
import { PLANS } from '@/lib/plans';

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
    } catch {
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
        className="flex-1 px-4 py-3 rounded-lg bg-bg-elevated border border-border-dim text-text-heading placeholder-text-dim focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={loading}
        className="px-6 py-3 rounded-lg bg-accent hover:bg-accent-hover text-accent-text font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Joining…' : 'Join waitlist'}
      </button>
      {message && (
        <p className={`text-sm sm:col-span-2 ${message.type === 'success' ? 'text-success' : 'text-error'}`}>
          {message.text}
        </p>
      )}
    </form>
  );
}

/* ── Inline platform logos for the How It Works section ── */

function StepGoogleLogo() {
  return (
    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#4285f4' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M3.272 20.1l4.29-16.2c.36-1.36 1.78-2.18 3.14-1.82l1.36.36c1.36.36 2.18 1.78 1.82 3.14l-4.29 16.2c-.36 1.36-1.78 2.18-3.14 1.82l-1.36-.36c-1.36-.36-2.18-1.78-1.82-3.14z" fill="#fff" opacity="0.7"/>
        <path d="M10.272 20.1l4.29-16.2c.36-1.36 1.78-2.18 3.14-1.82l1.36.36c1.36.36 2.18 1.78 1.82 3.14l-4.29 16.2c-.36 1.36-1.78 2.18-3.14 1.82l-1.36-.36c-1.36-.36-2.18-1.78-1.82-3.14z" fill="#fff"/>
        <circle cx="6" cy="20" r="2.5" fill="#fff"/>
      </svg>
    </div>
  );
}

function StepMetaLogo() {
  return (
    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#1877f2' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" fill="#fff"/>
      </svg>
    </div>
  );
}

function StepLinkedInLogo() {
  return (
    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#0a66c2' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="#fff"/>
      </svg>
    </div>
  );
}

function StepStripeLogo() {
  return (
    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#635bff' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.918 3.757 7.038c0 4.72 2.89 6.054 6.014 7.13 2.058.72 2.768 1.253 2.768 2.146 0 .951-.757 1.498-2.14 1.498-2.07 0-4.932-.943-7.078-2.35L2.43 20.926C4.133 22.159 7.481 23.1 10.399 23.1c2.631 0 4.79-.621 6.332-1.81 1.652-1.275 2.512-3.142 2.512-5.393 0-4.8-2.944-6.142-5.267-6.747z" fill="#fff"/>
      </svg>
    </div>
  );
}

function MetricHQLogo() {
  return (
    <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
      <svg width="20" height="20" viewBox="0 0 40 40" fill="none">
        <rect x="2" y="24" width="7" height="14" rx="1.5" fill="var(--accent-text)" opacity="0.35" />
        <rect x="12" y="16" width="7" height="22" rx="1.5" fill="var(--accent-text)" opacity="0.6" />
        <rect x="22" y="8" width="7" height="30" rx="1.5" fill="var(--accent-text)" opacity="0.85" />
        <rect x="32" y="2" width="7" height="36" rx="1.5" fill="var(--accent-text)" />
      </svg>
    </div>
  );
}

/* ── Pricing ── */

function RollingDigit({ digit, delay = 0 }: { digit: string; delay?: number }) {
  const isNum = /\d/.test(digit);
  if (!isNum) return <span>{digit}</span>;

  return (
    <span className="inline-block relative overflow-hidden" style={{ width: '0.6em', height: '1em' }}>
      <span
        key={digit}
        className="absolute inset-0 flex items-center justify-center animate-roll-in"
        style={{ animationDelay: `${delay}ms` }}
      >
        {digit}
      </span>
    </span>
  );
}

function RollingPrice({ value }: { value: number }) {
  const chars = String(value).split('');
  return (
    <span className="inline-flex text-4xl font-bold text-text-heading">
      $
      {chars.map((ch, i) => (
        <RollingDigit key={`${i}-${ch}`} digit={ch} delay={i * 60} />
      ))}
    </span>
  );
}

const ROLLING_PHRASES = [
  'Marketing attribution',
  'Profit tracking',
  'Campaign analytics',
  'Country-level P&L',
  'Ad spend tracking',
];

function RollingPhrase() {
  const [index, setIndex] = useState(0);
  const [rolling, setRolling] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setRolling(true);
      setTimeout(() => {
        setIndex(i => (i + 1) % ROLLING_PHRASES.length);
        setRolling(false);
      }, 250);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="inline-block overflow-hidden h-[1.3em] align-bottom">
      <span
        className={`inline-block transition-all duration-400 ${
          rolling
            ? '-translate-y-full opacity-0'
            : 'translate-y-0 opacity-100'
        }`}
        style={{ transitionDuration: '400ms' }}
      >
        {ROLLING_PHRASES[index]}
      </span>
    </span>
  );
}

function PricingSection() {
  const [yearly, setYearly] = useState(false);

  return (
    <section id="pricing" className="border-t border-border-dim">
      <div className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-text-heading mb-3">
            Try it free for{' '}
            <span className="relative inline-block">
              <span className="text-text-dim line-through decoration-2 decoration-accent/60">7 days</span>
              <span
                className="absolute -top-5 -right-10 text-accent font-bold text-3xl -rotate-2"
                style={{ fontFamily: 'var(--font-caveat)' }}
              >
                14 days!
              </span>
            </span>
          </h2>
          <p className="text-text-dim max-w-md mx-auto">
            No credit card required.
          </p>
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <span className={`text-sm ${!yearly ? 'text-text-heading font-medium' : 'text-text-dim'}`}>Monthly</span>
          <button
            onClick={() => setYearly(y => !y)}
            className="relative w-12 h-6 rounded-full bg-bg-elevated border border-border-dim transition-colors"
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-accent transition-transform ${yearly ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
          <span className={`text-sm ${yearly ? 'text-text-heading font-medium' : 'text-text-dim'}`}>
            Yearly <span className="text-success text-[12px] font-medium">Save 25%</span>
          </span>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PLANS.map(plan => {
            const price = yearly ? plan.yearlyPrice : plan.monthlyPrice;
            return (
              <div
                key={plan.name}
                className={`rounded-xl border p-6 flex flex-col ${
                  plan.popular
                    ? 'border-accent bg-accent-muted'
                    : 'border-border-dim bg-bg-surface'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-text-heading">{plan.name}</h3>
                  {plan.popular && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider bg-accent text-accent-text px-2 py-0.5 rounded-full">
                      Popular
                    </span>
                  )}
                </div>
                <p className="text-text-dim text-sm mb-4">{plan.description}</p>
                <div className="mb-6">
                  <RollingPrice value={price} />
                  <span className="text-text-dim text-sm">/mo</span>
                  {yearly && (
                    <span className="text-text-dim text-[12px] ml-2">billed yearly</span>
                  )}
                </div>
                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-text-body">
                      <Check size={16} className="text-success mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Single CTA */}
        <div className="text-center mt-12">
          {CLERK_ENABLED ? (
            <SignInButton mode="modal">
              <button className="relative inline-block bg-accent hover:bg-accent-hover text-accent-text px-10 py-3.5 rounded-lg text-lg font-semibold transition-colors overflow-hidden group">
                <span className="relative z-10">Try free for 14 days</span>
                <span className="absolute inset-0 z-0 animate-shine pointer-events-none" />
              </button>
            </SignInButton>
          ) : (
            <Link
              href="/dashboard"
              className="relative inline-block bg-accent hover:bg-accent-hover text-accent-text px-10 py-3.5 rounded-lg text-lg font-semibold transition-colors overflow-hidden group"
            >
              <span className="relative z-10">Try free for 14 days</span>
              <span className="absolute inset-0 z-0 animate-shine pointer-events-none" />
            </Link>
          )}
          <p className="text-text-dim text-sm mt-3">No credit card required.</p>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useUser();
  const { theme, setTheme } = useTheme();

  if (CLERK_ENABLED && isLoaded && isSignedIn) {
    return (
      <div className="min-h-screen bg-bg-body flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2.5 mb-4">
            <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect x="2" y="24" width="7" height="14" rx="1.5" fill="var(--accent)" opacity="0.35" />
              <rect x="12" y="16" width="7" height="22" rx="1.5" fill="var(--accent)" opacity="0.6" />
              <rect x="22" y="8" width="7" height="30" rx="1.5" fill="var(--accent)" opacity="0.85" />
              <rect x="32" y="2" width="7" height="36" rx="1.5" fill="var(--accent)" />
            </svg>
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="text-text-heading">Metric</span><span className="text-accent">HQ</span>
            </h1>
          </div>
          <p className="text-text-dim mb-8">You&apos;re signed in. Go to your dashboard.</p>
          <Link
            href="/dashboard"
            className="inline-block bg-accent hover:bg-accent-hover text-accent-text px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            Open Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-body">
      {/* Nav + Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,oklch(from_var(--accent)_l_c_h_/_0.12),transparent)]" />
        <nav className="relative max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect x="2" y="24" width="7" height="14" rx="1.5" fill="var(--accent)" opacity="0.35" />
              <rect x="12" y="16" width="7" height="22" rx="1.5" fill="var(--accent)" opacity="0.6" />
              <rect x="22" y="8" width="7" height="30" rx="1.5" fill="var(--accent)" opacity="0.85" />
              <rect x="32" y="2" width="7" height="36" rx="1.5" fill="var(--accent)" />
            </svg>
            <span className="text-lg font-bold tracking-tight">
              <span className="text-text-heading">Metric</span><span className="text-accent">HQ</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#pricing" className="text-text-dim hover:text-text-heading text-sm font-medium transition-colors hidden sm:block">
              Pricing
            </a>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg hover:bg-bg-hover text-text-dim hover:text-text-heading transition-colors"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            {CLERK_ENABLED && (
              <SignInButton mode="modal">
                <button className="text-text-dim hover:text-text-heading text-sm font-medium transition-colors">
                  Sign in
                </button>
              </SignInButton>
            )}
            {!CLERK_ENABLED && (
              <Link href="/dashboard" className="text-text-dim hover:text-text-heading text-sm font-medium transition-colors">
                Dashboard
              </Link>
            )}
          </div>
        </nav>

        <div className="relative max-w-4xl mx-auto px-6 pt-16 pb-24 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 text-text-heading">
            Running ads on your SaaS?{' '}
            <span className="text-accent">See what&apos;s working.</span>
          </h1>
          <p className="text-lg sm:text-xl text-text-dim max-w-2xl mx-auto mb-10">
            Connect Google Ads, Meta, and LinkedIn with Stripe. Get a single dashboard that shows ad spend, revenue, and profit — by campaign and country.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {CLERK_ENABLED && (
              <SignInButton mode="modal">
                <button className="bg-accent hover:bg-accent-hover text-accent-text px-8 py-3 rounded-lg font-semibold transition-colors">
                  Start free trial
                </button>
              </SignInButton>
            )}
            {!CLERK_ENABLED && (
              <Link
                href="/dashboard"
                className="inline-block bg-accent hover:bg-accent-hover text-accent-text px-8 py-3 rounded-lg font-semibold transition-colors"
              >
                Start free trial
              </Link>
            )}
            <a
              href="#dashboard-preview"
              className="inline-flex items-center justify-center border border-border-dim hover:border-border px-8 py-3 rounded-lg font-medium text-text-body hover:text-text-heading transition-colors"
            >
              See demo
            </a>
          </div>
          <p className="text-[13px] text-text-dim mt-4">14-day free trial. No credit card required.</p>
        </div>
      </header>

      {/* Dashboard Preview */}
      <section id="dashboard-preview" className="max-w-7xl mx-auto px-6 py-16 scroll-mt-8 relative">
        {/* Handwritten arrow + label */}
        <div className="absolute -top-2 right-8 md:right-16 flex flex-col items-center z-10 select-none pointer-events-none">
          <span
            className="text-accent text-xl md:text-2xl font-bold -rotate-3"
            style={{ fontFamily: 'var(--font-caveat)' }}
          >
            interactive demo
          </span>
          <svg width="40" height="50" viewBox="0 0 40 50" fill="none" className="text-accent mt-0.5 rotate-6">
            <path d="M20 2 C18 15, 15 25, 20 45" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M12 38 L20 47 L26 37" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </div>
        <DashboardPreview />
        <div className="text-center mt-6">
          <Link
            href="/dashboard?demo=true"
            className="text-accent hover:underline text-sm font-medium"
          >
            Explore the full demo &rarr;
          </Link>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-10 overflow-hidden">
        <div className="space-y-6">
          <div className="relative">
            <div className="flex animate-marquee gap-6 w-max">
              {[1, 4, 3, 1, 4, 3].map((n, i) => (
                <img
                  key={i}
                  src={`/testimonials/tweet-${n}.png`}
                  alt="User testimonial"
                  className="h-[160px] w-auto rounded-xl border border-border-dim shadow-sm object-contain"
                  draggable={false}
                />
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="flex animate-marquee-reverse gap-6 w-max">
              {[2, 5, 6, 2, 5, 6].map((n, i) => (
                <img
                  key={i}
                  src={`/testimonials/tweet-${n}.png`}
                  alt="User testimonial"
                  className="h-[160px] w-auto rounded-xl border border-border-dim shadow-sm object-contain"
                  draggable={false}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-border-dim">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <h2 className="text-4xl font-bold text-center mb-12 text-text-heading">
            <span className="text-accent"><RollingPhrase /></span>
            <br />
            in 3 steps
          </h2>
          <div className="grid md:grid-cols-3 gap-10">
            {/* Step 1 */}
            <div className="text-center">
              <div className="flex justify-center gap-2 mb-4">
                <StepGoogleLogo />
                <StepMetaLogo />
                <StepLinkedInLogo />
              </div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-accent mb-2">Step 1</div>
              <h3 className="font-semibold text-lg mb-2 text-text-heading">Connect ad platforms</h3>
              <p className="text-text-dim text-sm">Link Google Ads, Meta, and LinkedIn. We pull spend by country automatically.</p>
            </div>
            {/* Step 2 */}
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <StepStripeLogo />
              </div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-accent mb-2">Step 2</div>
              <h3 className="font-semibold text-lg mb-2 text-text-heading">Connect Stripe</h3>
              <p className="text-text-dim text-sm">We match revenue to ad campaigns using UTM attribution on your payments.</p>
            </div>
            {/* Step 3 */}
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <MetricHQLogo />
              </div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-accent mb-2">Step 3</div>
              <h3 className="font-semibold text-lg mb-2 text-text-heading">See your P&amp;L</h3>
              <p className="text-text-dim text-sm">Your dashboard shows exactly where you make money and where you lose it — by campaign and country.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <PricingSection />

      {/* Waitlist */}
      <section className="border-t border-border-dim">
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <h2 className="text-4xl font-bold mb-4 text-text-heading">Stop guessing. Start tracking.</h2>
          <p className="text-text-dim mb-8">
            Join the waitlist and be the first to know when we launch.
          </p>
          <WaitlistForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-dim py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-text-dim text-sm">MetricHQ</span>
          <div className="flex gap-6">
            <a href="#pricing" className="text-text-dim hover:text-text-body text-sm transition-colors">
              Pricing
            </a>
            <Link href="/dashboard" className="text-text-dim hover:text-text-body text-sm transition-colors">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
