'use client';

const PRESETS = [
  { label: '7d', days: 7 },
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
] as const;

interface DateRangeSelectorProps {
  selectedDays: number;
  onChange: (days: number) => void;
}

export default function DateRangeSelector({ selectedDays, onChange }: DateRangeSelectorProps) {
  return (
    <div className="flex items-center gap-1">
      {PRESETS.map(p => (
        <button
          key={p.days}
          onClick={() => onChange(p.days)}
          className={`px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors ${
            selectedDays === p.days
              ? 'bg-accent text-accent-text'
              : 'text-text-dim hover:bg-bg-hover hover:text-text-body'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
