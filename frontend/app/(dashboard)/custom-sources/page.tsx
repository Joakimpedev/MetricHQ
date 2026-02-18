'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useUser } from '@clerk/nextjs';
import { Plus, PlusCircle, MoreVertical, Pencil, Trash2, ChevronDown, ChevronRight, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, AlertTriangle, Globe, X } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

/** Parse a numeric string that may use comma as decimal separator (e.g. "197,22" → 197.22) */
function parseNum(val: unknown): number {
  let s = String(val ?? '').trim().replace(/[^\d.,-]/g, '');
  // Single comma with no dots → treat comma as decimal (EU style: 197,22)
  const commas = (s.match(/,/g) || []).length;
  const dots = (s.match(/\./g) || []).length;
  if (commas === 1 && dots === 0) {
    s = s.replace(',', '.');
  } else {
    // Strip commas as thousand separators
    s = s.replace(/,/g, '');
  }
  return parseFloat(s) || 0;
}

interface CustomSource {
  id: number;
  name: string;
  track_impressions: boolean;
  track_clicks: boolean;
  track_conversions: boolean;
  track_revenue: boolean;
  icon: string | null;
  created_at: string;
}

const SOURCE_ICONS: { key: string; label: string; bg: string; svg: React.ReactNode }[] = [
  { key: 'reddit', label: 'Reddit', bg: '#ff4500', svg: <svg width="11" height="11" viewBox="0 0 24 24" fill="#fff"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.11.793-.26.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg> },
  { key: 'twitter', label: 'X / Twitter', bg: '#000', svg: <svg width="10" height="10" viewBox="0 0 24 24" fill="#fff"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
  { key: 'snapchat', label: 'Snapchat', bg: '#fffc00', svg: <svg width="11" height="11" viewBox="0 0 24 24" fill="#000"><path d="M12.065 2c.882 0 3.617.145 4.898 3.225.45 1.083.334 2.912.24 4.371l-.02.28c-.013.17-.024.33-.033.478.3.16.63.244.967.244.19 0 .395-.03.597-.115a.86.86 0 01.334-.063c.2 0 .463.07.665.245.262.228.33.54.33.73 0 .583-.677.912-1.334 1.14-.107.038-.463.147-.54.176-.37.128-.578.254-.67.463-.05.116-.038.254.032.42.015.025.75 1.386 2.56 1.865a.423.423 0 01.31.393c0 .02-.036.386-.612.762-.717.465-1.77.766-3.13.897a3.8 3.8 0 00-.195.386c-.12.267-.258.572-.667.572h-.013c-.148 0-.41-.043-.772-.107a8.37 8.37 0 00-1.558-.168 4.75 4.75 0 00-.766.06c-.638.11-1.2.558-1.835 1.055-.85.665-1.813 1.418-3.216 1.418-.064 0-.127-.003-.19-.007-.07.004-.15.007-.23.007-1.402 0-2.366-.753-3.216-1.418-.636-.497-1.197-.945-1.835-1.055a4.7 4.7 0 00-.765-.06c-.543 0-1.07.07-1.558.168-.364.064-.625.107-.773.107h-.013c-.408 0-.547-.305-.667-.572a3.53 3.53 0 00-.195-.386C.843 18.7.77 18.66.577 18.587c-.076-.028-.268-.085-.44-.133C.483 18.35 0 18.1 0 17.57a.423.423 0 01.31-.393c1.81-.478 2.545-1.84 2.56-1.866.07-.166.082-.303.032-.42-.092-.208-.3-.334-.67-.462-.077-.03-.433-.138-.54-.177-.273-.093-1.334-.48-1.334-1.14 0-.226.096-.5.33-.73a.91.91 0 01.665-.244.87.87 0 01.334.063c.203.085.407.115.597.115.337 0 .667-.084.966-.244-.01-.147-.02-.308-.032-.478l-.02-.28c-.093-1.46-.21-3.29.24-4.372C4.732 2.145 7.466 2 8.35 2h.086z"/></svg> },
  { key: 'pinterest', label: 'Pinterest', bg: '#e60023', svg: <svg width="11" height="11" viewBox="0 0 24 24" fill="#fff"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641 0 12.017 0z"/></svg> },
  { key: 'bing', label: 'Microsoft Ads', bg: '#008373', svg: <svg width="10" height="11" viewBox="0 0 24 24" fill="#fff"><path d="M5.063 0v18.281l6.156 3.563 7.719-4.5V10.5l-7.719 3.375L8.25 12.47V3.375z"/></svg> },
  { key: 'amazon', label: 'Amazon Ads', bg: '#ff9900', svg: <svg width="11" height="11" viewBox="0 0 24 24" fill="#fff"><path d="M.045 18.02c.07-.116.196-.128.348-.037 3.708 2.258 7.878 3.41 12.146 3.41 3.005 0 6.258-.66 9.37-1.97.474-.2.86.154.68.6-.185.445-.01.624.373.4C19.7 22.06 16.066 23 12.29 23 8.196 23 4.212 21.64.66 19.175c-.225-.156-.28-.345-.145-.535l.02-.02.51-.6zM23.538 17.77c-.266-.32-1.746-.15-2.413-.076-.2.024-.23-.15-.05-.276 1.18-.828 3.116-.59 3.34-.312.224.28-.06 2.22-1.166 3.15-.17.142-.332.066-.256-.122.25-.62.81-2.044.545-2.364z"/><path d="M14.43 9.133V7.65c0-.225.017-.483-.1-.675-.1-.158-.3-.258-.497-.258-.7 0-.83.542-.83 1.067v3.35c0 .567-.003 1.133.33 1.6.22.308.56.5.93.5.414 0 .803-.2 1-.55.245-.434.2-.95.2-1.434v-1.117zm2.45 4.475c-.158.142-.39.15-.567.058-.8-.667-1.045-1.625-1.045-1.625-.988 1-1.69 1.3-2.97 1.3-1.516 0-2.693-.934-2.693-2.8 0-1.46.79-2.45 1.916-2.934.975-.425 2.338-.5 3.38-.617v-.233c0-.425.033-.925-.217-1.292-.217-.325-.633-.458-1-.458-.68 0-1.284.35-1.434.908-.108.333-.15.383-.467.392l-1.684-.183c-.216-.05-.458-.225-.396-.558C10.12 3.4 12.18 2.75 14.04 2.75c.95 0 2.188.253 2.938.975.95.883.858 2.067.858 3.35v3.033c0 .913.38 1.313.737 1.808.124.175.152.388-.007.52-.4.334-1.113.955-1.505 1.303l-.08-.13z"/></svg> },
  { key: 'apple', label: 'Apple Search', bg: '#000', svg: <svg width="10" height="11" viewBox="0 0 24 24" fill="#fff"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg> },
  { key: 'taboola', label: 'Taboola', bg: '#003c7f', svg: <svg width="11" height="11" viewBox="0 0 24 24" fill="#fff"><circle cx="12" cy="12" r="10"/></svg> },
  { key: 'outbrain', label: 'Outbrain', bg: '#f36', svg: <svg width="11" height="11" viewBox="0 0 24 24" fill="#fff"><circle cx="12" cy="12" r="10"/></svg> },
  { key: 'programmatic', label: 'Programmatic', bg: '#6366f1', svg: <svg width="11" height="11" viewBox="0 0 24 24" fill="#fff"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/></svg> },
  { key: 'email', label: 'Email', bg: '#059669', svg: <svg width="11" height="11" viewBox="0 0 24 24" fill="#fff"><path d="M2 6l10 7 10-7v12H2z"/><path d="M22 6H2l10 7z"/></svg> },
  { key: 'affiliate', label: 'Affiliate', bg: '#8b5cf6', svg: <svg width="11" height="11" viewBox="0 0 24 24" fill="#fff"><path d="M17 7a5 5 0 00-10 0c0 2.76 5 10 5 10s5-7.24 5-10zm-5 2a2 2 0 110-4 2 2 0 010 4z"/></svg> },
];

interface Entry {
  id: number;
  campaign_id: string;
  country_code: string;
  date: string;
  spend: string;
  impressions: number;
  clicks: number;
  revenue: string;
  purchases: number;
}

interface CampaignSummary {
  campaign_id: string;
  total_spend: string;
  total_impressions: number;
  total_clicks: number;
  total_revenue: string;
  total_purchases: number;
  entry_count: number;
  first_date: string;
  last_date: string;
  country_attribution: 'none' | 'single' | 'multiple';
  attributed_country_code: string;
}

const COUNTRIES: { code: string; name: string }[] = [
  { code: 'US', name: 'United States' }, { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' }, { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' }, { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' }, { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' }, { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' }, { code: 'BE', name: 'Belgium' },
  { code: 'AT', name: 'Austria' }, { code: 'CH', name: 'Switzerland' },
  { code: 'IE', name: 'Ireland' }, { code: 'NO', name: 'Norway' },
  { code: 'SE', name: 'Sweden' }, { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' }, { code: 'NZ', name: 'New Zealand' },
  { code: 'JP', name: 'Japan' }, { code: 'KR', name: 'South Korea' },
  { code: 'SG', name: 'Singapore' }, { code: 'IN', name: 'India' },
  { code: 'BR', name: 'Brazil' }, { code: 'MX', name: 'Mexico' },
  { code: 'AR', name: 'Argentina' }, { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' }, { code: 'ZA', name: 'South Africa' },
  { code: 'NG', name: 'Nigeria' }, { code: 'EG', name: 'Egypt' },
  { code: 'IL', name: 'Israel' }, { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' }, { code: 'TR', name: 'Turkey' },
  { code: 'RU', name: 'Russia' }, { code: 'UA', name: 'Ukraine' },
  { code: 'CZ', name: 'Czech Republic' }, { code: 'RO', name: 'Romania' },
  { code: 'HU', name: 'Hungary' }, { code: 'GR', name: 'Greece' },
  { code: 'HR', name: 'Croatia' }, { code: 'BG', name: 'Bulgaria' },
  { code: 'RS', name: 'Serbia' }, { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' }, { code: 'LT', name: 'Lithuania' },
  { code: 'LV', name: 'Latvia' }, { code: 'EE', name: 'Estonia' },
  { code: 'TH', name: 'Thailand' }, { code: 'VN', name: 'Vietnam' },
  { code: 'PH', name: 'Philippines' }, { code: 'MY', name: 'Malaysia' },
  { code: 'ID', name: 'Indonesia' }, { code: 'TW', name: 'Taiwan' },
  { code: 'HK', name: 'Hong Kong' }, { code: 'CN', name: 'China' },
  { code: 'PK', name: 'Pakistan' }, { code: 'BD', name: 'Bangladesh' },
  { code: 'LK', name: 'Sri Lanka' }, { code: 'PE', name: 'Peru' },
  { code: 'EC', name: 'Ecuador' }, { code: 'UY', name: 'Uruguay' },
  { code: 'VE', name: 'Venezuela' }, { code: 'KE', name: 'Kenya' },
  { code: 'GH', name: 'Ghana' }, { code: 'TZ', name: 'Tanzania' },
  { code: 'MA', name: 'Morocco' }, { code: 'TN', name: 'Tunisia' },
  { code: 'QA', name: 'Qatar' }, { code: 'KW', name: 'Kuwait' },
  { code: 'BH', name: 'Bahrain' }, { code: 'OM', name: 'Oman' },
  { code: 'JO', name: 'Jordan' }, { code: 'LB', name: 'Lebanon' },
];

const COUNTRY_MAP = Object.fromEntries(COUNTRIES.map(c => [c.code, c.name]));

// --- Country Dropdown ---
function CountrySelect({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const [search, setSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = COUNTRIES.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase())
  );

  const selected = COUNTRY_MAP[value];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="w-full flex items-center gap-2 px-2 py-1.5 text-[12px] bg-bg-body border border-border-dim rounded text-text-body focus:outline-none focus:border-accent text-left"
      >
        {value ? (
          <>
            <img src={`https://flagcdn.com/w20/${value.toLowerCase()}.png`} alt="" className="w-4 h-3 object-cover rounded-sm" />
            <span>{selected || value}</span>
          </>
        ) : (
          <span className="text-text-dim/50">Select country...</span>
        )}
        <ChevronDown size={12} className="ml-auto text-text-dim" />
      </button>
      {dropdownOpen && (
        <div className="absolute left-0 top-full mt-1 w-full bg-bg-elevated border border-border-dim rounded-lg shadow-xl z-40 overflow-hidden">
          <div className="p-1.5 border-b border-border-dim">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              autoFocus
              className="w-full px-2 py-1 text-[11px] bg-bg-body border border-border-dim rounded text-text-body placeholder:text-text-dim/50 focus:outline-none focus:border-accent"
            />
          </div>
          <div className="max-h-[160px] overflow-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-text-dim">No countries found</div>
            ) : (
              filtered.map(c => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => { onChange(c.code); setDropdownOpen(false); setSearch(''); }}
                  className={`flex items-center gap-2 w-full px-3 py-1.5 text-[11px] hover:bg-bg-hover transition-colors text-left ${c.code === value ? 'bg-accent/10 text-accent font-medium' : 'text-text-body'}`}
                >
                  <img src={`https://flagcdn.com/w20/${c.code.toLowerCase()}.png`} alt="" className="w-4 h-3 object-cover rounded-sm" />
                  {c.name}
                  <span className="text-text-dim ml-auto">{c.code}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Attribution Pill ---
function AttributionPill({ campaign, sourceId, onUpdated }: {
  campaign: CampaignSummary;
  sourceId: number;
  onUpdated: () => void;
}) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(campaign.country_attribution);
  const [cc, setCc] = useState(campaign.attributed_country_code);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMode(campaign.country_attribution);
    setCc(campaign.attributed_country_code);
  }, [campaign.country_attribution, campaign.attributed_country_code]);

  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    setError('');
    try {
      const url = `${API_URL}/api/custom-sources/${sourceId}/campaigns/${encodeURIComponent(campaign.campaign_id)}/settings`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, country_attribution: mode, country_code: cc }),
      });
      if (res.ok) {
        setOpen(false);
        onUpdated();
      } else {
        const json = await res.json().catch(() => ({}));
        setError(json.error || `Save failed (${res.status})`);
      }
    } catch (err) {
      setError('Network error');
      console.error('Save campaign settings error:', err);
    } finally {
      setSaving(false);
    }
  };

  const pillColor = campaign.country_attribution === 'none'
    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
    : campaign.country_attribution === 'single'
      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
      : 'bg-purple-500/15 text-purple-600 dark:text-purple-400';

  const pillLabel = campaign.country_attribution === 'none'
    ? 'No country'
    : campaign.country_attribution === 'single'
      ? (COUNTRY_MAP[campaign.attributed_country_code] || campaign.attributed_country_code || '??')
      : 'Multiple';

  const pillRef = useRef<HTMLButtonElement>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);

  const openPopover = () => {
    if (pillRef.current) {
      const rect = pillRef.current.getBoundingClientRect();
      setPopoverPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen(true);
    setError('');
  };

  return (
    <>
      <button
        ref={pillRef}
        onClick={e => { e.stopPropagation(); if (open) { setOpen(false); } else { openPopover(); } }}
        className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium cursor-pointer hover:opacity-80 transition-opacity ${pillColor}`}
      >
        {campaign.country_attribution === 'none' && <AlertTriangle size={9} />}
        {campaign.country_attribution === 'single' && campaign.attributed_country_code && (
          <img src={`https://flagcdn.com/w20/${campaign.attributed_country_code.toLowerCase()}.png`} alt="" className="w-3 h-2 object-cover rounded-sm" />
        )}
        {pillLabel}
      </button>
      {open && popoverPos && createPortal(
        <>
          <div className="fixed inset-0 z-50" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 bg-bg-elevated border border-border-dim rounded-lg shadow-xl p-3 w-[260px]"
            style={{ top: popoverPos.top, left: popoverPos.left }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-text-heading">Country Attribution</span>
              <button onClick={() => setOpen(false)} className="text-text-dim hover:text-text-body">
                <X size={12} />
              </button>
            </div>
            <div className="space-y-1.5 mb-3">
              {(['none', 'single', 'multiple'] as const).map(opt => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="attr"
                    checked={mode === opt}
                    onChange={() => setMode(opt)}
                    className="text-accent focus:ring-accent"
                  />
                  <span className="text-[12px] text-text-body">{opt === 'none' ? 'None' : opt === 'single' ? 'Single country' : 'Multiple countries'}</span>
                </label>
              ))}
            </div>
            {mode === 'single' && (
              <div className="mb-3">
                <CountrySelect value={cc} onChange={setCc} />
              </div>
            )}
            {error && (
              <div className="mb-2 text-[10px] text-error bg-error/10 rounded px-2 py-1">{error}</div>
            )}
            <button
              onClick={handleSave}
              disabled={saving || (mode === 'single' && !cc)}
              className="w-full bg-accent hover:bg-accent-hover text-accent-text px-3 py-1.5 rounded text-[11px] font-medium transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </>,
        document.body
      )}
    </>
  );
}

