'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';


interface ConnectPostHogFormProps {
  userId?: string;
  existingProjectId?: string;
  onSuccess?: () => void;
}

export default function ConnectPostHogForm({ userId, existingProjectId, onSuccess }: ConnectPostHogFormProps) {
  const [apiKey, setApiKey] = useState('');
  const [projectId, setProjectId] = useState(existingProjectId || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setMessage({ type: 'error', text: 'Sign in to save PostHog settings.' });
      return;
    }
    if (!apiKey.trim() || !projectId.trim()) {
      setMessage({ type: 'error', text: 'API key and Project ID are required.' });
      return;
    }
    setMessage(null);
    setLoading(true);
    try {
      const response = await apiFetch(`/api/settings/posthog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          apiKey: apiKey.trim(),
          projectId: projectId.trim()
        })
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to save.' });
        return;
      }
      setMessage({ type: 'success', text: 'PostHog connected.' });
      setApiKey('');
      setProjectId('');
      onSuccess?.();
    } catch {
      setMessage({ type: 'error', text: 'Network error.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="posthog-api-key" className="block text-[11px] font-medium uppercase tracking-wider text-text-dim mb-1.5">
          API Key
        </label>
        <input
          id="posthog-api-key"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="phx_..."
          className="w-full bg-bg-body border border-border-dim rounded-lg px-3 py-2.5 text-[13px] text-text-heading placeholder-text-dim/40 focus:outline-none focus:border-accent/40 transition-colors"
          autoComplete="off"
        />
      </div>
      <div>
        <label htmlFor="posthog-project-id" className="block text-[11px] font-medium uppercase tracking-wider text-text-dim mb-1.5">
          Project ID
        </label>
        <input
          id="posthog-project-id"
          type="text"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          placeholder="12345"
          className="w-full bg-bg-body border border-border-dim rounded-lg px-3 py-2.5 text-[13px] text-text-heading placeholder-text-dim/40 focus:outline-none focus:border-accent/40 transition-colors"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-accent hover:bg-accent-hover disabled:opacity-50 px-5 py-2.5 rounded-lg text-[13px] font-medium text-white transition-colors"
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
        {message && (
          <p className={`text-[12px] ${message.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}
