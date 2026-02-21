'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSubscription } from './SubscriptionProvider';
import { Key, Copy, MoreHorizontal, X } from 'lucide-react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';


interface ApiKey {
  id: number;
  name: string | null;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export default function ApiKeysSection() {
  const { user } = useUser();
  const { subscription } = useSubscription();
  const isPro = subscription?.isActive && subscription?.plan === 'pro';

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Always fetch keys regardless of plan (so we can show suspended state)
  useEffect(() => {
    if (user?.id) fetchKeys();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function fetchKeys() {
    try {
      const res = await apiFetch(`/api/settings/api-keys?userId=${user!.id}`);
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || []);
      }
    } catch {}
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenError('');
    try {
      const res = await apiFetch(`/api/settings/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user!.id, name: keyName.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenError(data.error || 'Failed to generate key');
        return;
      }
      setGeneratedKey(data.key);
      fetchKeys();
    } catch {
      setGenError('Network error');
    } finally {
      setGenerating(false);
    }
  }

  async function handleRevoke(keyId: number) {
    try {
      await apiFetch(`/api/settings/api-keys/${keyId}?userId=${user!.id}`, {
        method: 'DELETE',
      });
      setKeys(prev => prev.map(k => k.id === keyId ? { ...k, revoked_at: new Date().toISOString() } : k));
      setMenuOpen(null);
    } catch {}
  }

  function copyKey() {
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const activeKeys = keys.filter(k => !k.revoked_at);
  const revokedKeys = keys.filter(k => k.revoked_at);

  // Not Pro and no existing keys — show simple upgrade prompt
  if (!isPro && activeKeys.length === 0 && revokedKeys.length === 0) {
    return (
      <div className="bg-bg-surface rounded-xl border border-border-dim p-5 opacity-60">
        <h2 className="text-[14px] font-medium text-text-heading mb-2">API Keys</h2>
        <p className="text-[12px] text-text-dim mb-3">Access your metrics programmatically via the REST API.</p>
        <Link href="/pricing" className="text-[12px] text-accent hover:text-accent-hover font-medium transition-colors">
          Upgrade to Pro
        </Link>
      </div>
    );
  }

  // Not Pro but has existing keys — show suspended state
  if (!isPro && (activeKeys.length > 0 || revokedKeys.length > 0)) {
    return (
      <div className="bg-bg-surface rounded-xl border border-border-dim p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14px] font-medium text-text-heading">API Keys</h2>
          <span className="text-[10px] font-semibold uppercase tracking-wider bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded-full">
            Suspended
          </span>
        </div>

        <div className="mb-4 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
          <p className="text-[12px] text-yellow-700 dark:text-yellow-300">
            Your API keys are saved but inactive.{' '}
            <Link href="/pricing" className="text-accent hover:text-accent-hover font-medium underline underline-offset-2">
              Upgrade to Pro
            </Link>{' '}
            to reactivate.
          </p>
        </div>

        <div className="space-y-0 opacity-60">
          {activeKeys.map(key => (
            <div key={key.id} className="flex items-center justify-between py-2.5 border-t border-border-dim first:border-t-0">
              <div className="flex items-center gap-3">
                <span className="text-[12px] text-text-heading font-mono">{key.key_prefix}</span>
                {key.name && <span className="text-[11px] text-text-dim">{key.name}</span>}
              </div>
              <span className="text-[11px] text-text-dim">Created {formatDate(key.created_at)}</span>
            </div>
          ))}
          {revokedKeys.map(key => (
            <div key={key.id} className="flex items-center justify-between py-2.5 border-t border-border-dim opacity-40">
              <div className="flex items-center gap-3">
                <span className="text-[12px] text-text-heading font-mono line-through">{key.key_prefix}</span>
                {key.name && <span className="text-[11px] text-text-dim line-through">{key.name}</span>}
              </div>
              <span className="text-[11px] text-text-dim">Revoked</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-bg-surface rounded-xl border border-border-dim p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14px] font-medium text-text-heading">API Keys</h2>
          <button
            onClick={() => { setShowModal(true); setKeyName(''); setGeneratedKey(''); setGenError(''); }}
            className="flex items-center gap-1.5 text-[12px] font-medium text-accent hover:text-accent-hover transition-colors"
          >
            <Key size={14} />
            Generate key
          </button>
        </div>

        {activeKeys.length === 0 && revokedKeys.length === 0 ? (
          <p className="text-[12px] text-text-dim">No API keys yet. Generate one to get started.</p>
        ) : (
          <div className="space-y-0">
            {activeKeys.map(key => (
              <div key={key.id} className="flex items-center justify-between py-2.5 border-t border-border-dim first:border-t-0">
                <div className="flex items-center gap-3">
                  <span className="text-[12px] text-text-heading font-mono">{key.key_prefix}</span>
                  {key.name && <span className="text-[11px] text-text-dim">{key.name}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-text-dim">
                    {key.last_used_at ? `Used ${formatDate(key.last_used_at)}` : `Created ${formatDate(key.created_at)}`}
                  </span>
                  <div className="relative" ref={menuOpen === key.id ? menuRef : undefined}>
                    <button
                      onClick={() => setMenuOpen(menuOpen === key.id ? null : key.id)}
                      className="p-1 rounded hover:bg-bg-elevated transition-colors"
                    >
                      <MoreHorizontal size={14} className="text-text-dim" />
                    </button>
                    {menuOpen === key.id && (
                      <div className="absolute right-0 top-full mt-1 bg-bg-surface border border-border-dim rounded-lg shadow-lg z-10 py-1 min-w-[120px]">
                        <button
                          onClick={() => handleRevoke(key.id)}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-error hover:bg-bg-elevated transition-colors"
                        >
                          Revoke
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {revokedKeys.map(key => (
              <div key={key.id} className="flex items-center justify-between py-2.5 border-t border-border-dim opacity-40">
                <div className="flex items-center gap-3">
                  <span className="text-[12px] text-text-heading font-mono line-through">{key.key_prefix}</span>
                  {key.name && <span className="text-[11px] text-text-dim line-through">{key.name}</span>}
                </div>
                <span className="text-[11px] text-text-dim">Revoked</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate Key Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => !generatedKey && setShowModal(false)}>
          <div className="bg-bg-surface border border-border-dim rounded-xl p-5 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-medium text-text-heading">
                {generatedKey ? 'API key created' : 'Generate API key'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-bg-elevated transition-colors">
                <X size={16} className="text-text-dim" />
              </button>
            </div>

            {!generatedKey ? (
              <>
                <input
                  type="text"
                  placeholder="Key name (optional)"
                  value={keyName}
                  onChange={e => setKeyName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                  className="w-full px-3 py-2 text-[12px] bg-bg-elevated border border-border-dim rounded-lg text-text-heading placeholder:text-text-dim focus:outline-none focus:border-accent"
                />
                {genError && <p className="text-[11px] text-error mt-2">{genError}</p>}
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="mt-3 w-full py-2 bg-accent text-white text-[12px] font-medium rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
                >
                  {generating ? 'Generating...' : 'Generate key'}
                </button>
              </>
            ) : (
              <>
                <p className="text-[12px] text-text-body mb-1">Copy your API key now. It won't be shown again.</p>
                <p className="text-[11px] text-error mb-3">Store this key securely.</p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={generatedKey}
                    className="flex-1 px-3 py-2 text-[11px] font-mono bg-bg-elevated border border-border-dim rounded-lg text-text-heading"
                  />
                  <button
                    onClick={copyKey}
                    className="flex items-center gap-1 px-3 py-2 text-[12px] font-medium bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
                  >
                    <Copy size={12} />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
