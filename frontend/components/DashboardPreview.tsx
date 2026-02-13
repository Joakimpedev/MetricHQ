'use client';

import { useState } from 'react';

export default function DashboardPreview() {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="rounded-2xl border border-border-dim bg-bg-surface shadow-lg overflow-hidden">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 py-3 bg-bg-elevated border-b border-border-dim">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 mx-2">
          <div className="bg-bg-body rounded-md px-3 py-1.5 text-[12px] text-text-dim text-center truncate">
            metrichq.vercel.app/dashboard
          </div>
        </div>
      </div>

      {/* Iframe */}
      <div className="relative" style={{ height: '700px' }}>
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg-body">
            <div className="text-text-dim text-[13px]">Loading dashboard...</div>
          </div>
        )}
        <iframe
          src="/dashboard?demo=true&embed=true"
          title="MetricHQ Dashboard Demo"
          className="w-full h-full border-0"
          onLoad={() => setLoaded(true)}
        />
      </div>
    </div>
  );
}
