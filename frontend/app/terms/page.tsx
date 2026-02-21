import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service — MetricHQ',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-bg-body text-text-body">
      <nav className="border-b border-border-dim">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
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
          </Link>
          <Link href="/dashboard" className="text-sm text-accent hover:text-accent-hover transition-colors">Dashboard</Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-text-heading mb-2">Terms of Service</h1>
        <p className="text-sm text-text-dim mb-10">Last updated: February 21, 2026</p>

        <div className="space-y-8 text-[14px] leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-text-heading mb-3">1. Agreement to Terms</h2>
            <p>By accessing or using MetricHQ (&ldquo;the Service&rdquo;), operated by MetricHQ (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-heading mb-3">2. Description of Service</h2>
            <p>MetricHQ is a profit tracking platform that connects to your advertising and revenue platforms to display unified analytics. The Service aggregates data from third-party platforms including Google Ads, Meta Ads, TikTok Ads, LinkedIn Ads, Stripe, and PostHog to provide a consolidated view of ad spend, revenue, and profit.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-heading mb-3">3. Account Registration</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>You must provide accurate and complete information when creating an account.</li>
              <li>You are responsible for maintaining the security of your account credentials.</li>
              <li>You must notify us immediately of any unauthorized use of your account.</li>
              <li>You must be at least 18 years old to use the Service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-heading mb-3">4. Subscriptions and Payment</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>MetricHQ offers a 14-day free trial. No credit card is required to start a trial.</li>
              <li>After the trial period, continued access requires a paid subscription.</li>
              <li>Subscription fees are billed monthly or annually, depending on the plan you choose.</li>
              <li>All fees are non-refundable except as required by law.</li>
              <li>We reserve the right to change pricing with 30 days&apos; notice. Price changes do not affect your current billing period.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-heading mb-3">5. Acceptable Use</h2>
            <p className="mb-2">You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use the Service for any unlawful purpose or in violation of any applicable laws.</li>
              <li>Attempt to gain unauthorized access to the Service or its related systems.</li>
              <li>Interfere with or disrupt the integrity or performance of the Service.</li>
              <li>Reverse engineer, decompile, or disassemble any part of the Service.</li>
              <li>Resell, sublicense, or redistribute the Service without prior written consent.</li>
              <li>Use the Service to collect data about other users without their consent.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-heading mb-3">6. Third-Party Integrations</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>The Service connects to third-party platforms (Google Ads, Meta, TikTok, LinkedIn, Stripe, PostHog) via their APIs.</li>
              <li>Your use of these platforms is governed by their respective terms of service.</li>
              <li>We access your third-party accounts in read-only mode and are not responsible for any changes made directly on those platforms.</li>
              <li>We are not liable for any downtime, data inaccuracies, or service disruptions caused by third-party platforms.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-heading mb-3">7. Data and Privacy</h2>
            <p>Your use of the Service is also governed by our <Link href="/privacy" className="text-accent hover:text-accent-hover transition-colors">Privacy Policy</Link>, which describes how we collect, use, and protect your data.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-heading mb-3">8. Intellectual Property</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>The Service, including its design, code, and branding, is owned by MetricHQ and protected by intellectual property laws.</li>
              <li>You retain ownership of all data you provide to the Service.</li>
              <li>We do not claim any ownership over your connected platform data.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-heading mb-3">9. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, MetricHQ shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or business opportunities, arising out of or related to your use of the Service.</p>
            <p className="mt-2">The Service is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. We make no warranties, express or implied, regarding the accuracy, reliability, or availability of the Service or the data displayed within it.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-heading mb-3">10. Termination</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>You may cancel your subscription and stop using the Service at any time.</li>
              <li>We may suspend or terminate your access if you violate these Terms.</li>
              <li>Upon termination, your right to use the Service ceases immediately.</li>
              <li>You may request deletion of your data after termination by contacting us.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-heading mb-3">11. Changes to Terms</h2>
            <p>We may update these Terms from time to time. Changes will be posted on this page with an updated date. Continued use of the Service after changes constitutes acceptance of the updated Terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-heading mb-3">12. Contact</h2>
            <p>If you have questions about these Terms of Service, contact us at:</p>
            <p className="mt-2">Email: <a href="mailto:contact@metrichq.app" className="text-accent hover:text-accent-hover transition-colors">contact@metrichq.app</a></p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border-dim py-6">
        <div className="max-w-3xl mx-auto px-6 flex items-center justify-between text-sm text-text-dim">
          <span>MetricHQ</span>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-text-body transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
