import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Globe, Plus, X, AlertTriangle } from 'lucide-react';

interface MarketingAttributionProps {
  platforms: Record<string, { totalSpend: number; totalRevenue?: number }>;
  unattributedRevenue: number;
  totalRevenue?: number;
}

const PLATFORM_META: Record<string, { label: string; color: string; borderColor?: string; utmHelpUrl: string }> = {
  google_ads: { label: 'Google Ads', color: '#4285f4', utmHelpUrl: 'https://support.google.com/google-ads/answer/6305348' },
  meta: { label: 'Meta Ads', color: '#1877f2', utmHelpUrl: 'https://www.facebook.com/business/help/1016122818401732' },
  tiktok: { label: 'TikTok Ads', color: '#111', borderColor: 'var(--border-dim)', utmHelpUrl: 'https://ads.tiktok.com/help/article/track-offsite-web-events-with-utm-parameters' },
  linkedin: { label: 'LinkedIn Ads', color: '#0a66c2', utmHelpUrl: 'https://www.linkedin.com/help/lms/answer/a5968064' },
};

function PlatformLogo({ platform }: { platform: string }) {
  const meta = PLATFORM_META[platform];
  if (!meta) return null;
  const borderStyle = meta.borderColor ? `1px solid ${meta.borderColor}` : 'none';

  return (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: meta.color, border: borderStyle }}>
      {platform === 'google_ads' && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M3.272 20.1l4.29-16.2c.36-1.36 1.78-2.18 3.14-1.82l1.36.36c1.36.36 2.18 1.78 1.82 3.14l-4.29 16.2c-.36 1.36-1.78 2.18-3.14 1.82l-1.36-.36c-1.36-.36-2.18-1.78-1.82-3.14z" fill="#fff" opacity="0.7"/>
          <path d="M10.272 20.1l4.29-16.2c.36-1.36 1.78-2.18 3.14-1.82l1.36.36c1.36.36 2.18 1.78 1.82 3.14l-4.29 16.2c-.36 1.36-1.78 2.18-3.14 1.82l-1.36-.36c-1.36-.36-2.18-1.78-1.82-3.14z" fill="#fff"/>
          <circle cx="6" cy="20" r="2.5" fill="#fff"/>
        </svg>
      )}
      {platform === 'meta' && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" fill="#fff"/>
        </svg>
      )}
      {platform === 'tiktok' && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.08a8.27 8.27 0 004.76 1.5V7.13a4.83 4.83 0 01-1-.44z" fill="#fff"/>
        </svg>
      )}
      {platform === 'linkedin' && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="#fff"/>
        </svg>
      )}
    </div>
  );
}

function formatDollar(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) return `${n < 0 ? '-' : ''}$${(abs / 1000).toFixed(1)}k`;
  return `${n < 0 ? '-' : ''}$${abs.toLocaleString()}`;
}

function PlatformCard({ platform, spend, revenue, showUtmBanner }: { platform: string; spend: number; revenue: number; showUtmBanner: boolean }) {
  const meta = PLATFORM_META[platform];
  if (!meta) return null;
  const profit = revenue - spend;
  const roas = spend > 0 ? revenue / spend : 0;

  const dismissKey = `metrichq-utm-dismissed-${platform}`;
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(dismissKey) === '1');
  }, [dismissKey]);

  const handleDismiss = () => {
    localStorage.setItem(dismissKey, '1');
    setDismissed(true);
  };

  const utmVisible = showUtmBanner && !dismissed;

  return (
    <div className="w-[220px] bg-bg-surface rounded-xl border border-border-dim p-4">
      <div className="flex items-center gap-2.5 mb-3">
        <PlatformLogo platform={platform} />
        <span className="text-[13px] font-medium text-text-heading">{meta.label}</span>
      </div>
      <div className="space-y-0.5 mb-3">
        <p className="text-[12px] text-text-body">Spent {formatDollar(spend)}</p>
        <p className="text-[12px] text-text-body">Revenue {formatDollar(revenue)}</p>
      </div>
      <p className={`text-[20px] font-bold ${profit >= 0 ? 'text-success' : 'text-error'}`}>
        {profit >= 0 ? '+' : ''}{formatDollar(profit)}
      </p>
      {spend > 0 && (
        <p className="text-[11px] text-text-dim mt-1">ROAS {roas.toFixed(1)}x</p>
      )}

      {utmVisible && (
        <div className="mt-3 bg-warning/10 border border-warning/25 rounded-lg p-2.5 relative">
          <button
            onClick={handleDismiss}
            className="absolute top-1.5 right-1.5 text-warning/60 hover:text-warning transition-colors"
          >
            <X size={12} />
          </button>
          <div className="flex flex-col items-center text-center pr-0">
            <AlertTriangle size={14} className="text-warning mb-1.5" />
            <p className="text-[11px] text-text-body leading-snug">
              Revenue isn&apos;t linked to {meta.label} campaigns.{' '}
              <a
                href={meta.utmHelpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-warning font-medium underline underline-offset-2 hover:text-warning/80"
              >
                Set up UTM tracking
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function OrganicCard({ revenue }: { revenue: number }) {
  return (
    <div className="w-[220px] bg-bg-surface rounded-xl border border-border-dim p-4">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg bg-bg-elevated flex items-center justify-center flex-shrink-0">
          <Globe size={14} className="text-text-dim" />
        </div>
        <span className="text-[13px] font-medium text-text-heading">Organic</span>
      </div>
      <div className="space-y-0.5 mb-3">
        <p className="text-[12px] text-text-body">Spent —</p>
        <p className="text-[12px] text-text-body">Revenue {formatDollar(revenue)}</p>
      </div>
      <p className="text-[20px] font-bold text-success">+{formatDollar(revenue)}</p>
    </div>
  );
}

function ConnectCard() {
  return (
    <Link
      href="/integrations"
      className="w-[220px] rounded-xl border border-dashed border-border-dim p-4 flex flex-col items-center justify-center gap-2 hover:bg-bg-hover transition-colors min-h-[140px]"
    >
      <Plus size={20} className="text-text-dim" />
      <span className="text-[12px] text-text-dim">Connect platform</span>
    </Link>
  );
}

export default function MarketingAttribution({ platforms, unattributedRevenue, totalRevenue = 0 }: MarketingAttributionProps) {
  const adPlatforms = Object.entries(platforms).filter(([key]) => key !== 'stripe');
  const hasRevenue = totalRevenue > 0;

  return (
    <div className="flex flex-wrap gap-4 justify-center">
      {adPlatforms.map(([platform, data]) => (
        <PlatformCard
          key={platform}
          platform={platform}
          spend={data.totalSpend}
          revenue={data.totalRevenue || 0}
          showUtmBanner={hasRevenue && data.totalSpend > 0 && (data.totalRevenue || 0) === 0}
        />
      ))}
      {unattributedRevenue > 0 && <OrganicCard revenue={unattributedRevenue} />}
      <ConnectCard />
    </div>
  );
}
