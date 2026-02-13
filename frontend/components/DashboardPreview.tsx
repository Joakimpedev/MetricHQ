import { TrendingUp, TrendingDown } from 'lucide-react';

/* ── Hardcoded sample data ─────────────────────────────── */

const KPI_DATA = [
  { label: 'Profit', value: '+$4,280', pct: 12.3, up: true },
  { label: 'Revenue', value: '$18,450', pct: 8.1, up: true },
  { label: 'Ad Spend', value: '$14,170', pct: 5.2, up: true, invert: true },
];

const PLATFORMS = [
  { key: 'google_ads', label: 'Google Ads', color: '#4285f4', spend: 6240, revenue: 9810, profit: 3570, roas: 1.6 },
  { key: 'meta', label: 'Meta Ads', color: '#1877f2', spend: 4930, revenue: 5620, profit: 690, roas: 1.1 },
  { key: 'linkedin', label: 'LinkedIn Ads', color: '#0a66c2', spend: 3000, revenue: 3020, profit: 20, roas: 1.0 },
];

const COUNTRIES = [
  { code: 'us', name: 'United States', spend: 5_820, purchases: 94, profit: 2_140, cpa: 61.91 },
  { code: 'gb', name: 'United Kingdom', spend: 3_410, purchases: 52, profit: 1_280, cpa: 65.58 },
  { code: 'de', name: 'Germany', spend: 2_740, purchases: 38, profit: 610, cpa: 72.11 },
  { code: 'no', name: 'Norway', spend: 2_200, purchases: 21, profit: 250, cpa: 104.76 },
];

/* 14-day profit trend, normalised 0–1 for the SVG chart */
const CHART_POINTS = [0.22, 0.35, 0.28, 0.42, 0.38, 0.55, 0.48, 0.62, 0.57, 0.72, 0.65, 0.78, 0.82, 0.90];

/* ── Inline SVG logos (same as MarketingAttribution) ───── */

function PlatformLogo({ platform, color }: { platform: string; color: string }) {
  return (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: color }}>
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
      {platform === 'linkedin' && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="#fff"/>
        </svg>
      )}
    </div>
  );
}

/* ── Chart ──────────────────────────────────────────────── */

function MiniAreaChart() {
  const W = 500;
  const H = 120;
  const PAD_Y = 10;
  const step = W / (CHART_POINTS.length - 1);

  const points = CHART_POINTS.map((v, i) => ({
    x: i * step,
    y: H - PAD_Y - v * (H - 2 * PAD_Y),
  }));

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
  const areaPath = `M${points[0].x},${H} ${points.map(p => `L${p.x},${p.y}`).join(' ')} L${points[points.length - 1].x},${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[100px]" preserveAspectRatio="none">
      <defs>
        <linearGradient id="preview-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#preview-grad)" />
      <polyline points={polyline} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Main component ────────────────────────────────────── */

export default function DashboardPreview() {
  return (
    <div className="rounded-2xl border border-border-dim bg-bg-surface shadow-lg pointer-events-none select-none overflow-hidden">
      {/* KPI bar */}
      <div className="grid grid-cols-3 gap-px bg-border-dim/40">
        {KPI_DATA.map(kpi => {
          const isGood = kpi.invert ? !kpi.up : kpi.up;
          const Icon = kpi.up ? TrendingUp : TrendingDown;
          return (
            <div key={kpi.label} className="bg-bg-surface p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wider text-text-dim">
                  {kpi.label}
                </span>
                <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${isGood ? 'text-success' : 'text-error'}`}>
                  <Icon size={12} />
                  +{kpi.pct}%
                </span>
              </div>
              <p className="text-[28px] font-bold tracking-tight mt-1.5 leading-none text-text-heading">
                {kpi.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Area chart */}
      <div className="px-5 pt-4 pb-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-text-dim mb-2">Profit — Last 14 days</p>
        <MiniAreaChart />
      </div>

      {/* Platform attribution cards */}
      <div className="px-5 py-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-text-dim mb-3">Attribution</p>
        <div className="grid grid-cols-3 gap-3">
          {PLATFORMS.map(p => {
            const profitColor = p.profit >= 0 ? 'text-success' : 'text-error';
            return (
              <div key={p.key} className="rounded-xl border border-border-dim p-3">
                <div className="flex items-center gap-2 mb-2.5">
                  <PlatformLogo platform={p.key} color={p.color} />
                  <span className="text-[13px] font-medium text-text-heading">{p.label}</span>
                </div>
                <div className="space-y-0.5 mb-2.5">
                  <p className="text-[12px] text-text-body">Spent ${p.spend.toLocaleString()}</p>
                  <p className="text-[12px] text-text-body">Revenue ${p.revenue.toLocaleString()}</p>
                </div>
                <p className={`text-[20px] font-bold ${profitColor}`}>
                  {p.profit >= 0 ? '+' : ''}${Math.abs(p.profit).toLocaleString()}
                </p>
                <p className="text-[11px] text-text-dim mt-1">ROAS {p.roas.toFixed(1)}x</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Country table */}
      <div className="px-5 pb-5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-text-dim mb-3">Countries</p>
        <div className="rounded-xl border border-border-dim overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_5rem_4.5rem_5.5rem_4.5rem] gap-2 px-4 py-2 border-b border-border-dim">
            <span className="text-[10px] uppercase tracking-wider text-text-dim">Country</span>
            <span className="text-[10px] uppercase tracking-wider text-text-dim text-right">Spend</span>
            <span className="text-[10px] uppercase tracking-wider text-text-dim text-right">Purch.</span>
            <span className="text-[10px] uppercase tracking-wider text-text-dim text-right">Profit</span>
            <span className="text-[10px] uppercase tracking-wider text-text-dim text-right">CPA</span>
          </div>
          {/* Rows */}
          {COUNTRIES.map(c => (
            <div
              key={c.code}
              className="grid grid-cols-[1fr_5rem_4.5rem_5.5rem_4.5rem] gap-2 px-4 py-2.5 border-b border-border-dim/40 last:border-0 items-center"
            >
              <div className="flex items-center gap-2">
                <img
                  src={`https://flagcdn.com/w40/${c.code}.png`}
                  alt={c.code}
                  className="w-5 h-3.5 object-cover rounded-[2px] shrink-0"
                />
                <span className="text-[13px] font-medium text-text-heading">{c.name}</span>
              </div>
              <span className="text-[12px] text-text-body text-right">${c.spend.toLocaleString()}</span>
              <span className="text-[12px] text-text-body text-right">{c.purchases}</span>
              <span className={`text-[12px] font-semibold text-right ${c.profit >= 0 ? 'text-success' : 'text-error'}`}>
                +${c.profit.toLocaleString()}
              </span>
              <span className="text-[12px] text-text-body text-right">${c.cpa.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
