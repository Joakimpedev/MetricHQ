'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { X, Plus } from 'lucide-react';

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
}

interface Props {
  cost: CustomCost | null;
  onClose: () => void;
  onSaved: () => void;
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'NOK'];
const INTERVALS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];
const BASE_METRICS = [
  { value: 'revenue', label: 'Revenue' },
  { value: 'profit', label: 'Profit' },
  { value: 'total_ad_spend', label: 'Total Ad Spend' },
  { value: 'google_ads_spend', label: 'Google Ads Spend' },
  { value: 'meta_spend', label: 'Meta Spend' },
  { value: 'tiktok_spend', label: 'TikTok Spend' },
  { value: 'linkedin_spend', label: 'LinkedIn Spend' },
];

function fmtDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export default function CustomCostModal({ cost, onClose, onSaved }: Props) {
  const { user } = useUser();
  const isEdit = !!cost;

  const [name, setName] = useState(cost?.name || '');
  const [costType, setCostType] = useState<'fixed' | 'variable'>((cost?.cost_type as 'fixed' | 'variable') || 'fixed');
  const [currency, setCurrency] = useState(cost?.currency || 'USD');
  const [amount, setAmount] = useState(cost?.amount || '');
  const [percentage, setPercentage] = useState(cost?.percentage || '');
  const [baseMetric, setBaseMetric] = useState(cost?.base_metric || 'revenue');
  const [repeat, setRepeat] = useState(cost?.repeat || false);
  const [repeatInterval, setRepeatInterval] = useState(cost?.repeat_interval || 'monthly');
  const [startDate, setStartDate] = useState(cost?.start_date ? cost.start_date.split('T')[0] : fmtDate(new Date()));
  const [endDate, setEndDate] = useState(cost?.end_date ? cost.end_date.split('T')[0] : fmtDate(new Date()));
  const [category, setCategory] = useState(cost?.category || '');
  const [categories, setCategories] = useState<string[]>([]);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const categoryRef = useRef<HTMLDivElement>(null);

  // Fetch existing categories
  useEffect(() => {
    if (!user?.id) return;
    fetch(`${API_URL}/api/custom-costs/categories?userId=${encodeURIComponent(user.id)}`)
      .then(r => r.json())
      .then(j => setCategories(j.categories || []))
      .catch(() => {});
  }, [user?.id]);

  // Close category suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setShowCategorySuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredCategories = categories.filter(c =>
    c.toLowerCase().includes(category.toLowerCase()) && c.toLowerCase() !== category.toLowerCase()
  );

  const handleSubmit = async () => {
    if (!user?.id || !name.trim() || !startDate) {
      setError('Name and start date are required');
      return;
    }

    if (costType === 'fixed' && !amount) {
      setError('Amount is required for fixed costs');
      return;
    }

    if (costType === 'variable' && !percentage) {
      setError('Percentage is required for variable costs');
      return;
    }

    if (!repeat && !endDate) {
      setError('End date is required for non-repeating costs');
      return;
    }

    setSaving(true);
    setError('');

    const body: Record<string, unknown> = {
      userId: user.id,
      name: name.trim(),
      cost_type: costType,
      currency,
      amount: costType === 'fixed' ? parseFloat(amount) : null,
      percentage: costType === 'variable' ? parseFloat(percentage) : null,
      base_metric: costType === 'variable' ? baseMetric : null,
      repeat,
      repeat_interval: repeat ? repeatInterval : null,
      start_date: startDate,
      end_date: repeat && !endDate ? null : endDate || null,
      category: category.trim() || null,
    };

    try {
      const url = isEdit
        ? `${API_URL}/api/custom-costs/${cost.id}`
        : `${API_URL}/api/custom-costs`;
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to save');
        return;
      }
      onSaved();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 text-[13px] bg-bg-body border border-border-dim rounded-lg text-text-body placeholder:text-text-dim/50 focus:outline-none focus:border-accent';
  const labelClass = 'text-[11px] font-medium uppercase tracking-wider text-text-dim mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-bg-overlay" onClick={onClose} />
      <div className="relative bg-bg-surface border border-border-dim rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-dim">
          <h2 className="text-[15px] font-semibold text-text-heading">
            {isEdit ? 'Edit Cost' : 'Add Cost'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-bg-hover text-text-dim">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Name */}
          <div>
            <label className={labelClass}>Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Stripe fees, Designer salary"
              className={inputClass}
            />
          </div>

          {/* Cost Type */}
          <div>
            <label className={labelClass}>Cost Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCostType('fixed')}
                className={`px-3 py-2.5 rounded-lg border text-[13px] font-medium transition-colors ${
                  costType === 'fixed'
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border-dim bg-bg-body text-text-dim hover:border-text-dim/30'
                }`}
              >
                Fixed Cost
              </button>
              <button
                type="button"
                onClick={() => setCostType('variable')}
                className={`px-3 py-2.5 rounded-lg border text-[13px] font-medium transition-colors ${
                  costType === 'variable'
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border-dim bg-bg-body text-text-dim hover:border-text-dim/30'
                }`}
              >
                Variable Cost
              </button>
            </div>
          </div>

          {/* Fixed: Currency + Amount */}
          {costType === 'fixed' && (
            <div className="flex gap-2">
              <div className="w-24">
                <label className={labelClass}>Currency</label>
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className={inputClass}
                >
                  {CURRENCIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className={labelClass}>Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {/* Variable: Percentage + Base Metric */}
          {costType === 'variable' && (
            <div className="flex gap-2">
              <div className="w-28">
                <label className={labelClass}>Percentage</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={percentage}
                    onChange={e => setPercentage(e.target.value)}
                    placeholder="5.5"
                    className={`${inputClass} pr-7`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim text-[13px]">%</span>
                </div>
              </div>
              <div className="flex-1">
                <label className={labelClass}>Of metric</label>
                <select
                  value={baseMetric}
                  onChange={e => setBaseMetric(e.target.value)}
                  className={inputClass}
                >
                  {BASE_METRICS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Repeat toggle */}
          <div>
            <div className="flex items-center justify-between">
              <label className={labelClass}>Repeating</label>
              <button
                type="button"
                onClick={() => setRepeat(!repeat)}
                className={`relative w-9 h-5 rounded-full transition-colors ${repeat ? 'bg-accent' : 'bg-bg-elevated'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${repeat ? 'translate-x-4' : ''}`} />
              </button>
            </div>
            {repeat && (
              <div className="mt-2">
                <select
                  value={repeatInterval}
                  onChange={e => setRepeatInterval(e.target.value)}
                  className={inputClass}
                >
                  {INTERVALS.map(i => (
                    <option key={i.value} value={i.value}>{i.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>End Date {repeat && <span className="normal-case font-normal">(optional)</span>}</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Category */}
          <div ref={categoryRef}>
            <label className={labelClass}>Category</label>
            <div className="relative">
              <input
                type="text"
                value={category}
                onChange={e => { setCategory(e.target.value); setShowCategorySuggestions(true); }}
                onFocus={() => setShowCategorySuggestions(true)}
                placeholder="e.g. SaaS tools, Payroll"
                className={inputClass}
              />
              {showCategorySuggestions && (filteredCategories.length > 0 || (category.trim() && !categories.includes(category.trim()))) && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-bg-elevated border border-border-dim rounded-lg shadow-lg z-10 py-1 max-h-[150px] overflow-y-auto">
                  {filteredCategories.map(c => (
                    <button
                      key={c}
                      onClick={() => { setCategory(c); setShowCategorySuggestions(false); }}
                      className="w-full px-3 py-1.5 text-[12px] text-text-body hover:bg-bg-hover text-left transition-colors"
                    >
                      {c}
                    </button>
                  ))}
                  {category.trim() && !categories.includes(category.trim()) && (
                    <button
                      onClick={() => { setShowCategorySuggestions(false); }}
                      className="flex items-center gap-1.5 w-full px-3 py-1.5 text-[12px] text-accent hover:bg-bg-hover text-left transition-colors"
                    >
                      <Plus size={11} />
                      Create &ldquo;{category.trim()}&rdquo;
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Error */}
          {error && <p className="text-error text-[12px]">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border-dim">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] text-text-dim hover:text-text-body transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-accent-text rounded-lg text-[13px] font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : isEdit ? 'Save' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}
