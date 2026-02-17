'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { Plus, PlusCircle, MoreVertical, Pencil, Trash2, ChevronDown, ChevronRight, Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

interface CustomSource {
  id: number;
  name: string;
  track_impressions: boolean;
  track_clicks: boolean;
  track_conversions: boolean;
  track_revenue: boolean;
  created_at: string;
}

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
        spend: parseFloat(spend) || 0,
        impressions: parseInt(impressions) || 0,
        clicks: parseInt(clicks) || 0,
        revenue: parseFloat(revenue) || 0,
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
            <input type="number" step="0.01" value={spend} onChange={e => setSpend(e.target.value)}
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
              <input type="number" step="0.01" value={revenue} onChange={e => setRevenue(e.target.value)}
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

        parsed.push({
          campaignName: String(campaignVal).trim(),
          spend: parseFloat(String(vals[cols.spend])) || 0,
          impressions: cols.impressions >= 0 ? (parseInt(String(vals[cols.impressions])) || 0) : 0,
          clicks: cols.clicks >= 0 ? (parseInt(String(vals[cols.clicks])) || 0) : 0,
          conversions: cols.conversions >= 0 ? (parseInt(String(vals[cols.conversions])) || 0) : 0,
          revenue: cols.revenue >= 0 ? (parseFloat(String(vals[cols.revenue])) || 0) : 0,
        });
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

  // Entries state
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [entriesTotal, setEntriesTotal] = useState(0);
  const [entriesPage, setEntriesPage] = useState(1);
  const [entriesLoading, setEntriesLoading] = useState(false);
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

  const fetchEntries = useCallback(async (sourceId: number) => {
    if (!user?.id) return;
    setEntriesLoading(true);
    try {
      const params = new URLSearchParams({ userId: user.id, page: String(entriesPage), limit: String(entriesLimit) });
      const res = await fetch(`${API_URL}/api/custom-sources/${sourceId}/entries?${params}`);
      const json = await res.json();
      if (res.ok) {
        setEntries(json.entries || []);
        setEntriesTotal(json.total || 0);
      }
    } catch { /* ignore */ } finally {
      setEntriesLoading(false);
    }
  }, [user?.id, entriesPage]);

  useEffect(() => { fetchSources(); }, [fetchSources]);

  useEffect(() => {
    if (selectedSourceId !== null) fetchEntries(selectedSourceId);
  }, [selectedSourceId, fetchEntries]);

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
      if (selectedSourceId === id) {
        setSelectedSourceId(null);
        setEntries([]);
      }
      fetchSources();
    } catch { /* ignore */ }
  };

  const handleDeleteEntry = async (sourceId: number, entryId: number) => {
    if (!user?.id) return;
    try {
      await fetch(`${API_URL}/api/custom-sources/${sourceId}/entries/${entryId}?userId=${encodeURIComponent(user.id)}`, { method: 'DELETE' });
      fetchEntries(sourceId);
    } catch { /* ignore */ }
  };

  const handleSourceClick = (id: number) => {
    if (selectedSourceId === id) {
      setSelectedSourceId(null);
    } else {
      setSelectedSourceId(id);
      setEntriesPage(1);
    }
  };

  const selectedSource = sources.find(s => s.id === selectedSourceId) || null;
  const entriesTotalPages = Math.ceil(entriesTotal / entriesLimit);

  const metricTags = (s: CustomSource) => {
    const tags: string[] = ['Spend'];
    if (s.track_impressions) tags.push('Impressions');
    if (s.track_clicks) tags.push('Clicks');
    if (s.track_conversions) tags.push('Conversions');
    if (s.track_revenue) tags.push('Revenue');
    return tags;
  };

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
            return (
              <div key={source.id}>
                <div
                  className={`flex items-center justify-between px-5 py-3.5 border-b border-border-dim/40 last:border-0 cursor-pointer transition-colors ${isSelected ? 'bg-bg-hover' : 'hover:bg-bg-hover'}`}
                  onClick={() => handleSourceClick(source.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isSelected ? <ChevronDown size={14} className="text-text-dim shrink-0" /> : <ChevronRight size={14} className="text-text-dim shrink-0" />}
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

                {/* Entries table (expanded) */}
                {isSelected && selectedSource && (
                  <div className="border-b border-border-dim bg-bg-body">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-border-dim/40">
                      <span className="text-[12px] text-text-dim">{entriesTotal} entr{entriesTotal === 1 ? 'y' : 'ies'}</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setImportModalSource(selectedSource)}
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

                    {entriesLoading ? (
                      <div className="px-5 py-6 flex justify-center">
                        <div className="text-text-dim text-[12px]">Loading...</div>
                      </div>
                    ) : entries.length === 0 ? (
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
                        {/* Column headers */}
                        <div className={`grid px-5 py-2 border-b border-border-dim/40 text-[10px] uppercase tracking-wider text-text-dim`}
                          style={{ gridTemplateColumns: `6.5rem 1fr 4rem 5rem${selectedSource.track_impressions ? ' 5rem' : ''}${selectedSource.track_clicks ? ' 4rem' : ''}${selectedSource.track_revenue ? ' 5rem' : ''}${selectedSource.track_conversions ? ' 4rem' : ''} 2.5rem` }}>
                          <span>Date</span>
                          <span>Campaign</span>
                          <span>Country</span>
                          <span className="text-right">Spend</span>
                          {selectedSource.track_impressions && <span className="text-right">Impr.</span>}
                          {selectedSource.track_clicks && <span className="text-right">Clicks</span>}
                          {selectedSource.track_revenue && <span className="text-right">Revenue</span>}
                          {selectedSource.track_conversions && <span className="text-right">Conv.</span>}
                          <span />
                        </div>

                        {entries.map(entry => (
                          <div key={entry.id}
                            className="grid px-5 py-2.5 border-b border-border-dim/20 last:border-0 hover:bg-bg-hover/50 transition-colors items-center"
                            style={{ gridTemplateColumns: `6.5rem 1fr 4rem 5rem${selectedSource.track_impressions ? ' 5rem' : ''}${selectedSource.track_clicks ? ' 4rem' : ''}${selectedSource.track_revenue ? ' 5rem' : ''}${selectedSource.track_conversions ? ' 4rem' : ''} 2.5rem` }}>
                            <span className="text-[12px] text-text-body">{formatDate(entry.date)}</span>
                            <span className="text-[12px] text-text-heading font-medium truncate pr-2">{entry.campaign_id}</span>
                            <span className="text-[12px] text-text-dim">{entry.country_code || '—'}</span>
                            <span className="text-[12px] text-text-body text-right">${parseFloat(entry.spend).toFixed(2)}</span>
                            {selectedSource.track_impressions && <span className="text-[12px] text-text-body text-right">{entry.impressions.toLocaleString()}</span>}
                            {selectedSource.track_clicks && <span className="text-[12px] text-text-body text-right">{entry.clicks.toLocaleString()}</span>}
                            {selectedSource.track_revenue && <span className="text-[12px] text-text-body text-right">${parseFloat(entry.revenue).toFixed(2)}</span>}
                            {selectedSource.track_conversions && <span className="text-[12px] text-text-body text-right">{entry.purchases}</span>}
                            <div className="relative">
                              <button
                                onClick={e => { e.stopPropagation(); setEntryMenu(entryMenu === entry.id ? null : entry.id); }}
                                className="p-1 rounded hover:bg-bg-elevated transition-colors text-text-dim hover:text-text-heading"
                              >
                                <MoreVertical size={13} />
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
                                    onClick={() => { setEntryMenu(null); handleDeleteEntry(source.id, entry.id); }}
                                    className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-error hover:bg-bg-hover transition-colors"
                                  >
                                    <Trash2 size={11} /> Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}

                        {/* Pagination */}
                        {entriesTotalPages > 1 && (
                          <div className="flex items-center justify-between px-5 py-2.5 border-t border-border-dim/40">
                            <span className="text-[11px] text-text-dim">Page {entriesPage} of {entriesTotalPages}</span>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: entriesTotalPages }, (_, i) => (
                                <button
                                  key={i}
                                  onClick={() => setEntriesPage(i + 1)}
                                  className={`px-2 py-0.5 text-[11px] rounded ${
                                    entriesPage === i + 1
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
            fetchEntries(selectedSource.id);
          }}
        />
      )}

      {/* Import Modal */}
      {importModalSource && (
        <ImportModal
          source={importModalSource}
          onClose={() => setImportModalSource(null)}
          onImported={() => {
            if (selectedSourceId) fetchEntries(selectedSourceId);
          }}
        />
      )}
    </div>
  );
}
