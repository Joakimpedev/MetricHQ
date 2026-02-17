'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useUser } from '@clerk/nextjs';
import { X, Plus, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import CurrencySelect from './CurrencySelect';

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
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function displayDate(s: string): string {
  if (!s) return '';
  const d = parseDate(s);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function localToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/* ── Single-date calendar picker popover ── */

function DatePickerCalendar({ value, onChange, onClose, allowNoEnd, noEndDate, onToggleNoEnd }: {
  value: string;
  onChange: (date: string) => void;
  onClose: () => void;
  allowNoEnd?: boolean;
  noEndDate?: boolean;
  onToggleNoEnd?: () => void;
}) {
  const initial = value ? parseDate(value) : localToday();
  const [calMonth, setCalMonth] = useState(initial.getMonth());
  const [calYear, setCalYear] = useState(initial.getFullYear());
  const today = localToday();
  const selected = value ? parseDate(value) : null;

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  }

  return (
    <div className="bg-bg-surface border border-border-dim rounded-xl shadow-2xl p-3 w-[240px]">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={prevMonth} className="p-1 rounded hover:bg-bg-hover text-text-dim">
          <ChevronLeft size={14} />
        </button>
        <span className="text-[12px] font-medium text-text-heading">
          {MONTH_NAMES[calMonth]} {calYear}
        </span>
        <button type="button" onClick={nextMonth} className="p-1 rounded hover:bg-bg-hover text-text-dim">
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7">
        {DAY_HEADERS.map(h => (
          <div key={h} className="w-[30px] h-6 text-[10px] text-text-dim flex items-center justify-center">{h}</div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} className="w-[30px] h-[30px]" />;
          const d = new Date(calYear, calMonth, day);
          const isToday = isSameDay(d, today);
          const isSelected = !noEndDate && selected && isSameDay(d, selected);

          return (
            <button
              key={day}
              type="button"
              onClick={() => { onChange(fmtDate(d)); onClose(); }}
              className={`w-[30px] h-[30px] text-[11px] rounded transition-colors flex items-center justify-center ${
                isSelected ? 'bg-accent text-accent-text font-medium' :
                isToday ? 'text-accent font-medium ring-1 ring-accent/30' :
                'text-text-body hover:bg-bg-hover'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* No end date option */}
      {allowNoEnd && onToggleNoEnd && (
        <button
          type="button"
          onClick={onToggleNoEnd}
          className="flex items-center gap-2 mt-2 pt-2 border-t border-border-dim/50 w-full text-left"
        >
          <span className={`w-[14px] h-[14px] rounded-[4px] border-2 flex items-center justify-center shrink-0 transition-colors ${
            noEndDate ? 'bg-accent border-accent' : 'border-border-dim bg-transparent'
          }`}>
            {noEndDate && (
              <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <span className="text-[11px] text-text-dim">No end date</span>
        </button>
      )}
    </div>
  );
}

function DatePickerField({ label, value, onChange, required, allowNoEnd, noEndDate, onToggleNoEnd }: {
  label: string;
  value: string;
  onChange: (date: string) => void;
  required?: boolean;
  allowNoEnd?: boolean;
  noEndDate?: boolean;
  onToggleNoEnd?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const calRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Position the calendar below the button
  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left });
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target)) return;
      if (calRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const isDisabled = noEndDate;

  return (
    <div>
      <label className="text-[11px] font-medium uppercase tracking-wider text-text-dim mb-1.5 flex items-center gap-1">
        {label}
        {required && <span className="text-error text-[13px] leading-none">*</span>}
      </label>
      <button
        ref={btnRef}
        type="button"
        onClick={() => { if (!isDisabled) setOpen(!open); }}
        className={`w-full flex items-center gap-2 px-3 py-2 text-[13px] bg-bg-body border border-border-dim rounded-lg transition-colors text-left ${
          isDisabled
            ? 'opacity-40 cursor-not-allowed'
            : 'hover:border-text-dim/30 focus:outline-none focus:border-accent'
        } ${open ? 'border-accent' : ''}`}
      >
        <CalendarIcon size={13} className="text-text-dim shrink-0" />
        <span className={noEndDate ? 'text-text-dim italic' : value ? 'text-text-body' : 'text-text-dim/50'}>
          {noEndDate ? 'No end date' : value ? displayDate(value) : 'Select date'}
        </span>
      </button>
      {open && createPortal(
        <div
          ref={calRef}
          className="fixed z-[100]"
          style={{ top: pos.top, left: pos.left }}
        >
          <DatePickerCalendar
            value={value}
            onChange={onChange}
            onClose={() => setOpen(false)}
            allowNoEnd={allowNoEnd}
            noEndDate={noEndDate}
            onToggleNoEnd={() => {
              if (onToggleNoEnd) onToggleNoEnd();
              setOpen(false);
            }}
          />
        </div>,
        document.body
      )}
    </div>
  );
}

/* ── Required asterisk helper ── */

function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-medium uppercase tracking-wider text-text-dim mb-1.5 flex items-center gap-1">
      {children}
      <span className="text-error text-[13px] leading-none">*</span>
    </label>
  );
}

/* ── Main modal ── */

export default function CustomCostModal({ cost, onClose, onSaved }: Props) {
  const { user } = useUser();
  const isEdit = !!cost?.id;

  const [name, setName] = useState(cost?.name || '');
  const [costType, setCostType] = useState<'fixed' | 'variable'>((cost?.cost_type as 'fixed' | 'variable') || 'fixed');
  const [currency, setCurrency] = useState(cost?.currency || 'USD');
  const [amount, setAmount] = useState(cost?.amount || '');
  const [percentage, setPercentage] = useState(cost?.percentage || '');
  const [baseMetric, setBaseMetric] = useState(cost?.base_metric || 'revenue');
  const [repeat, setRepeat] = useState(cost?.repeat || false);
  const [repeatInterval, setRepeatInterval] = useState(cost?.repeat_interval || 'monthly');
  const [startDate, setStartDate] = useState(cost?.start_date ? cost.start_date.split('T')[0] : fmtDate(new Date()));
  const [endDate, setEndDate] = useState(cost?.end_date ? cost.end_date.split('T')[0] : '');
  const [noEndDate, setNoEndDate] = useState(cost ? !cost.end_date : false);
  const [category, setCategory] = useState(cost?.category || '');
  const [categories, setCategories] = useState<string[]>([]);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const categoryRef = useRef<HTMLDivElement>(null);

  // End date is always optional — for fixed non-repeating without end date, cost applies to start date only
  const endDateOptional = true;

  // When switching cost type, reset fields that don't apply
  useEffect(() => {
    if (costType === 'variable') {
      setRepeat(false);
      setRepeatInterval('monthly');
    }
  }, [costType]);

  // When end date becomes required (fixed + non-repeating), clear no-end-date
  useEffect(() => {
    if (!endDateOptional) {
      setNoEndDate(false);
    }
  }, [endDateOptional]);

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

    setSaving(true);
    setError('');

    const effectiveRepeat = costType === 'variable' ? false : repeat;
    const effectiveEndDate = noEndDate ? null : endDate || null;

    const body: Record<string, unknown> = {
      userId: user.id,
      name: name.trim(),
      cost_type: costType,
      currency,
      amount: costType === 'fixed' ? parseFloat(amount) : null,
      percentage: costType === 'variable' ? parseFloat(percentage) : null,
      base_metric: costType === 'variable' ? baseMetric : null,
      repeat: effectiveRepeat,
      repeat_interval: effectiveRepeat ? repeatInterval : null,
      start_date: startDate,
      end_date: effectiveEndDate,
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
      <div className="relative bg-bg-surface border border-border-dim rounded-xl shadow-2xl w-full max-w-md mx-4">
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
            <RequiredLabel>Name</RequiredLabel>
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
            <RequiredLabel>Cost Type</RequiredLabel>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCostType('fixed')}
                className={`px-3 py-2.5 rounded-lg border text-left transition-colors ${
                  costType === 'fixed'
                    ? 'border-accent bg-accent/10'
                    : 'border-border-dim bg-bg-body hover:border-text-dim/30'
                }`}
              >
                <div className={`text-[13px] font-medium ${costType === 'fixed' ? 'text-accent' : 'text-text-dim'}`}>
                  Fixed Cost
                </div>
                <div className={`text-[10px] mt-0.5 ${costType === 'fixed' ? 'text-accent/70' : 'text-text-dim/60'}`}>
                  A set amount each period
                </div>
              </button>
              <button
                type="button"
                onClick={() => setCostType('variable')}
                className={`px-3 py-2.5 rounded-lg border text-left transition-colors ${
                  costType === 'variable'
                    ? 'border-accent bg-accent/10'
                    : 'border-border-dim bg-bg-body hover:border-text-dim/30'
                }`}
              >
                <div className={`text-[13px] font-medium ${costType === 'variable' ? 'text-accent' : 'text-text-dim'}`}>
                  Variable Cost
                </div>
                <div className={`text-[10px] mt-0.5 ${costType === 'variable' ? 'text-accent/70' : 'text-text-dim/60'}`}>
                  Percentage of a metric
                </div>
              </button>
            </div>
          </div>

          {/* Fixed: Currency + Amount */}
          {costType === 'fixed' && (
            <div className="flex gap-2 items-end">
              <div>
                <label className={labelClass}>Currency</label>
                <CurrencySelect value={currency} onChange={setCurrency} compact />
              </div>
              <div className="flex-1">
                <RequiredLabel>Amount</RequiredLabel>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={e => {
                    let raw = e.target.value;
                    // Strip spaces (thousand separators in some locales, e.g. "1 670,65")
                    raw = raw.replace(/\s/g, '');
                    // If there's exactly one comma and no dots, treat comma as decimal separator
                    // Otherwise strip commas (thousand separators like 1,234.56 or 1,000)
                    const commaCount = (raw.match(/,/g) || []).length;
                    const hasDot = raw.includes('.');
                    if (commaCount === 1 && !hasDot) {
                      raw = raw.replace(',', '.');
                    } else {
                      raw = raw.replace(/,/g, '');
                    }
                    // Only allow valid decimal patterns
                    if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
                      setAmount(raw);
                    }
                  }}
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
                <RequiredLabel>Percentage</RequiredLabel>
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
                <RequiredLabel>Of metric</RequiredLabel>
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

          {/* Repeat toggle — only for fixed costs */}
          {costType === 'fixed' && (
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
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-2">
            <DatePickerField
              label="Start Date"
              value={startDate}
              onChange={setStartDate}
              required
            />
            <DatePickerField
              label="End Date"
              value={endDate}
              onChange={(d) => { setEndDate(d); setNoEndDate(false); }}
              required={!endDateOptional}
              allowNoEnd={endDateOptional}
              noEndDate={noEndDate}
              onToggleNoEnd={() => {
                setNoEndDate(prev => !prev);
                if (!noEndDate) setEndDate('');
              }}
            />
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
