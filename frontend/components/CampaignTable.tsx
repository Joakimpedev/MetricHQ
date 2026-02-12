interface Campaign {
  campaignId?: string;
  campaignName?: string;
  spend: number;
  impressions: number;
  clicks: number;
}

interface CampaignTableProps {
  platform: string;
  totalSpend: number;
  campaigns: Campaign[];
}

export default function CampaignTable({ platform, totalSpend, campaigns }: CampaignTableProps) {
  const label = platform === 'tiktok' ? 'TikTok Ads' : platform === 'meta' ? 'Meta Ads' : platform;

  return (
    <div className="bg-bg-surface rounded-xl border border-border-dim overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-dim">
        <h3 className="text-[13px] font-medium text-text-heading">{label}</h3>
        <span className="text-[11px] text-text-dim">
          ${totalSpend.toLocaleString()} total
        </span>
      </div>
      <div>
        {campaigns.map((c, i) => {
          const name = c.campaignName || c.campaignId || `Campaign ${i + 1}`;
          const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(2) : '0.00';

          return (
            <div
              key={name + i}
              className="flex items-center justify-between px-5 py-3 border-b border-border-dim/40 last:border-0 hover:bg-bg-hover transition-colors"
            >
              <span className="text-[13px] font-medium text-text-heading truncate mr-4">{name}</span>
              <div className="flex items-center gap-4 shrink-0">
                <span className="text-[12px] text-text-body">${c.spend.toLocaleString()}</span>
                <div className="flex items-center gap-3 text-[11px] text-text-dim">
                  <span>{c.impressions.toLocaleString()} impr</span>
                  <span>{c.clicks.toLocaleString()} clicks</span>
                  <span>{ctr}% CTR</span>
                </div>
              </div>
            </div>
          );
        })}
        {campaigns.length === 0 && (
          <div className="px-5 py-8 text-center text-text-dim text-[12px]">
            No campaign data available
          </div>
        )}
      </div>
    </div>
  );
}
