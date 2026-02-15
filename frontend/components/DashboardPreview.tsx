'use client';

import { useState, useRef, useEffect } from 'react';
import { useTheme } from './ThemeProvider';

export default function DashboardPreview() {
  const [loaded, setLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { theme } = useTheme();

  // Sync theme to iframe
  useEffect(() => {
    if (!loaded || !iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage({ type: 'theme', theme }, '*');
  }, [theme, loaded]);

  return (
    <div className="rounded-2xl border-2 border-accent/20 bg-bg-surface shadow-[0_8px_40px_-8px_rgba(0,0,0,0.15),0_4px_16px_-4px_rgba(0,0,0,0.1)] overflow-hidden ring-1 ring-accent/[0.08]">
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
      <div className="relative" style={{ height: '820px' }}>
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg-body">
            <div className="text-text-dim text-[13px]">Loading dashboard...</div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src="/dashboard?demo=true&embed=true"
          title="MetricHQ Dashboard Demo"
          className="w-full h-full border-0"
          onLoad={() => setLoaded(true)}
        />
      </div>
    </div>
  );
}
