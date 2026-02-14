'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSubscription } from './SubscriptionProvider';
import { UserPlus, Copy, MoreHorizontal, Trash2, X } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

interface TeamMember {
  id: number;
  email: string;
  status: string;
  invited_at: string;
  accepted_at: string | null;
}

export default function TeamSection() {
  const { user } = useUser();
  const { subscription } = useSubscription();
  const isPro = subscription?.isActive && subscription?.plan === 'pro';

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [teamActive, setTeamActive] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.id) fetchMembers();
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

  async function fetchMembers() {
    try {
      const res = await fetch(`${API_URL}/api/team?userId=${user!.id}`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        setTeamActive(data.teamActive ?? true);
      }
    } catch {}
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    setInviteError('');
    setInviteLink('');
    try {
      const res = await fetch(`${API_URL}/api/team/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user!.id, email: inviteEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error || 'Failed to invite');
        return;
      }
      setInviteLink(data.inviteLink);
      fetchMembers();
    } catch {
      setInviteError('Network error');
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleRemove(memberId: number) {
    try {
      await fetch(`${API_URL}/api/team/members/${memberId}?userId=${user!.id}`, {
        method: 'DELETE',
      });
      setMembers(prev => prev.filter(m => m.id !== memberId));
      setMenuOpen(null);
    } catch {}
  }

  function copyLink() {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Not Pro and no existing members — show simple upgrade prompt
  if (!isPro && members.length === 0) {
    return (
      <div className="bg-bg-surface rounded-xl border border-border-dim p-5 opacity-60">
        <h2 className="text-[14px] font-medium text-text-heading mb-2">Team</h2>
        <p className="text-[12px] text-text-dim mb-3">Invite team members to view your dashboard and metrics.</p>
        <Link href="/pricing" className="text-[12px] text-accent hover:text-accent-hover font-medium transition-colors">
          Upgrade to Pro
        </Link>
      </div>
    );
  }

  // Not Pro but has existing members — show suspended state
  if (!isPro && members.length > 0) {
    return (
      <div className="bg-bg-surface rounded-xl border border-border-dim p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14px] font-medium text-text-heading">Team</h2>
          <span className="text-[10px] font-semibold uppercase tracking-wider bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded-full">
            Paused
          </span>
        </div>

        <div className="mb-4 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
          <p className="text-[12px] text-yellow-700 dark:text-yellow-300">
            Team access is paused. Your members are preserved.{' '}
            <Link href="/pricing" className="text-accent hover:text-accent-hover font-medium underline underline-offset-2">
              Upgrade to Pro
            </Link>{' '}
            to restore access for your team.
          </p>
        </div>

        <div className="space-y-0 opacity-60">
          {members.map(member => (
            <div key={member.id} className="flex items-center justify-between py-2.5 border-t border-border-dim first:border-t-0">
              <div className="flex items-center gap-3">
                <span className="text-[12px] text-text-heading">{member.email}</span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                  member.status === 'accepted'
                    ? 'bg-green-500/15 text-success'
                    : 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400'
                }`}>
                  {member.status}
                </span>
              </div>
              <span className="text-[11px] text-text-dim">{formatDate(member.invited_at)}</span>
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
          <h2 className="text-[14px] font-medium text-text-heading">Team</h2>
          <button
            onClick={() => { setShowInviteModal(true); setInviteEmail(''); setInviteLink(''); setInviteError(''); }}
            className="flex items-center gap-1.5 text-[12px] font-medium text-accent hover:text-accent-hover transition-colors"
          >
            <UserPlus size={14} />
            Invite member
          </button>
        </div>

        {members.length === 0 ? (
          <p className="text-[12px] text-text-dim">No team members yet. Invite someone to get started.</p>
        ) : (
          <div className="space-y-0">
            {members.map(member => (
              <div key={member.id} className="flex items-center justify-between py-2.5 border-t border-border-dim first:border-t-0">
                <div className="flex items-center gap-3">
                  <span className="text-[12px] text-text-heading">{member.email}</span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                    member.status === 'accepted'
                      ? 'bg-green-500/15 text-success'
                      : 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400'
                  }`}>
                    {member.status}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-text-dim">{formatDate(member.invited_at)}</span>
                  <div className="relative" ref={menuOpen === member.id ? menuRef : undefined}>
                    <button
                      onClick={() => setMenuOpen(menuOpen === member.id ? null : member.id)}
                      className="p-1 rounded hover:bg-bg-elevated transition-colors"
                    >
                      <MoreHorizontal size={14} className="text-text-dim" />
                    </button>
                    {menuOpen === member.id && (
                      <div className="absolute right-0 top-full mt-1 bg-bg-surface border border-border-dim rounded-lg shadow-lg z-10 py-1 min-w-[120px]">
                        <button
                          onClick={() => handleRemove(member.id)}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-error hover:bg-bg-elevated transition-colors"
                        >
                          <Trash2 size={12} />
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowInviteModal(false)}>
          <div className="bg-bg-surface border border-border-dim rounded-xl p-5 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-medium text-text-heading">Invite team member</h3>
              <button onClick={() => setShowInviteModal(false)} className="p-1 rounded hover:bg-bg-elevated transition-colors">
                <X size={16} className="text-text-dim" />
              </button>
            </div>

            {!inviteLink ? (
              <>
                <input
                  type="email"
                  placeholder="Email address"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleInvite()}
                  className="w-full px-3 py-2 text-[12px] bg-bg-elevated border border-border-dim rounded-lg text-text-heading placeholder:text-text-dim focus:outline-none focus:border-accent"
                />
                {inviteError && <p className="text-[11px] text-error mt-2">{inviteError}</p>}
                <button
                  onClick={handleInvite}
                  disabled={inviteLoading || !inviteEmail.trim()}
                  className="mt-3 w-full py-2 bg-accent text-white text-[12px] font-medium rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
                >
                  {inviteLoading ? 'Sending...' : 'Send invite'}
                </button>
              </>
            ) : (
              <>
                <p className="text-[12px] text-text-body mb-3">Share this link with your team member:</p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={inviteLink}
                    className="flex-1 px-3 py-2 text-[11px] font-mono bg-bg-elevated border border-border-dim rounded-lg text-text-heading"
                  />
                  <button
                    onClick={copyLink}
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
