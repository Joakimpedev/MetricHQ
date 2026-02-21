import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — MetricHQ',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-bg-body text-text-body">
      <nav className="border-b border-border-dim">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-text-heading font-semibold text-lg">MetricHQ</Link>
          <Link href="/dashboard" className="text-sm text-accent hover:text-accent-hover transition-colors">Dashboard</Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-text-heading mb-2">Privacy Policy</h1>
        <p className="text-sm text-text-dim mb-10">Last updated: February 13, 2026</p>

        <div className="space-y-8 text-[14px] leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-text-heading mb-3">1. Introduction</h2>
            <p>MetricHQ (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) operates the MetricHQ platform. This Privacy Policy explains how we collect, use, and protect your information when you use our service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-heading mb-3">2. Information We Collect</h2>
            <h3 className="text-[15px] font-medium text-text-heading mb-2">Account Information</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Email address (via Clerk authentication)</li>
              <li>User ID</li>
            </ul>

            <h3 className="text-[15px] font-medium text-text-heading mt-4 mb-2">Connected Platform Data</h3>
            <p className="mb-2">When you connect third-party platforms, we collect and store:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Stripe</strong>: API key, charge amounts, billing country, customer UTM metadata (campaign attribution)</li>
              <li><strong>Google Ads</strong>: OAuth tokens, campaign names, ad spend, impressions, clicks, geographic data</li>
              <li><strong>Meta Ads</strong>: OAuth tokens, campaign names, ad spend, impressions, clicks, geographic data</li>
              <li><strong>TikTok Ads</strong>: OAuth tokens, campaign names, ad spend, impressions, clicks, geographic data</li>
              <li><strong>LinkedIn Ads</strong>: OAuth tokens, campaign names, ad spend, impressions, clicks</li>
              <li><strong>PostHog</strong>: API key, project ID, revenue events, country-level purchase data</li>
            </ul>
            <p className="mt-3">We only collect data necessary to display your analytics dashboard. We access all ad platforms in <strong>read-only mode</strong> — we never create, modify, or delete your campaigns or ads.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-heading mb-3">3. How We Use Your Information</h2>
            <p className="mb-2">We use your data solely to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Display your ad spend, revenue, and profit metrics in your dashboard</li>
              <li>Sync data periodically from your connected platforms</li>
              <li>Authenticate your account</li>
            </ul>
            <p className="mt-3 mb-2">We do <strong>not</strong>:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Sell your data to third parties</li>
              <li>Use your data for advertising</li>
              <li>Share your data with other users</li>
              <li>Train AI models on your data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-heading mb-3">4. Data Storage and Security</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Data is stored in a PostgreSQL database hosted on Railway (cloud infrastructure)</li>
              <li>OAuth tokens and API keys are stored securely in the database</li>
              <li>All connections use HTTPS/TLS encryption in transit</li>
              <li>Access to the database is restricted to the application only</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-heading mb-3">5. Data Retention</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>We store your connected platform data for as long as your account is active</li>
              <li>When you disconnect a platform, the associated tokens are removed</li>
              <li>You can request deletion of all your data by contacting us</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-heading mb-3">6. Third-Party Services</h2>
            <p className="mb-2">We use the following third-party services:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Clerk</strong> — authentication and user management</li>
              <li><strong>Railway</strong> — backend hosting and database</li>
              <li><strong>Vercel</strong> — frontend hosting</li>
            </ul>
            <p className="mt-3">Each of these services has their own privacy policies. We only share the minimum data necessary for these services to function.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-heading mb-3">7. Your Rights</h2>
            <p className="mb-2">You have the right to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access the data we hold about you</li>
              <li>Disconnect any connected platform at any time</li>
              <li>Request deletion of your account and all associated data</li>
              <li>Export your data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-heading mb-3">8. Cookies</h2>
            <p>We use only essential cookies required for authentication. We do not use tracking or advertising cookies.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-heading mb-3">9. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated date.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-heading mb-3">10. Contact</h2>
            <p>If you have questions about this Privacy Policy or want to request data deletion, contact us at:</p>
            <p className="mt-2">Email: <a href="mailto:andersdavan21@gmail.com" className="text-accent hover:text-accent-hover transition-colors">andersdavan21@gmail.com</a></p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border-dim py-6">
        <div className="max-w-3xl mx-auto px-6 flex items-center justify-between text-sm text-text-dim">
          <span>MetricHQ</span>
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-text-body transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
