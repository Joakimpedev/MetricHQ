'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { ALL_CURRENCIES, POPULAR_CURRENCIES } from '../lib/currency';

/** Country code lookup for flag images (currency code → ISO 3166-1 alpha-2) */
const CURRENCY_COUNTRY: Record<string, string> = {
  USD: 'us', EUR: 'eu', GBP: 'gb', CAD: 'ca', AUD: 'au', JPY: 'jp', CHF: 'ch', CNY: 'cn',
  SEK: 'se', NOK: 'no', DKK: 'dk', NZD: 'nz', SGD: 'sg', HKD: 'hk', KRW: 'kr', INR: 'in',
  BRL: 'br', MXN: 'mx', ZAR: 'za', TRY: 'tr', PLN: 'pl', THB: 'th', IDR: 'id', MYR: 'my',
  PHP: 'ph', VND: 'vn', CZK: 'cz', ILS: 'il', HUF: 'hu', RON: 'ro', BGN: 'bg', HRK: 'hr',
  ISK: 'is', RUB: 'ru', UAH: 'ua', AED: 'ae', ARS: 'ar', BDT: 'bd', CLP: 'cl', COP: 'co',
  EGP: 'eg', GEL: 'ge', GHS: 'gh', KES: 'ke', KWD: 'kw', NGN: 'ng', PKR: 'pk', QAR: 'qa',
  SAR: 'sa', TWD: 'tw', TZS: 'tz', UGX: 'ug', PEN: 'pe', LKR: 'lk', MAD: 'ma', JOD: 'jo',
  BHD: 'bh', OMR: 'om', TTD: 'tt', DOP: 'do', GTQ: 'gt', CRC: 'cr', PAB: 'pa', RSD: 'rs',
  BAM: 'ba', MKD: 'mk', GIP: 'gi',
};

/** Currency name lookup for better UX */
const CURRENCY_NAMES: Record<string, string> = {
  USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound', CAD: 'Canadian Dollar',
  AUD: 'Australian Dollar', JPY: 'Japanese Yen', CHF: 'Swiss Franc', CNY: 'Chinese Yuan',
  SEK: 'Swedish Krona', NOK: 'Norwegian Krone', DKK: 'Danish Krone', NZD: 'New Zealand Dollar',
  SGD: 'Singapore Dollar', HKD: 'Hong Kong Dollar', KRW: 'South Korean Won', INR: 'Indian Rupee',
  BRL: 'Brazilian Real', MXN: 'Mexican Peso', ZAR: 'South African Rand', TRY: 'Turkish Lira',
  PLN: 'Polish Zloty', THB: 'Thai Baht', IDR: 'Indonesian Rupiah', MYR: 'Malaysian Ringgit',
  PHP: 'Philippine Peso', VND: 'Vietnamese Dong', CZK: 'Czech Koruna', ILS: 'Israeli Shekel',
  HUF: 'Hungarian Forint', RON: 'Romanian Leu', BGN: 'Bulgarian Lev', HRK: 'Croatian Kuna',
  ISK: 'Icelandic Krona', RUB: 'Russian Ruble', UAH: 'Ukrainian Hryvnia', AED: 'UAE Dirham',
  ARS: 'Argentine Peso', BDT: 'Bangladeshi Taka', CLP: 'Chilean Peso', COP: 'Colombian Peso',
  EGP: 'Egyptian Pound', GEL: 'Georgian Lari', GHS: 'Ghanaian Cedi', KES: 'Kenyan Shilling',
  KWD: 'Kuwaiti Dinar', NGN: 'Nigerian Naira', PKR: 'Pakistani Rupee', QAR: 'Qatari Riyal',
  SAR: 'Saudi Riyal', TWD: 'Taiwan Dollar', TZS: 'Tanzanian Shilling', UGX: 'Ugandan Shilling',
  PEN: 'Peruvian Sol', LKR: 'Sri Lankan Rupee', MAD: 'Moroccan Dirham', JOD: 'Jordanian Dinar',
  BHD: 'Bahraini Dinar', OMR: 'Omani Rial', TTD: 'Trinidad Dollar', DOP: 'Dominican Peso',
  GTQ: 'Guatemalan Quetzal', CRC: 'Costa Rican Colon', PAB: 'Panamanian Balboa',
  RSD: 'Serbian Dinar', BAM: 'Bosnia Mark', MKD: 'Macedonian Denar', GIP: 'Gibraltar Pound',
};