function formatDate(d: string): string {
  const dateStr = String(d).slice(0, 10);
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// --- Source Modal ---
function SourceModal({ source, onClose, onSaved }: {
  source: CustomSource | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useUser();
  const [name, setName] = useState(source?.name || '');
  const [icon, setIcon] = useState(source?.icon || '');
  const [trackImpressions, setTrackImpressions] = useState(source?.track_impressions || false);
  const [trackClicks, setTrackClicks] = useState(source?.track_clicks || false);
  const [trackConversions, setTrackConversions] = useState(source?.track_conversions || false);
  const [trackRevenue, setTrackRevenue] = useState(source?.track_revenue || false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user?.id || !name.trim()) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        userId: user.id,
        name: name.trim(),
        icon: icon || null,
        track_impressions: trackImpressions,
        track_clicks: trackClicks,
        track_conversions: trackConversions,
        track_revenue: trackRevenue,
      };
      const url = source
        ? `${API_URL}/api/custom-sources/${source.id}`
        : `${API_URL}/api/custom-sources`;
      const res = await fetch(url, {
        method: source ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) onSaved();
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-bg-overlay" onClick={onClose} />
      <div className="relative bg-bg-surface border border-border-dim rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        <h2 className="text-[15px] font-semibold text-text-heading mb-4">
          {source ? 'Edit Source' : 'Add Custom Source'}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-[12px] text-text-dim mb-1">Source name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Reddit Ads, Bing Ads"
              className="w-full px-3 py-2 text-[13px] bg-bg-body border border-border-dim rounded-lg text-text-body placeholder:text-text-dim/50 focus:outline-none focus:border-accent"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[12px] text-text-dim mb-2">Icon</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setIcon('')}
                className={`w-7 h-7 rounded-md border flex items-center justify-center text-[10px] font-bold transition-colors ${
                  !icon ? 'border-accent bg-accent/10 text-accent' : 'border-border-dim text-text-dim hover:border-text-dim'
                }`}
              >
                {name.trim() ? name.trim()[0].toUpperCase() : '?'}
              </button>
              {SOURCE_ICONS.map(si => (
                <button
                  key={si.key}
                  type="button"
                  onClick={() => setIcon(si.key)}
                  title={si.label}
                  className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${
                    icon === si.key ? 'ring-2 ring-accent ring-offset-1 ring-offset-bg-surface' : 'hover:opacity-80'
                  }`}
                  style={{ background: si.bg }}
                >
                  {si.svg}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[12px] text-text-dim mb-2">Track (in addition to spend)</label>
            <div className="space-y-2">
              {[
                { label: 'Impressions', checked: trackImpressions, set: setTrackImpressions },
                { label: 'Clicks', checked: trackClicks, set: setTrackClicks },
                { label: 'Conversions', checked: trackConversions, set: setTrackConversions },
                { label: 'Revenue', checked: trackRevenue, set: setTrackRevenue },
              ].map(opt => (
                <label key={opt.label} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={opt.checked}
                    onChange={e => opt.set(e.target.checked)}
                    className="rounded border-border-dim text-accent focus:ring-accent"
                  />
                  <span className="text-[13px] text-text-body">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-[13px] text-text-dim hover:text-text-body transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="bg-accent hover:bg-accent-hover text-accent-text px-4 py-2 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : source ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Entry Modal ---
function EntryModal({ source, entry, onClose, onSaved }: {
  source: CustomSource;
  entry: Entry | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useUser();
  const [date, setDate] = useState(entry ? String(entry.date).slice(0, 10) : todayStr());
  const [campaign, setCampaign] = useState(entry?.campaign_id || '');
  const [country, setCountry] = useState(entry?.country_code || '');
  const [spend, setSpend] = useState(entry ? String(parseFloat(entry.spend)) : '');
  const [impressions, setImpressions] = useState(entry ? String(entry.impressions) : '');
  const [clicks, setClicks] = useState(entry ? String(entry.clicks) : '');
  const [revenue, setRevenue] = useState(entry ? String(parseFloat(entry.revenue)) : '');
  const [purchases, setPurchases] = useState(entry ? String(entry.purchases) : '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user?.id || !date || spend === '') return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        userId: user.id,
        date,
        campaign: campaign || undefined,
        country: country || undefined,
        spend: parseNum(spend),
        impressions: parseInt(impressions) || 0,
        clicks: parseInt(clicks) || 0,
        revenue: parseNum(revenue),
        purchases: parseInt(purchases) || 0,
      };
      const url = entry
        ? `${API_URL}/api/custom-sources/${source.id}/entries/${entry.id}`
        : `${API_URL}/api/custom-sources/${source.id}/entries`;
      const res = await fetch(url, {
        method: entry ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) onSaved();
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-bg-overlay" onClick={onClose} />
      <div className="relative bg-bg-surface border border-border-dim rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        <h2 className="text-[15px] font-semibold text-text-heading mb-4">
          {entry ? 'Edit Entry' : 'Add Entry'}
        </h2>

        <div className="space-y-3">
          <div>
            <label className="block text-[12px] text-text-dim mb-1">Date *</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 text-[13px] bg-bg-body border border-border-dim rounded-lg text-text-body focus:outline-none focus:border-accent" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] text-text-dim mb-1">Campaign</label>
              <input type="text" value={campaign} onChange={e => setCampaign(e.target.value)}
                placeholder={source.name}
                className="w-full px-3 py-2 text-[13px] bg-bg-body border border-border-dim rounded-lg text-text-body placeholder:text-text-dim/50 focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="block text-[12px] text-text-dim mb-1">Country code</label>
              <input type="text" value={country} onChange={e => setCountry(e.target.value.toUpperCase().slice(0, 2))}
                placeholder="e.g. US"
                className="w-full px-3 py-2 text-[13px] bg-bg-body border border-border-dim rounded-lg text-text-body placeholder:text-text-dim/50 focus:outline-none focus:border-accent" />
            </div>
          </div>
          <div>
            <label className="block text-[12px] text-text-dim mb-1">Spend ($) *</label>
            <input type="text" inputMode="decimal" value={spend} onChange={e => setSpend(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 text-[13px] bg-bg-body border border-border-dim rounded-lg text-text-body placeholder:text-text-dim/50 focus:outline-none focus:border-accent" />
          </div>
          {source.track_impressions && (
            <div>
              <label className="block text-[12px] text-text-dim mb-1">Impressions</label>
              <input type="number" value={impressions} onChange={e => setImpressions(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 text-[13px] bg-bg-body border border-border-dim rounded-lg text-text-body placeholder:text-text-dim/50 focus:outline-none focus:border-accent" />
            </div>
          )}
          {source.track_clicks && (
            <div>
              <label className="block text-[12px] text-text-dim mb-1">Clicks</label>
              <input type="number" value={clicks} onChange={e => setClicks(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 text-[13px] bg-bg-body border border-border-dim rounded-lg text-text-body placeholder:text-text-dim/50 focus:outline-none focus:border-accent" />
            </div>
          )}
          {source.track_revenue && (
            <div>
              <label className="block text-[12px] text-text-dim mb-1">Revenue ($)</label>
              <input type="text" inputMode="decimal" value={revenue} onChange={e => setRevenue(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-[13px] bg-bg-body border border-border-dim rounded-lg text-text-body placeholder:text-text-dim/50 focus:outline-none focus:border-accent" />
            </div>
          )}
          {source.track_conversions && (
            <div>
              <label className="block text-[12px] text-text-dim mb-1">Conversions</label>
              <input type="number" value={purchases} onChange={e => setPurchases(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 text-[13px] bg-bg-body border border-border-dim rounded-lg text-text-body placeholder:text-text-dim/50 focus:outline-none focus:border-accent" />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-[13px] text-text-dim hover:text-text-body transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !date || spend === ''}
            className="bg-accent hover:bg-accent-hover text-accent-text px-4 py-2 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : entry ? 'Update' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Import Modal ---
interface ParsedRow {
  campaignName: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
}

interface ImportRow extends ParsedRow {
  checked: boolean;
  isExisting: boolean;
  hasConflict: boolean;
  conflictAction: 'override' | 'add';
  existingData?: Entry;
}

function fuzzyMatchColumns(headers: string[]): {
  campaign: number; spend: number; impressions: number; clicks: number; conversions: number; revenue: number;
} {
  const lower = headers.map(h => (h || '').toString().toLowerCase().trim());
  const result = { campaign: -1, spend: -1, impressions: -1, clicks: -1, conversions: -1, revenue: -1 };

  for (let i = 0; i < lower.length; i++) {
    const h = lower[i];
    if (result.campaign === -1 && (h.includes('campaign') && h.includes('name') || h === 'campaign')) {
      result.campaign = i;
    }
    if (result.spend === -1 && (h === 'cost' || h === 'spend' || h === 'amount spent') && !h.includes('cost per')) {
      result.spend = i;
    }
    if (result.impressions === -1 && h.includes('impressions')) {
      result.impressions = i;
    }
    if (result.clicks === -1 && h.includes('clicks')) {
      result.clicks = i;
    }
    if (result.conversions === -1 && h.includes('conversions') && !h.includes('cost per') && !h.includes('skan')) {
      result.conversions = i;
    }
    if (result.revenue === -1 && h.includes('revenue')) {
      result.revenue = i;
    }
  }

  return result;
}

function isSummaryRow(campaignValue: unknown): boolean {
  if (campaignValue === null || campaignValue === undefined) return true;
  const str = String(campaignValue).toLowerCase();
  return str.startsWith('total of') || str.startsWith('total:') || str === 'total' || str === '';
}

function ImportModal({ source, onClose, onImported }: {
  source: CustomSource;
  onClose: () => void;
  onImported: () => void;
}) {
  const { user } = useUser();
  const [step, setStep] = useState<'upload' | 'review' | 'importing'>('upload');
  const [date, setDate] = useState(todayStr());
  const [dragOver, setDragOver] = useState(false);
  const [parseError, setParseError] = useState('');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);

  const parseFile = async (file: File) => {
    setParseError('');
    try {
      const XLSX = (await import('xlsx'));
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

      if (jsonData.length === 0) {
        setParseError('File is empty or has no data rows.');
        return;
      }

      const headers = Object.keys(jsonData[0]);
      const cols = fuzzyMatchColumns(headers);

      if (cols.campaign === -1) {
        setParseError(`Could not find a "Campaign" column. Found: ${headers.join(', ')}`);
        return;
      }
      if (cols.spend === -1) {
        setParseError(`Could not find a "Cost" or "Spend" column. Found: ${headers.join(', ')}`);
        return;
      }

      // Parse rows, filter out summary
      const parsed: ParsedRow[] = [];
      for (const row of jsonData) {
        const vals = headers.map(h => row[h]);
        const campaignVal = vals[cols.campaign];
        if (isSummaryRow(campaignVal)) continue;

        const row2: ParsedRow = {
          campaignName: String(campaignVal).trim(),
          spend: parseNum(vals[cols.spend]),
          impressions: cols.impressions >= 0 ? (parseInt(String(vals[cols.impressions])) || 0) : 0,
          clicks: cols.clicks >= 0 ? (parseInt(String(vals[cols.clicks])) || 0) : 0,
          conversions: cols.conversions >= 0 ? (parseInt(String(vals[cols.conversions])) || 0) : 0,
          revenue: cols.revenue >= 0 ? parseNum(vals[cols.revenue]) : 0,
        };
        // Skip campaigns with no data at all
        if (row2.spend === 0 && row2.impressions === 0 && row2.clicks === 0 && row2.conversions === 0 && row2.revenue === 0) continue;
        parsed.push(row2);
      }

      if (parsed.length === 0) {
        setParseError('No valid campaign rows found (all rows were filtered as summary rows).');
        return;
      }

      // Fetch existing entries for this date to detect conflicts
      let existingEntries: Entry[] = [];
      if (user?.id) {
        try {
          const params = new URLSearchParams({ userId: user.id, date, limit: '1000' });
          const res = await fetch(`${API_URL}/api/custom-sources/${source.id}/entries?${params}`);
          const json = await res.json();
          if (res.ok) existingEntries = json.entries || [];
        } catch { /* ignore */ }
      }

      const existingMap = new Map<string, Entry>();
      for (const e of existingEntries) {
        existingMap.set(e.campaign_id, e);
      }

      // Also check all-time entries to know if campaign has ever been used
      let allEntries: Entry[] = [];
      if (user?.id) {
        try {
          const params = new URLSearchParams({ userId: user.id, limit: '1000' });
          const res = await fetch(`${API_URL}/api/custom-sources/${source.id}/entries?${params}`);
          const json = await res.json();
          if (res.ok) allEntries = json.entries || [];
        } catch { /* ignore */ }
      }

      const allCampaigns = new Set(allEntries.map(e => e.campaign_id));

      const importRows: ImportRow[] = parsed.map(p => {
        const existing = existingMap.get(p.campaignName);
        const isExisting = allCampaigns.has(p.campaignName);
        return {
          ...p,
          checked: isExisting, // auto-check existing campaigns
          isExisting,
          hasConflict: !!existing,
          conflictAction: 'override' as const,
          existingData: existing,
        };
      });

      setRows(importRows);
      setStep('review');
    } catch (err) {
      setParseError(`Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!date) {
      setParseError('Please select a date first.');
      return;
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
      setParseError('Please upload an .xlsx, .xls, or .csv file.');
      return;
    }
    parseFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleImport = async () => {
    if (!user?.id) return;
    const toImport = rows.filter(r => r.checked);
    if (toImport.length === 0) return;

    setStep('importing');
    setImportProgress({ done: 0, total: toImport.length });
    let success = 0;
    let failed = 0;

    for (const row of toImport) {
      let spend = row.spend;
      let impressions = row.impressions;
      let clicks = row.clicks;
      let conversions = row.conversions;
      let revenue = row.revenue;

      // If "Add to existing", sum with existing values
      if (row.hasConflict && row.conflictAction === 'add' && row.existingData) {
        spend += parseFloat(row.existingData.spend) || 0;
        impressions += row.existingData.impressions || 0;
        clicks += row.existingData.clicks || 0;
        conversions += row.existingData.purchases || 0;
        revenue += parseFloat(row.existingData.revenue) || 0;
      }

      try {
        const res = await fetch(`${API_URL}/api/custom-sources/${source.id}/entries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            date,
            campaign: row.campaignName,
            spend,
            impressions,
            clicks,
            purchases: conversions,
            revenue,
          }),
        });
        if (res.ok) success++;
        else failed++;
      } catch {
        failed++;
      }
      setImportProgress(prev => ({ ...prev, done: prev.done + 1 }));
    }

    setImportResult({ success, failed });
  };

  const checkedCount = rows.filter(r => r.checked).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-bg-overlay" onClick={onClose} />
      <div className="relative bg-bg-surface border border-border-dim rounded-xl shadow-2xl w-full max-w-2xl mx-4 p-6 max-h-[85vh] flex flex-col">
        <h2 className="text-[15px] font-semibold text-text-heading mb-4 flex items-center gap-2">
          <FileSpreadsheet size={16} />
          Import from spreadsheet
        </h2>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div>
              <label className="block text-[12px] text-text-dim mb-1">Date for imported data *</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 text-[13px] bg-bg-body border border-border-dim rounded-lg text-text-body focus:outline-none focus:border-accent max-w-[200px]"
              />
              <p className="text-[11px] text-text-dim mt-1">
                Since most exports don&apos;t include dates, pick the date this data applies to.
              </p>
            </div>

            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 transition-colors cursor-pointer ${
                dragOver ? 'border-accent bg-accent/5' : 'border-border-dim hover:border-text-dim'
              }`}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.xlsx,.xls,.csv';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleFileSelect(file);
                };
                input.click();
              }}
            >
              <Upload size={24} className="text-text-dim" />
              <p className="text-[13px] text-text-body font-medium">Drop a file here, or click to browse</p>
              <p className="text-[11px] text-text-dim">Supports .xlsx, .xls, and .csv files</p>
            </div>

            {parseError && (
              <div className="flex items-start gap-2 bg-error/10 text-error rounded-lg px-3 py-2 text-[12px]">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                {parseError}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Review */}
        {step === 'review' && (
          <div className="flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] text-text-dim">
                {rows.length} campaign{rows.length !== 1 ? 's' : ''} found — {checkedCount} selected for import
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRows(rows.map(r => ({ ...r, checked: true })))}
                  className="text-[11px] text-accent hover:text-accent-hover transition-colors"
                >
                  Select all
                </button>
                <span className="text-text-dim text-[11px]">|</span>
                <button
                  onClick={() => setRows(rows.map(r => ({ ...r, checked: false })))}
                  className="text-[11px] text-accent hover:text-accent-hover transition-colors"
                >
                  Deselect all
                </button>
              </div>
            </div>

            <div className="overflow-auto min-h-0 flex-1 border border-border-dim rounded-lg">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border-dim bg-bg-elevated sticky top-0">
                    <th className="px-3 py-2 text-left w-8"></th>
                    <th className="px-3 py-2 text-left text-text-dim font-medium">Campaign</th>
                    <th className="px-3 py-2 text-left text-text-dim font-medium w-16">Status</th>
                    <th className="px-3 py-2 text-right text-text-dim font-medium">Spend</th>
                    {source.track_impressions && <th className="px-3 py-2 text-right text-text-dim font-medium">Impr.</th>}
                    {source.track_clicks && <th className="px-3 py-2 text-right text-text-dim font-medium">Clicks</th>}
                    {source.track_conversions && <th className="px-3 py-2 text-right text-text-dim font-medium">Conv.</th>}
                    {source.track_revenue && <th className="px-3 py-2 text-right text-text-dim font-medium">Revenue</th>}
                    <th className="px-3 py-2 text-left text-text-dim font-medium w-24">Conflict</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={idx} className={`border-b border-border-dim/30 last:border-0 ${row.checked ? 'bg-bg-body' : 'opacity-50'}`}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={row.checked}
                          onChange={e => {
                            const updated = [...rows];
                            updated[idx] = { ...updated[idx], checked: e.target.checked };
                            setRows(updated);
                          }}
                          className="rounded border-border-dim text-accent focus:ring-accent"
                        />
                      </td>
                      <td className="px-3 py-2 text-text-heading font-medium truncate max-w-[200px]">{row.campaignName}</td>
                      <td className="px-3 py-2">
                        {row.isExisting ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-accent font-medium">Existing</span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-600 dark:text-green-400 font-medium">New</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-text-body">${row.spend.toFixed(2)}</td>
                      {source.track_impressions && <td className="px-3 py-2 text-right text-text-body">{row.impressions.toLocaleString()}</td>}
                      {source.track_clicks && <td className="px-3 py-2 text-right text-text-body">{row.clicks.toLocaleString()}</td>}
                      {source.track_conversions && <td className="px-3 py-2 text-right text-text-body">{row.conversions}</td>}
                      {source.track_revenue && <td className="px-3 py-2 text-right text-text-body">${row.revenue.toFixed(2)}</td>}
                      <td className="px-3 py-2">
                        {row.hasConflict ? (
                          <select
                            value={row.conflictAction}
                            onChange={e => {
                              const updated = [...rows];
                              updated[idx] = { ...updated[idx], conflictAction: e.target.value as 'override' | 'add' };
                              setRows(updated);
                            }}
                            className="text-[11px] bg-bg-body border border-border-dim rounded px-1.5 py-0.5 text-text-body"
                          >
                            <option value="override">Override</option>
                            <option value="add">Add to</option>
                          </select>
                        ) : (
                          <span className="text-[11px] text-text-dim">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center mt-4">
              <button
                onClick={() => { setStep('upload'); setRows([]); setParseError(''); }}
                className="px-4 py-2 text-[13px] text-text-dim hover:text-text-body transition-colors"
              >
                Back
              </button>
              <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-2 text-[13px] text-text-dim hover:text-text-body transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={checkedCount === 0}
                  className="bg-accent hover:bg-accent-hover text-accent-text px-4 py-2 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-50"
                >
                  Import {checkedCount} entr{checkedCount === 1 ? 'y' : 'ies'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Importing / Done */}
        {step === 'importing' && (
          <div className="flex flex-col items-center py-8 gap-4">
            {!importResult ? (
              <>
                <div className="w-48 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-300"
                    style={{ width: `${importProgress.total ? (importProgress.done / importProgress.total) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-[13px] text-text-dim">
                  Importing {importProgress.done} of {importProgress.total}...
                </p>
              </>
            ) : (
              <>
                <CheckCircle2 size={32} className="text-green-500" />
                <p className="text-[14px] text-text-heading font-medium">
                  {importResult.success} entr{importResult.success === 1 ? 'y' : 'ies'} imported
                </p>
                {importResult.failed > 0 && (
                  <p className="text-[12px] text-error">{importResult.failed} failed</p>
                )}
                <button
                  onClick={() => { onImported(); onClose(); }}
                  className="bg-accent hover:bg-accent-hover text-accent-text px-6 py-2 rounded-lg text-[13px] font-medium transition-colors mt-2"
                >
                  Done
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main Page ---
export default function CustomSourcesPage() {
  const { user } = useUser();
  const [sources, setSources] = useState<CustomSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<CustomSource | null>(null);
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  // Two-level tree state
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null);
  const [campaignData, setCampaignData] = useState<Record<number, CampaignSummary[]>>({});
  const [campaignsLoading, setCampaignsLoading] = useState<Record<number, boolean>>({});
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [campaignEntries, setCampaignEntries] = useState<Record<string, Entry[]>>({});
  const [campaignEntriesTotal, setCampaignEntriesTotal] = useState<Record<string, number>>({});
  const [campaignEntriesPage, setCampaignEntriesPage] = useState<Record<string, number>>({});
  const [campaignEntriesLoading, setCampaignEntriesLoading] = useState<Record<string, boolean>>({});

  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [entryMenu, setEntryMenu] = useState<number | null>(null);
  const [importModalSource, setImportModalSource] = useState<CustomSource | null>(null);
  const entriesLimit = 20;

  const fetchSources = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/custom-sources?userId=${encodeURIComponent(user.id)}`);
      const json = await res.json();
      if (res.ok) setSources(json.sources || []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchCampaigns = useCallback(async (sourceId: number) => {
    if (!user?.id) return;
    setCampaignsLoading(prev => ({ ...prev, [sourceId]: true }));
    try {
      const params = new URLSearchParams({ userId: user.id });
      const res = await fetch(`${API_URL}/api/custom-sources/${sourceId}/campaigns?${params}`);
      const json = await res.json();
      if (res.ok) setCampaignData(prev => ({ ...prev, [sourceId]: json.campaigns || [] }));
    } catch { /* ignore */ } finally {
      setCampaignsLoading(prev => ({ ...prev, [sourceId]: false }));
    }
  }, [user?.id]);

  const fetchCampaignEntries = useCallback(async (sourceId: number, campaignId: string, page = 1) => {
    if (!user?.id) return;
    const key = `${sourceId}_${campaignId}`;
    setCampaignEntriesLoading(prev => ({ ...prev, [key]: true }));
    try {
      const params = new URLSearchParams({
        userId: user.id,
        campaign: campaignId,
        page: String(page),
        limit: String(entriesLimit),
      });
      const res = await fetch(`${API_URL}/api/custom-sources/${sourceId}/entries?${params}`);
      const json = await res.json();
      if (res.ok) {
        setCampaignEntries(prev => ({ ...prev, [key]: json.entries || [] }));
        setCampaignEntriesTotal(prev => ({ ...prev, [key]: json.total || 0 }));
        setCampaignEntriesPage(prev => ({ ...prev, [key]: page }));
      }
    } catch { /* ignore */ } finally {
      setCampaignEntriesLoading(prev => ({ ...prev, [key]: false }));
    }
  }, [user?.id]);

  useEffect(() => { fetchSources(); }, [fetchSources]);

  // Close menus on outside click
  useEffect(() => {
    if (openMenu === null && entryMenu === null) return;
    const handler = () => { setOpenMenu(null); setEntryMenu(null); };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [openMenu, entryMenu]);

  const handleDeleteSource = async (id: number) => {
    if (!user?.id) return;
    try {
      await fetch(`${API_URL}/api/custom-sources/${id}?userId=${encodeURIComponent(user.id)}`, { method: 'DELETE' });
      if (selectedSourceId === id) setSelectedSourceId(null);
      fetchSources();
    } catch { /* ignore */ }
  };

  const handleDeleteEntry = async (sourceId: number, entryId: number, campaignId: string) => {
    if (!user?.id) return;
    try {
      await fetch(`${API_URL}/api/custom-sources/${sourceId}/entries/${entryId}?userId=${encodeURIComponent(user.id)}`, { method: 'DELETE' });
      const key = `${sourceId}_${campaignId}`;
      fetchCampaignEntries(sourceId, campaignId, campaignEntriesPage[key] || 1);
      fetchCampaigns(sourceId);
    } catch { /* ignore */ }
  };

  const handleSourceClick = (id: number) => {
    if (selectedSourceId === id) {
      setSelectedSourceId(null);
    } else {
      setSelectedSourceId(id);
      if (!campaignData[id]) fetchCampaigns(id);
    }
  };

  const handleCampaignClick = (sourceId: number, campaignId: string) => {
    const key = `${sourceId}_${campaignId}`;
    const next = new Set(expandedCampaigns);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
      if (!campaignEntries[key]) fetchCampaignEntries(sourceId, campaignId, 1);
    }
    setExpandedCampaigns(next);
  };

  const selectedSource = sources.find(s => s.id === selectedSourceId) || null;

  const metricTags = (s: CustomSource) => {
    const tags: string[] = ['Spend'];
    if (s.track_impressions) tags.push('Impressions');
    if (s.track_clicks) tags.push('Clicks');
    if (s.track_conversions) tags.push('Conversions');
    if (s.track_revenue) tags.push('Revenue');
    return tags;
  };

  const fmtNum = (n: number) => n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n);

  return (
    <div className="max-w-[1000px] mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <p className="text-[13px] text-text-dim">Add ad spend from platforms we don&apos;t integrate with yet.</p>
        <button
          onClick={() => { setEditingSource(null); setSourceModalOpen(true); }}
          className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-accent-text px-4 py-2 rounded-lg text-[13px] font-medium transition-colors shrink-0"
        >
          <Plus size={15} />
          Add source
        </button>
      </div>

      {/* Sources list */}
      {loading ? (
        <div className="bg-bg-surface rounded-xl border border-border-dim overflow-hidden">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="px-5 py-4 border-b border-border-dim/40 last:border-0">
              <div className="h-4 bg-bg-elevated animate-pulse rounded-lg w-1/2" />
            </div>
          ))}
        </div>
      ) : sources.length === 0 ? (
        <div className="bg-bg-surface rounded-xl border border-border-dim p-12 flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-bg-elevated flex items-center justify-center">
            <PlusCircle size={22} className="text-text-dim" />
          </div>
          <p className="text-text-dim text-[13px]">No custom sources yet</p>
          <p className="text-text-dim/70 text-[12px] text-center max-w-sm">
            Add sources like Reddit Ads, Bing Ads, or Twitter/X to manually track spend alongside your connected platforms.
          </p>
          <button
            onClick={() => { setEditingSource(null); setSourceModalOpen(true); }}
            className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-accent-text px-4 py-2 rounded-lg text-[13px] font-medium transition-colors mt-1"
          >
            <Plus size={15} />
            Add source
          </button>
        </div>
      ) : (
        <div className="bg-bg-surface rounded-xl border border-border-dim overflow-hidden">
          {sources.map(source => {
            const isSelected = selectedSourceId === source.id;
            const campaigns = campaignData[source.id] || [];
            const isLoadingCampaigns = campaignsLoading[source.id];
            return (
              <div key={source.id}>
                {/* Level 0: Source row */}
                <div
                  className={`flex items-center justify-between px-5 py-3.5 border-b border-border-dim/40 last:border-0 cursor-pointer transition-colors ${isSelected ? 'bg-bg-hover' : 'hover:bg-bg-hover'}`}
                  onClick={() => handleSourceClick(source.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isSelected ? <ChevronDown size={14} className="text-text-dim shrink-0" /> : <ChevronRight size={14} className="text-text-dim shrink-0" />}
                    {(() => {
                      const si = SOURCE_ICONS.find(s => s.key === source.icon);
                      return si ? (
                        <div className="w-5 h-5 rounded-[5px] flex items-center justify-center shrink-0" style={{ background: si.bg }}>{si.svg}</div>
                      ) : (
                        <div className="w-5 h-5 rounded-[5px] flex items-center justify-center shrink-0 bg-accent/15 text-accent text-[10px] font-bold">
                          {source.name[0]?.toUpperCase()}
                        </div>
                      );
                    })()}
                    <span className="text-[13px] font-medium text-text-heading truncate">{source.name}</span>
                    <div className="flex gap-1.5">
                      {metricTags(source).map(tag => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-bg-elevated text-text-dim">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="relative shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === source.id ? null : source.id); }}
                      className="p-1 rounded hover:bg-bg-elevated transition-colors text-text-dim hover:text-text-heading"
                    >
                      <MoreVertical size={14} />
                    </button>
                    {openMenu === source.id && (
                      <div className="absolute right-0 top-full mt-1 bg-bg-elevated border border-border-dim rounded-lg shadow-lg z-20 py-1 min-w-[120px]">
                        <button
                          onClick={e => { e.stopPropagation(); setEditingSource(source); setSourceModalOpen(true); setOpenMenu(null); }}
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-text-body hover:bg-bg-hover transition-colors"
                        >
                          <Pencil size={12} /> Edit
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setOpenMenu(null); handleDeleteSource(source.id); }}
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-error hover:bg-bg-hover transition-colors"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Level 1: Campaign list (expanded source) */}
                {isSelected && (
                  <div className="border-b border-border-dim bg-bg-body">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-border-dim/40">
                      <span className="text-[12px] text-text-dim">
                        {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setImportModalSource(source)}
                          className="flex items-center gap-1 text-accent hover:text-accent-hover text-[12px] font-medium transition-colors"
                        >
                          <Upload size={13} /> Import
                        </button>
                        <button
                          onClick={() => { setEditingEntry(null); setEntryModalOpen(true); }}
                          className="flex items-center gap-1 text-accent hover:text-accent-hover text-[12px] font-medium transition-colors"
                        >
                          <Plus size={13} /> Add entry
                        </button>
                      </div>
                    </div>

                    {isLoadingCampaigns ? (
                      <div className="px-5 py-6 flex justify-center">
                        <div className="text-text-dim text-[12px]">Loading campaigns...</div>
                      </div>
                    ) : campaigns.length === 0 ? (
                      <div className="px-5 py-8 flex flex-col items-center gap-2">
                        <p className="text-text-dim text-[12px]">No entries yet</p>
                        <button
                          onClick={() => { setEditingEntry(null); setEntryModalOpen(true); }}
                          className="flex items-center gap-1 text-accent hover:text-accent-hover text-[12px] font-medium transition-colors"
                        >
                          <Plus size={13} /> Add your first entry
                        </button>
                      </div>
                    ) : (
                      <>
                        {campaigns.map(camp => {
                          const campKey = `${source.id}_${camp.campaign_id}`;
                          const isExpanded = expandedCampaigns.has(campKey);
                          const entries = campaignEntries[campKey] || [];
                          const total = campaignEntriesTotal[campKey] || 0;
                          const page = campaignEntriesPage[campKey] || 1;
                          const isLoadingEntries = campaignEntriesLoading[campKey];
                          const totalPages = Math.ceil(total / entriesLimit);

                          return (
                            <div key={camp.campaign_id}>
                              {/* Campaign row */}
                              <div
                                className={`flex items-center gap-3 px-5 pl-10 py-2.5 border-b border-border-dim/20 cursor-pointer transition-colors ${isExpanded ? 'bg-bg-hover/50' : 'hover:bg-bg-hover/30'}`}
                                onClick={() => handleCampaignClick(source.id, camp.campaign_id)}
                              >
                                {isExpanded ? <ChevronDown size={12} className="text-text-dim shrink-0" /> : <ChevronRight size={12} className="text-text-dim shrink-0" />}
                                <span className="text-[12px] font-medium text-text-heading truncate flex-1 min-w-0">{camp.campaign_id}</span>
                                <AttributionPill campaign={camp} sourceId={source.id} onUpdated={() => fetchCampaigns(source.id)} />
                                <span className="text-[12px] text-text-body w-20 text-right">${parseFloat(camp.total_spend).toFixed(2)}</span>
                                {source.track_impressions && (
                                  <span className="text-[12px] text-text-dim w-14 text-right">{fmtNum(camp.total_impressions)}</span>
                                )}
                                {source.track_clicks && (
                                  <span className="text-[12px] text-text-dim w-14 text-right">{fmtNum(camp.total_clicks)}</span>
                                )}
                                {source.track_revenue && (
                                  <span className="text-[12px] text-text-body w-20 text-right">${parseFloat(camp.total_revenue).toFixed(2)}</span>
                                )}
                                <span className="text-[10px] text-text-dim w-12 text-right">{camp.entry_count} rows</span>
                              </div>

                              {/* Level 2: Daily entries for campaign */}
                              {isExpanded && (
                                <div className="bg-bg-body/50">
                                  {isLoadingEntries ? (
                                    <div className="px-5 pl-16 py-4 text-text-dim text-[11px]">Loading entries...</div>
                                  ) : entries.length === 0 ? (
                                    <div className="px-5 pl-16 py-4 text-text-dim text-[11px]">No entries</div>
                                  ) : (
                                    <>
                                      {/* Entry headers */}
                                      <div className="grid px-5 pl-16 py-1.5 border-b border-border-dim/20 text-[9px] uppercase tracking-wider text-text-dim"
                                        style={{ gridTemplateColumns: `6rem 4rem 5rem${source.track_impressions ? ' 5rem' : ''}${source.track_clicks ? ' 4rem' : ''}${source.track_revenue ? ' 5rem' : ''}${source.track_conversions ? ' 4rem' : ''} 5rem 2.5rem` }}>
                                        <span>Date</span>
                                        <span>Country</span>
                                        <span className="text-right">Spend</span>
                                        {source.track_impressions && <span className="text-right">Impr.</span>}
                                        {source.track_clicks && <span className="text-right">Clicks</span>}
                                        {source.track_revenue && <span className="text-right">Revenue</span>}
                                        {source.track_conversions && <span className="text-right">Conv.</span>}
                                        <span />
                                        <span />
                                      </div>

                                      {entries.map(entry => {
                                        const needsDetail = camp.country_attribution === 'multiple' && !entry.country_code;
                                        return (
                                          <div key={entry.id}
                                            className="grid px-5 pl-16 py-2 border-b border-border-dim/10 last:border-0 hover:bg-bg-hover/30 transition-colors items-center"
                                            style={{ gridTemplateColumns: `6rem 4rem 5rem${source.track_impressions ? ' 5rem' : ''}${source.track_clicks ? ' 4rem' : ''}${source.track_revenue ? ' 5rem' : ''}${source.track_conversions ? ' 4rem' : ''} 5rem 2.5rem` }}>
                                            <span className="text-[11px] text-text-body">{formatDate(entry.date)}</span>
                                            <span className="text-[11px] text-text-dim">{entry.country_code || '—'}</span>
                                            <span className="text-[11px] text-text-body text-right">${parseFloat(entry.spend).toFixed(2)}</span>
                                            {source.track_impressions && <span className="text-[11px] text-text-body text-right">{entry.impressions.toLocaleString()}</span>}
                                            {source.track_clicks && <span className="text-[11px] text-text-body text-right">{entry.clicks.toLocaleString()}</span>}
                                            {source.track_revenue && <span className="text-[11px] text-text-body text-right">${parseFloat(entry.revenue).toFixed(2)}</span>}
                                            {source.track_conversions && <span className="text-[11px] text-text-body text-right">{entry.purchases}</span>}
                                            <span>
                                              {needsDetail && (
                                                <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-600 dark:text-orange-400 font-medium">
                                                  <AlertTriangle size={8} /> Needs detail
                                                </span>
                                              )}
                                            </span>
                                            <div className="relative">
                                              <button
                                                onClick={e => { e.stopPropagation(); setEntryMenu(entryMenu === entry.id ? null : entry.id); }}
                                                className="p-1 rounded hover:bg-bg-elevated transition-colors text-text-dim hover:text-text-heading"
                                              >
                                                <MoreVertical size={12} />
                                              </button>
                                              {entryMenu === entry.id && (
                                                <div className="absolute right-0 top-full mt-1 bg-bg-elevated border border-border-dim rounded-lg shadow-lg z-20 py-1 min-w-[100px]">
                                                  <button
                                                    onClick={() => { setEditingEntry(entry); setEntryModalOpen(true); setEntryMenu(null); }}
                                                    className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-text-body hover:bg-bg-hover transition-colors"
                                                  >
                                                    <Pencil size={11} /> Edit
                                                  </button>
                                                  <button
                                                    onClick={() => { setEntryMenu(null); handleDeleteEntry(source.id, entry.id, camp.campaign_id); }}
                                                    className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-error hover:bg-bg-hover transition-colors"
                                                  >
                                                    <Trash2 size={11} /> Delete
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}

                                      {/* Pagination */}
                                      {totalPages > 1 && (
                                        <div className="flex items-center justify-between px-5 pl-16 py-2 border-t border-border-dim/20">
                                          <span className="text-[10px] text-text-dim">Page {page} of {totalPages}</span>
                                          <div className="flex items-center gap-1">
                                            {Array.from({ length: totalPages }, (_, i) => (
                                              <button
                                                key={i}
                                                onClick={() => fetchCampaignEntries(source.id, camp.campaign_id, i + 1)}
                                                className={`px-1.5 py-0.5 text-[10px] rounded ${
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
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Source Modal */}
      {sourceModalOpen && (
        <SourceModal
          source={editingSource}
          onClose={() => { setSourceModalOpen(false); setEditingSource(null); }}
          onSaved={() => { setSourceModalOpen(false); setEditingSource(null); fetchSources(); }}
        />
      )}

      {/* Entry Modal */}
      {entryModalOpen && selectedSource && (
        <EntryModal
          source={selectedSource}
          entry={editingEntry}
          onClose={() => { setEntryModalOpen(false); setEditingEntry(null); }}
          onSaved={() => {
            setEntryModalOpen(false);
            setEditingEntry(null);
            fetchCampaigns(selectedSource.id);
          }}
        />
      )}

      {/* Import Modal */}
      {importModalSource && (
        <ImportModal
          source={importModalSource}
          onClose={() => setImportModalSource(null)}
          onImported={() => {
            if (selectedSourceId) fetchCampaigns(selectedSourceId);
          }}
        />
      )}
    </div>
  );
}
