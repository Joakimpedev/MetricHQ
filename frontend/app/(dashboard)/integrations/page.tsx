'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { CheckCircle, Circle, ExternalLink, X } from 'lucide-react';
import ConnectPostHogForm from '../../../components/ConnectPostHogForm';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

interface Connections {
  [platform: string]: {
    connected: boolean;
    accountId: string;
    updatedAt: string;
  };
}

function StatusBadge({ connected }: { connected: boolean }) {
  return connected ? (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
      <CheckCircle size={11} /> Connected
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-text-dim bg-bg-elevated px-2 py-0.5 rounded">
      <Circle size={11} /> Not connected
    </span>
  );
}

export default function IntegrationsPage() {
  const { user } = useUser();
  const [connections, setConnections] = useState<Connections>({});
  const [loading, setLoading] = useState(true);
  const [showPostHogModal, setShowPostHogModal] = useState(false);

  const fetchConnections = useCallback(async () => {
    if (!user?.id) return;
    try {
      const params = new URLSearchParams({ userId: user.id });
      const response = await fetch(`${API_URL}/api/connections?${params}`);
      const json = await response.json();
      if (response.ok) {
        setConnections(json.connections || {});
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchConnections(); }, [fetchConnections]);

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-[20px] font-bold text-text-heading">Integrations</h1>

      {/* TikTok */}
      <div className="bg-bg-surface rounded-xl border border-border-dim p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-[14px] font-medium text-text-heading">TikTok Ads</h2>
            <p className="text-[12px] text-text-dim mt-0.5">Campaign spend and performance</p>
          </div>
          <StatusBadge connected={!!connections.tiktok} />
        </div>
        <a
          href={`${API_URL}/auth/tiktok?userId=${encodeURIComponent(user?.id ?? '')}`}
          className="inline-flex items-center gap-1.5 bg-bg-elevated hover:bg-border-dim px-4 py-2 rounded-lg text-[12px] font-medium text-text-body hover:text-text-heading transition-colors"
        >
          {connections.tiktok ? 'Reconnect' : 'Connect'}
          <ExternalLink size={12} />
        </a>
      </div>

      {/* Meta */}
      <div className="bg-bg-surface rounded-xl border border-border-dim p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-[14px] font-medium text-text-heading">Meta Ads</h2>
            <p className="text-[12px] text-text-dim mt-0.5">Facebook & Instagram ad spend</p>
          </div>
          <StatusBadge connected={!!connections.meta} />
        </div>
        <a
          href={`${API_URL}/auth/meta?userId=${encodeURIComponent(user?.id ?? '')}`}
          className="inline-flex items-center gap-1.5 bg-bg-elevated hover:bg-border-dim px-4 py-2 rounded-lg text-[12px] font-medium text-text-body hover:text-text-heading transition-colors"
        >
          {connections.meta ? 'Reconnect' : 'Connect'}
          <ExternalLink size={12} />
        </a>
      </div>

      {/* PostHog */}
      <div className="bg-bg-surface rounded-xl border border-border-dim p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-[14px] font-medium text-text-heading">PostHog</h2>
            <p className="text-[12px] text-text-dim mt-0.5">Revenue and purchase data</p>
          </div>
          <StatusBadge connected={!!connections.posthog} />
        </div>
        <button
          onClick={() => setShowPostHogModal(true)}
          className="inline-flex items-center gap-1.5 bg-bg-elevated hover:bg-border-dim px-4 py-2 rounded-lg text-[12px] font-medium text-text-body hover:text-text-heading transition-colors"
        >
          {connections.posthog ? 'Update credentials' : 'Connect'}
        </button>
      </div>

      {/* PostHog Modal */}
      {showPostHogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowPostHogModal(false)} />
          <div className="relative bg-bg-surface border border-border rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[15px] font-semibold text-text-heading">Connect PostHog</h2>
              <button
                onClick={() => setShowPostHogModal(false)}
                className="text-text-dim hover:text-text-body transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <ConnectPostHogForm
              userId={user?.id}
              onSuccess={() => {
                setShowPostHogModal(false);
                fetchConnections();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
