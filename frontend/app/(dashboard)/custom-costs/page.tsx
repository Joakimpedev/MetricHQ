'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { Plus, Search, DollarSign, MoreVertical, Pencil, Trash2, ChevronRight } from 'lucide-react';
import CustomCostModal from '../../../components/CustomCostModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

interface CustomCost {
  id: number;
  name: string;
  category: string | null;
  cost_type: string;
  currency: string;
  amount: string | null;
  percentage: string | null;
  base_metric: string | null;
  repeat: boolean;
  repeat_interval: string | null;
  start_date: string;
  end_date: string | null;
  created_at: string;
}

function formatAmount(cost: CustomCost): string {
  if (cost.cost_type === 'variable') {
    return `${parseFloat(cost.percentage || '0')}%`;
  }
  const amt = parseFloat(cost.amount || '0');
  const sym = cost.currency === 'EUR' ? '€' : cost.currency === 'GBP' ? '£' : cost.currency === 'NOK' ? 'kr ' : '$';
  return `${sym}${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  const dateStr = String(d).slice(0, 10);
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const BASE_METRIC_LABELS: Record<string, string> = {
  revenue: 'Revenue',
  profit: 'Profit',
  google_ads_spend: 'Google Ads Spend',
  meta_spend: 'Meta Spend',
  tiktok_spend: 'TikTok Spend',
  linkedin_spend: 'LinkedIn Spend',
  total_ad_spend: 'Total Ad Spend',
};

export default function CustomCostsPage() {
  const { user } = useUser();
  const [costs, setCosts] = useState<CustomCost[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<CustomCost | null>(null);
  const [openMenu, setOpenMenu] = useState<number | string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const limit = 20;

  const fetchCosts = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ userId: user.id, page: String(page), limit: String(limit) });
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`${API_URL}/api/custom-costs?${params}`);
      const json = await res.json();
      if (res.ok) {
        setCosts(json.costs);
        setTotal(json.total);
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [user?.id, page, search]);

  useEffect(() => { fetchCosts(); }, [fetchCosts]);

  // Close menu on outside click
  useEffect(() => {
    if (openMenu === null) return;
    const handler = () => setOpenMenu(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [openMenu]);

  // Group costs by name+category
  interface CostGroup {
    key: string;
    name: string;
    category: string | null;
    costs: CustomCost[];
    totalAmount: number;
    currency: string;
    earliestStart: string;
    latestEnd: string | null;
  }

  const groupedCosts = useMemo(() => {
    const map: Record<string, CostGroup> = {};
    for (const cost of costs) {
      const key = `${cost.name}|||${cost.category || ''}`;
      if (!map[key]) {
        map[key] = {
          key,
          name: cost.name,
          category: cost.category,
          costs: [],
          totalAmount: 0,
          currency: cost.currency,
          earliestStart: cost.start_date,
          latestEnd: cost.end_date,
        };
      }
      const g = map[key];
      g.costs.push(cost);
      g.totalAmount += parseFloat(cost.amount || '0');
      if (cost.start_date < g.earliestStart) g.earliestStart = cost.start_date;
      if (cost.end_date && (!g.latestEnd || cost.end_date > g.latestEnd)) g.latestEnd = cost.end_date;
      if (!cost.end_date) g.latestEnd = null; // ongoing trumps any end date
    }
    return Object.values(map);
  }, [costs]);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleDeleteGroup = async (group: CostGroup) => {
    if (!user?.id) return;
    try {
      await Promise.all(group.costs.map(c =>
        fetch(`${API_URL}/api/custom-costs/${c.id}?userId=${encodeURIComponent(user.id)}`, { method: 'DELETE' })
      ));
      fetchCosts();
    } catch {
      // silently ignore
    }
  };

  const handleAddAnother = (group: CostGroup) => {
    // Pre-fill a new cost with same name/category/currency
    setEditingCost({ id: 0, name: group.name, category: group.category, cost_type: 'fixed', currency: group.currency, amount: null, percentage: null, base_metric: null, repeat: false, repeat_interval: null, start_date: new Date().toISOString().slice(0, 10), end_date: null, created_at: '' } as CustomCost);
    setModalOpen(true);
    setOpenMenu(null);
  };

  const handleDelete = async (id: number) => {
    if (!user?.id) return;
    try {
      await fetch(`${API_URL}/api/custom-costs/${id}?userId=${encodeURIComponent(user.id)}`, { method: 'DELETE' });
      fetchCosts();
    } catch {
      // silently ignore
    }
  };

  const handleEdit = (cost: CustomCost) => {
    setEditingCost(cost);
    setModalOpen(true);
    setOpenMenu(null);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-[1000px] mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
          <input
            type="text"
            placeholder="Search costs..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 text-[13px] bg-bg-surface border border-border-dim rounded-lg text-text-body placeholder:text-text-dim/50 focus:outline-none focus:border-accent"
          />
        </div>
        <button
          onClick={() => { setEditingCost(null); setModalOpen(true); }}
          className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-accent-text px-4 py-2 rounded-lg text-[13px] font-medium transition-colors"
        >
          <Plus size={15} />
          Add cost
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-bg-surface rounded-xl border border-border-dim overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-5 py-4 border-b border-border-dim/40 last:border-0">
              <div className="h-4 bg-bg-elevated animate-pulse rounded-lg w-3/4" />
            </div>
          ))}
        </div>
      ) : costs.length === 0 ? (
        <div className="bg-bg-surface rounded-xl border border-border-dim p-12 flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-bg-elevated flex items-center justify-center">
            <DollarSign size={22} className="text-text-dim" />
          </div>
          <p className="text-text-dim text-[13px]">No custom costs yet</p>
          <button
            onClick={() => { setEditingCost(null); setModalOpen(true); }}
            className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-accent-text px-4 py-2 rounded-lg text-[13px] font-medium transition-colors"
          >
            <Plus size={15} />
            Add cost
          </button>
        </div>
      ) : (
        <div className="bg-bg-surface rounded-xl border border-border-dim overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_5rem_6rem_6.5rem_6.5rem_5rem_2.5rem] px-5 py-2.5 border-b border-border-dim text-[10px] uppercase tracking-wider text-text-dim">
            <span>Name</span>
            <span className="text-center">Type</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Start</span>
            <span className="text-right">End</span>
            <span className="text-center">Category</span>
            <span />
          </div>
          {/* Rows */}
          {groupedCosts.map(group => {
            const isMulti = group.costs.length > 1;
            const isExpanded = expandedGroups.has(group.key);

            if (!isMulti) {
              // Single entry — render flat row as before
              const cost = group.costs[0];
              return (
                <div key={cost.id} className="grid grid-cols-[1fr_5rem_6rem_6.5rem_6.5rem_5rem_2.5rem] px-5 py-3 border-b border-border-dim/40 last:border-0 hover:bg-bg-hover transition-colors items-center">
                  <div className="truncate pr-2">
                    <span className="text-[13px] font-medium text-text-heading">{cost.name}</span>
                    {cost.cost_type === 'variable' && cost.base_metric && (
                      <span className="text-[11px] text-text-dim ml-1.5">of {BASE_METRIC_LABELS[cost.base_metric] || cost.base_metric}</span>
                    )}
                    {cost.repeat && cost.repeat_interval && (
                      <span className="text-[10px] text-text-dim ml-1.5 bg-bg-elevated px-1.5 py-0.5 rounded">
                        {cost.repeat_interval}
                      </span>
                    )}
                  </div>
                  <span className="text-center">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      cost.cost_type === 'fixed'
                        ? 'bg-accent/10 text-accent'
                        : 'bg-purple-500/10 text-purple-500'
                    }`}>
                      {cost.cost_type === 'fixed' ? 'Fixed' : 'Variable'}
                    </span>
                  </span>
                  <span className="text-[12px] text-text-body text-right">{formatAmount(cost)}</span>
                  <span className="text-[12px] text-text-body text-right">{formatDate(cost.start_date)}</span>
                  <span className="text-[12px] text-text-body text-right">{formatDate(cost.end_date)}</span>
                  <span className="text-[11px] text-text-dim text-center truncate">{cost.category || '—'}</span>
                  <div className="relative">
                    <button
                      onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === cost.id ? null : cost.id); }}
                      className="p-1 rounded hover:bg-bg-elevated transition-colors text-text-dim hover:text-text-heading"
                    >
                      <MoreVertical size={14} />
                    </button>
                    {openMenu === cost.id && (
                      <div className="absolute right-0 top-full mt-1 bg-bg-elevated border border-border-dim rounded-lg shadow-lg z-20 py-1 min-w-[120px]">
                        <button
                          onClick={() => handleEdit(cost)}
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-text-body hover:bg-bg-hover transition-colors"
                        >
                          <Pencil size={12} /> Edit
                        </button>
                        <button
                          onClick={() => { setOpenMenu(null); handleDelete(cost.id); }}
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-error hover:bg-bg-hover transition-colors"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            // Multi-entry group — collapsible
            const sym = group.currency === 'EUR' ? '€' : group.currency === 'GBP' ? '£' : group.currency === 'NOK' ? 'kr ' : '$';
            const totalFormatted = `${sym}${group.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            return (
              <div key={group.key}>
                {/* Group header row */}
                <div
                  onClick={() => toggleGroup(group.key)}
                  className="grid grid-cols-[1fr_5rem_6rem_6.5rem_6.5rem_5rem_2.5rem] px-5 py-3 border-b border-border-dim/40 hover:bg-bg-hover transition-colors items-center cursor-pointer select-none"
                >
                  <div className="truncate pr-2 flex items-center gap-1.5">
                    <ChevronRight size={14} className={`text-text-dim shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    <span className="text-[13px] font-medium text-text-heading">{group.name}</span>
                    <span className="text-[10px] font-medium bg-accent/10 text-accent px-1.5 py-0.5 rounded-full shrink-0">
                      ×{group.costs.length}
                    </span>
                  </div>
                  <span />
                  <span className="text-[12px] text-text-body text-right font-medium">{totalFormatted}</span>
                  <span className="text-[12px] text-text-body text-right">{formatDate(group.earliestStart)}</span>
                  <span className="text-[12px] text-text-body text-right">{formatDate(group.latestEnd)}</span>
                  <span className="text-[11px] text-text-dim text-center truncate">{group.category || '—'}</span>
                  <div className="relative">
                    <button
                      onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === group.key ? null : group.key); }}
                      className="p-1 rounded hover:bg-bg-elevated transition-colors text-text-dim hover:text-text-heading"
                    >
                      <MoreVertical size={14} />
                    </button>
                    {openMenu === group.key && (
                      <div className="absolute right-0 top-full mt-1 bg-bg-elevated border border-border-dim rounded-lg shadow-lg z-20 py-1 min-w-[140px]">
                        <button
                          onClick={() => handleAddAnother(group)}
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-text-body hover:bg-bg-hover transition-colors"
                        >
                          <Plus size={12} /> Add another
                        </button>
                        <button
                          onClick={() => { setOpenMenu(null); handleDeleteGroup(group); }}
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-error hover:bg-bg-hover transition-colors"
                        >
                          <Trash2 size={12} /> Delete all
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded individual entries */}
                {isExpanded && group.costs.map(cost => (
                  <div key={cost.id} className="grid grid-cols-[1fr_5rem_6rem_6.5rem_6.5rem_5rem_2.5rem] px-5 py-2.5 border-b border-border-dim/40 last:border-0 bg-bg-elevated/50 items-center">
                    <div className="truncate pr-2 pl-6">
                      <span className="text-[12px] text-text-body">{cost.name}</span>
                      {cost.cost_type === 'variable' && cost.base_metric && (
                        <span className="text-[11px] text-text-dim ml-1.5">of {BASE_METRIC_LABELS[cost.base_metric] || cost.base_metric}</span>
                      )}
                      {cost.repeat && cost.repeat_interval && (
                        <span className="text-[10px] text-text-dim ml-1.5 bg-bg-elevated px-1.5 py-0.5 rounded">
                          {cost.repeat_interval}
                        </span>
                      )}
                    </div>
                    <span className="text-center">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        cost.cost_type === 'fixed'
                          ? 'bg-accent/10 text-accent'
                          : 'bg-purple-500/10 text-purple-500'
                      }`}>
                        {cost.cost_type === 'fixed' ? 'Fixed' : 'Variable'}
                      </span>
                    </span>
                    <span className="text-[12px] text-text-body text-right">{formatAmount(cost)}</span>
                    <span className="text-[12px] text-text-body text-right">{formatDate(cost.start_date)}</span>
                    <span className="text-[12px] text-text-body text-right">{formatDate(cost.end_date)}</span>
                    <span className="text-[11px] text-text-dim text-center truncate">{cost.category || '—'}</span>
                    <div className="relative">
                      <button
                        onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === cost.id ? null : cost.id); }}
                        className="p-1 rounded hover:bg-bg-elevated transition-colors text-text-dim hover:text-text-heading"
                      >
                        <MoreVertical size={14} />
                      </button>
                      {openMenu === cost.id && (
                        <div className="absolute right-0 top-full mt-1 bg-bg-elevated border border-border-dim rounded-lg shadow-lg z-20 py-1 min-w-[120px]">
                          <button
                            onClick={() => handleEdit(cost)}
                            className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-text-body hover:bg-bg-hover transition-colors"
                          >
                            <Pencil size={12} /> Edit
                          </button>
                          <button
                            onClick={() => { setOpenMenu(null); handleDelete(cost.id); }}
                            className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-error hover:bg-bg-hover transition-colors"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-border-dim">
              <span className="text-[12px] text-text-dim">{total} cost{total !== 1 ? 's' : ''}</span>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`px-2.5 py-1 text-[12px] rounded ${
                      page === i + 1
                        ? 'bg-accent text-accent-text font-medium'
                        : 'text-text-dim hover:bg-bg-hover'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <CustomCostModal
          cost={editingCost}
          onClose={() => { setModalOpen(false); setEditingCost(null); }}
          onSaved={() => { setModalOpen(false); setEditingCost(null); fetchCosts(); }}
        />
      )}
    </div>
  );
}
