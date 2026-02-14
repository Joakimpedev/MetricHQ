'use client';

import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useCurrency } from '../lib/currency';

interface CostItem {
  name: string;
  category: string | null;
  amount: number;
  currency: string;
}

interface CostBreakdownProps {
  breakdown: CostItem[];
  total: number;
}

// OKLCH-based palette for donut segments
const CATEGORY_COLORS = [
  'oklch(0.65 0.18 250)',  // blue
  'oklch(0.65 0.18 150)',  // green
  'oklch(0.65 0.18 30)',   // orange
  'oklch(0.65 0.18 320)',  // pink
  'oklch(0.65 0.18 80)',   // yellow
  'oklch(0.65 0.18 200)',  // teal
  'oklch(0.65 0.18 280)',  // purple
  'oklch(0.55 0.12 210)',  // muted teal
];

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function CostBreakdownChart({ breakdown, total }: CostBreakdownProps) {
  const { formatCurrency, convertFromCurrency, currency } = useCurrency();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Group by category, converting each cost to the display currency
  const { categories, categoryMap } = useMemo(() => {
    const map: Record<string, { name: string; amount: number; items: { name: string; amount: number }[] }> = {};

    for (const item of breakdown) {
      const cat = item.category || 'Other';
      if (!map[cat]) map[cat] = { name: cat, amount: 0, items: [] };
      const converted = convertFromCurrency(item.amount, item.currency);
      map[cat].amount += converted;
      map[cat].items.push({ name: item.name, amount: converted });
    }

    const cats = Object.values(map).sort((a, b) => b.amount - a.amount);
    return { categories: cats, categoryMap: map };
  }, [breakdown, convertFromCurrency]);

  const convertedTotal = useMemo(() => {
    return categories.reduce((sum, c) => sum + c.amount, 0);
  }, [categories]);

  // Donut data
  const chartData = useMemo(() => {
    return categories.map((c, i) => ({
      name: c.name,
      value: Math.round(c.amount * 100) / 100,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }));
  }, [categories]);

  const activeIndex = useMemo(() => {
    if (!activeCategory) return -1;
    return chartData.findIndex(d => d.name === activeCategory);
  }, [activeCategory, chartData]);

  if (breakdown.length === 0) return null;

  return (
    <div className="bg-bg-surface rounded-xl border border-border-dim overflow-hidden">
      <div className="px-5 py-4 border-b border-border-dim">
        <h3 className="text-[13px] font-medium text-text-heading">Cost Breakdown</h3>
      </div>

      <div className="p-5 flex flex-col sm:flex-row gap-5">
        {/* Left: Donut chart */}
        <div className="relative w-[200px] h-[200px] mx-auto sm:mx-0 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                dataKey="value"
                onMouseEnter={(_, index) => setActiveCategory(chartData[index]?.name || null)}
                onMouseLeave={() => setActiveCategory(null)}
                strokeWidth={2}
                stroke="var(--bg-surface)"
              >
                {chartData.map((entry, i) => (
                  <Cell
                    key={entry.name}
                    fill={entry.color}
                    style={{
                      transform: activeIndex === i ? 'scale(1.06)' : 'scale(1)',
                      transformOrigin: 'center',
                      transition: 'transform 0.2s ease',
                      opacity: activeIndex >= 0 && activeIndex !== i ? 0.5 : 1,
                    }}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] text-text-dim uppercase tracking-wider">Total</span>
            <span className="text-[16px] font-bold text-text-heading">{formatCurrency(convertedTotal)}</span>
          </div>
        </div>

        {/* Right: Legend */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
          {categories.map((cat, i) => {
            const isActive = activeCategory === cat.name;
            const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
            return (
              <div
                key={cat.name}
                onMouseEnter={() => setActiveCategory(cat.name)}
                onMouseLeave={() => setActiveCategory(null)}
                className={`rounded-lg px-3 py-2 transition-colors cursor-default ${
                  isActive ? 'bg-bg-hover' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: color }}
                  />
                  <span className="text-[12px] text-text-heading font-medium flex-1 truncate">{cat.name}</span>
                  <span className="text-[12px] text-text-body font-medium tabular-nums shrink-0">
                    {formatCurrency(cat.amount)}
                  </span>
                </div>

                {/* Expanded items on hover */}
                {isActive && cat.items.length > 0 && (
                  <div className="ml-[18px] mt-1 space-y-0.5">
                    {cat.items.map((item, j) => (
                      <div key={`${item.name}-${j}`} className="flex items-center justify-between">
                        <span className="text-[11px] text-text-dim truncate flex-1 pr-2">{item.name}</span>
                        <span className="text-[11px] text-text-dim tabular-nums shrink-0">
                          {formatCurrency(item.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
