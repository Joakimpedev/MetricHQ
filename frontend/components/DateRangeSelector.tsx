'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  compareStartDate?: string;
  compareEndDate?: string;
}

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  compareLabel?: string;
}

/** Format Date to YYYY-MM-DD in local timezone (not UTC) */
function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function localToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function daysAgo(n: number): Date {
  const d = localToday();
  d.setDate(d.getDate() - n);
  return d;
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const PRESETS = [
  { label: 'Today', getDates: () => ({ startDate: fmtDate(localToday()), endDate: fmtDate(localToday()) }) },
  { label: 'Yesterday', getDates: () => { const d = daysAgo(1); return { startDate: fmtDate(d), endDate: fmtDate(d) }; } },
  { label: 'Last 7 days', getDates: () => ({ startDate: fmtDate(daysAgo(6)), endDate: fmtDate(localToday()) }) },
  { label: 'Last 30 days', getDates: () => ({ startDate: fmtDate(daysAgo(29)), endDate: fmtDate(localToday()) }) },
  { label: 'This month', getDates: () => { const now = localToday(); return { startDate: fmtDate(new Date(now.getFullYear(), now.getMonth(), 1)), endDate: fmtDate(now) }; } },
  { label: 'This year', getDates: () => { const now = localToday(); return { startDate: fmtDate(new Date(now.getFullYear(), 0, 1)), endDate: fmtDate(now) }; } },
  { label: 'Last month', getDates: () => { const now = localToday(); const s = new Date(now.getFullYear(), now.getMonth() - 1, 1); const e = new Date(now.getFullYear(), now.getMonth(), 0); return { startDate: fmtDate(s), endDate: fmtDate(e) }; } },
  { label: 'Last year', getDates: () => { const now = localToday(); return { startDate: fmtDate(new Date(now.getFullYear() - 1, 0, 1)), endDate: fmtDate(new Date(now.getFullYear() - 1, 11, 31)) }; } },
];

function displayLabel(range: DateRange): string {
  for (const p of PRESETS) {
    const pd = p.getDates();
    if (pd.startDate === range.startDate && pd.endDate === range.endDate) return p.label;
  }
  const s = parseDate(range.startDate);
  const e = parseDate(range.endDate);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (range.startDate === range.endDate) return fmt(s);
  return `${fmt(s)} – ${fmt(e)}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function inRange(day: Date, start: Date | null, end: Date | null): boolean {
  if (!start || !end) return false;
  const t = day.getTime();
  return t >= start.getTime() && t <= end.getTime();
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function MiniCalendar({ year, month, selStart, selEnd, compStart, compEnd, onDayClick }: {
  year: number; month: number;
  selStart: Date | null; selEnd: Date | null;
  compStart?: Date | null; compEnd?: Date | null;
  onDayClick: (d: Date) => void;
}) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = localToday();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="w-[196px]">
      <div className="text-center text-[12px] font-medium text-text-heading mb-2">
        {MONTH_NAMES[month]} {year}
      </div>
      <div className="grid grid-cols-7">
        {DAY_HEADERS.map(h => (
          <div key={h} className="w-7 h-6 text-[10px] text-text-dim flex items-center justify-center">{h}</div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} className="w-7 h-7" />;
          const d = new Date(year, month, day);
          const isToday = isSameDay(d, today);
          const isSelected = (selStart && isSameDay(d, selStart)) || (selEnd && isSameDay(d, selEnd));
          const isInRange = inRange(d, selStart, selEnd) && !isSelected;
          const isCompSelected = (compStart && isSameDay(d, compStart)) || (compEnd && isSameDay(d, compEnd));
          const isCompInRange = inRange(d, compStart || null, compEnd || null) && !isCompSelected;
          const isFuture = d.getTime() > today.getTime();

          return (
            <button
              key={day}
              disabled={isFuture}
              onClick={() => onDayClick(d)}
              className={`w-7 h-7 text-[11px] rounded transition-colors flex items-center justify-center ${
                isSelected ? 'bg-accent text-accent-text font-medium' :
                isCompSelected ? 'bg-text-dim/30 text-text-heading font-medium' :
                isInRange ? 'bg-accent/10 text-text-heading' :
                isCompInRange ? 'bg-text-dim/10 text-text-body' :
                isToday ? 'text-accent font-medium ring-1 ring-accent/30' :
                isFuture ? 'text-text-dim/30 cursor-not-allowed' :
                'text-text-body hover:bg-bg-hover'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type CompareMode = 'previous' | 'custom';

export default function DateRangeSelector({ value, onChange, compareLabel }: DateRangeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [draftEnd, setDraftEnd] = useState<Date | null>(null);
  const [pickingStart, setPickingStart] = useState(true);
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [compareMode, setCompareMode] = useState<CompareMode>(() => value.compareStartDate ? 'custom' : 'previous');
  const [compStart, setCompStart] = useState<Date | null>(null);
  const [compEnd, setCompEnd] = useState<Date | null>(null);
  const [pickingComp, setPickingComp] = useState(false);
  const [pickingCompStart, setPickingCompStart] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  // Second calendar is next month
  const cal2Month = calMonth === 11 ? 0 : calMonth + 1;
  const cal2Year = calMonth === 11 ? calYear + 1 : calYear;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function openDropdown() {
    setDraftStart(parseDate(value.startDate));
    setDraftEnd(parseDate(value.endDate));
    setPickingStart(true);
    setPickingComp(false);
    const s = parseDate(value.startDate);
    setCalMonth(s.getMonth());
    setCalYear(s.getFullYear());
    setCompareMode(value.compareStartDate ? 'custom' : 'previous');
    setCompStart(value.compareStartDate ? parseDate(value.compareStartDate) : null);
    setCompEnd(value.compareEndDate ? parseDate(value.compareEndDate) : null);
    setOpen(true);
  }

  function handleDayClick(d: Date) {
    if (pickingComp) {
      // Picking comparison dates
      if (pickingCompStart) {
        setCompStart(d);
        setCompEnd(null);
        setPickingCompStart(false);
      } else {
        if (compStart && d < compStart) {
          setCompStart(d);
          setCompEnd(compStart);
        } else {
          setCompEnd(d);
        }
        setPickingCompStart(true);
        setPickingComp(false);
      }
    } else {
      // Picking main dates
      if (pickingStart) {
        setDraftStart(d);
        setDraftEnd(null);
        setPickingStart(false);
      } else {
        if (draftStart && d < draftStart) {
          setDraftStart(d);
          setDraftEnd(draftStart);
        } else {
          setDraftEnd(d);
        }
        setPickingStart(true);
      }
    }
  }

  function handlePreset(preset: typeof PRESETS[number]) {
    const r = preset.getDates();
    setDraftStart(parseDate(r.startDate));
    setDraftEnd(parseDate(r.endDate));
    setPickingStart(true);
    setPickingComp(false);
    const s = parseDate(r.startDate);
    setCalMonth(s.getMonth());
    setCalYear(s.getFullYear());
  }

  function handleDone() {
    const result: DateRange = {
      startDate: draftStart ? fmtDate(draftStart) : value.startDate,
      endDate: (draftEnd || draftStart) ? fmtDate(draftEnd || draftStart!) : value.endDate,
    };
    if (compareMode === 'custom' && compStart && compEnd) {
      result.compareStartDate = fmtDate(compStart);
      result.compareEndDate = fmtDate(compEnd);
    }
    onChange(result);
    setOpen(false);
  }

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  }

  // Check which preset matches draft
  const activePreset = useMemo(() => {
    if (!draftStart || !draftEnd) return null;
    const ds = fmtDate(draftStart);
    const de = fmtDate(draftEnd);
    return PRESETS.find(p => { const pd = p.getDates(); return pd.startDate === ds && pd.endDate === de; })?.label || null;
  }, [draftStart, draftEnd]);

  const fmtShort = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="flex items-center gap-2" ref={ref}>
      {/* Trigger button */}
      <div className="relative">
        <button
          onClick={openDropdown}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border-dim bg-bg-surface hover:bg-bg-hover text-[12px] text-text-heading transition-colors"
        >
          <CalendarIcon size={14} className="text-text-dim" />
          {displayLabel(value)}
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute right-0 top-full mt-1.5 z-50 bg-bg-surface border border-border rounded-xl shadow-2xl overflow-hidden flex">
            {/* Presets sidebar */}
            <div className="w-36 border-r border-border-dim py-2 shrink-0">
              {PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => handlePreset(p)}
                  className={`block w-full text-left px-4 py-2 text-[12px] transition-colors ${
                    activePreset === p.label
                      ? 'text-accent font-medium bg-accent-muted'
                      : 'text-text-body hover:bg-bg-hover hover:text-text-heading'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Calendar area */}
            <div className="p-4">
              {/* Date inputs row */}
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => { setPickingComp(false); setPickingStart(true); }}
                  className={`flex-1 rounded-md px-3 py-1.5 text-[12px] text-center border transition-colors ${
                    !pickingComp ? 'border-accent bg-accent/5 text-text-heading' : 'border-border-dim bg-bg-elevated text-text-body'
                  }`}
                >
                  {draftStart ? fmtShort(draftStart) : '—'}
                </button>
                <span className="text-text-dim text-[12px]">&rarr;</span>
                <button
                  onClick={() => { setPickingComp(false); setPickingStart(false); }}
                  className={`flex-1 rounded-md px-3 py-1.5 text-[12px] text-center border transition-colors ${
                    !pickingComp ? 'border-accent bg-accent/5 text-text-heading' : 'border-border-dim bg-bg-elevated text-text-body'
                  }`}
                >
                  {draftEnd ? fmtShort(draftEnd) : '—'}
                </button>
              </div>

              {/* Navigation + 2 calendars */}
              <div className="flex items-start gap-4">
                <button onClick={prevMonth} className="p-1 mt-0.5 rounded hover:bg-bg-hover text-text-dim shrink-0">
                  <ChevronLeft size={16} />
                </button>
                <MiniCalendar
                  year={calYear} month={calMonth}
                  selStart={draftStart} selEnd={draftEnd}
                  compStart={compareMode === 'custom' ? compStart : undefined}
                  compEnd={compareMode === 'custom' ? compEnd : undefined}
                  onDayClick={handleDayClick}
                />
                <MiniCalendar
                  year={cal2Year} month={cal2Month}
                  selStart={draftStart} selEnd={draftEnd}
                  compStart={compareMode === 'custom' ? compStart : undefined}
                  compEnd={compareMode === 'custom' ? compEnd : undefined}
                  onDayClick={handleDayClick}
                />
                <button onClick={nextMonth} className="p-1 mt-0.5 rounded hover:bg-bg-hover text-text-dim shrink-0">
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Compare section */}
              <div className="mt-4 pt-3 border-t border-border-dim">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-text-dim">Compare to</span>
                  <div className="flex rounded-md border border-border-dim overflow-hidden">
                    <button
                      onClick={() => { setCompareMode('previous'); setPickingComp(false); }}
                      className={`px-3 py-1 text-[11px] transition-colors ${
                        compareMode === 'previous' ? 'bg-accent text-accent-text font-medium' : 'text-text-body hover:bg-bg-hover'
                      }`}
                    >
                      Previous period
                    </button>
                    <button
                      onClick={() => setCompareMode('custom')}
                      className={`px-3 py-1 text-[11px] border-l border-border-dim transition-colors ${
                        compareMode === 'custom' ? 'bg-accent text-accent-text font-medium' : 'text-text-body hover:bg-bg-hover'
                      }`}
                    >
                      Custom
                    </button>
                  </div>
                </div>
                {compareMode === 'custom' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setPickingComp(true); setPickingCompStart(true); }}
                      className={`flex-1 rounded-md px-3 py-1.5 text-[12px] text-center border transition-colors ${
                        pickingComp ? 'border-accent bg-accent/5 text-text-heading' : 'border-border-dim bg-bg-elevated text-text-body'
                      }`}
                    >
                      {compStart ? fmtShort(compStart) : 'Start'}
                    </button>
                    <span className="text-text-dim text-[12px]">&rarr;</span>
                    <button
                      onClick={() => { setPickingComp(true); setPickingCompStart(false); }}
                      className={`flex-1 rounded-md px-3 py-1.5 text-[12px] text-center border transition-colors ${
                        pickingComp ? 'border-accent bg-accent/5 text-text-heading' : 'border-border-dim bg-bg-elevated text-text-body'
                      }`}
                    >
                      {compEnd ? fmtShort(compEnd) : 'End'}
                    </button>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border-dim">
                <button
                  onClick={() => setOpen(false)}
                  className="px-4 py-1.5 rounded-md text-[12px] text-text-dim hover:bg-bg-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDone}
                  className="px-4 py-1.5 rounded-md text-[12px] font-medium bg-accent text-accent-text hover:bg-accent-hover transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Compare badge — inline next to trigger */}
      {compareLabel && (
        <span className="px-3 py-1.5 rounded-lg border border-border-dim bg-bg-surface text-[12px] text-text-dim shrink-0">
          vs {compareLabel}
        </span>
      )}
    </div>
  );
}