function getCurrencySymbol(code: string): string {
  try {
    const parts = new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).formatToParts(0);
    return parts.find(p => p.type === 'currency')?.value || code;
  } catch {
    return code;
  }
}

interface CurrencySelectProps {
  value: string;
  onChange: (code: string) => void;
  className?: string;
  compact?: boolean;
}

export default function CurrencySelect({ value, onChange, className, compact }: CurrencySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open) {
      setSearch('');
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    // Only show currencies that have a name defined
    const all = (ALL_CURRENCIES as unknown as string[]).filter(c => CURRENCY_NAMES[c]);
    if (!q) {
      const rest = all.filter(c => !POPULAR_CURRENCIES.includes(c));
      return { popular: [...POPULAR_CURRENCIES], other: rest };
    }
    const matches = all.filter(c =>
      c.toLowerCase().includes(q) ||
      CURRENCY_NAMES[c].toLowerCase().includes(q)
    );
    return { popular: [], other: matches };
  }, [search]);

  const symbol = getCurrencySymbol(value);
  const name = CURRENCY_NAMES[value];

  return (
    <div className={`relative ${className || ''}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 border border-border-dim rounded-lg bg-bg-body hover:border-text-dim/30 transition-colors text-left ${
          compact ? 'px-2 py-1.5 text-[12px]' : 'px-3 py-2 text-[13px]'
        } ${open ? 'border-accent' : ''}`}
      >
        <span className="text-text-dim">{symbol}</span>
        <span className="text-text-body font-medium">{value}</span>
        {!compact && name && <span className="text-text-dim hidden sm:inline">· {name}</span>}
        <ChevronDown size={12} className={`text-text-dim ml-auto transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-bg-surface border border-border-dim rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-border-dim">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-dim" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search currencies..."
                className="w-full pl-7 pr-3 py-1.5 text-[12px] bg-bg-body border border-border-dim rounded-lg text-text-body placeholder:text-text-dim/50 focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* List */}
          <div className="max-h-[240px] overflow-y-auto">
            {filtered.popular.length > 0 && (
              <>
                <div className="px-3 pt-2 pb-1">
                  <span className="text-[9px] font-medium uppercase tracking-wider text-text-dim">Popular</span>
                </div>
                {filtered.popular.map(c => (
                  <CurrencyRow
                    key={c}
                    code={c}
                    selected={value === c}
                    onClick={() => { onChange(c); setOpen(false); }}
                  />
                ))}
                {filtered.other.length > 0 && (
                  <div className="px-3 pt-2.5 pb-1 border-t border-border-dim/40 mt-1">
                    <span className="text-[9px] font-medium uppercase tracking-wider text-text-dim">All currencies</span>
                  </div>
                )}
              </>
            )}
            {filtered.other.map(c => (
              <CurrencyRow
                key={c}
                code={c}
                selected={value === c}
                onClick={() => { onChange(c); setOpen(false); }}
              />
            ))}
            {filtered.popular.length === 0 && filtered.other.length === 0 && (
              <div className="px-3 py-4 text-center text-[12px] text-text-dim">No currencies found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CurrencyRow({ code, selected, onClick }: { code: string; selected: boolean; onClick: () => void }) {
  const symbol = getCurrencySymbol(code);
  const name = CURRENCY_NAMES[code];

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-[12px] transition-colors text-left ${
        selected ? 'bg-accent/10 text-accent' : 'text-text-body hover:bg-bg-hover'
      }`}
    >
      {CURRENCY_COUNTRY[code] && (
        <img src={`https://flagcdn.com/16x12/${CURRENCY_COUNTRY[code]}.png`} width={16} height={12} alt="" className="shrink-0 rounded-[1px]" />
      )}
      <span className="w-8 text-text-dim text-right shrink-0">{symbol}</span>
      <span className="font-medium">{code}</span>
      {name && <span className="text-text-dim truncate">{name}</span>}
    </button>
  );
}
