interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  valueColor?: string;
}

export default function KPICard({ title, value, subtitle, valueColor = 'text-text-heading' }: KPICardProps) {
  return (
    <div className="bg-bg-surface rounded-xl p-5 border border-border-dim">
      <span className="text-[11px] font-medium uppercase tracking-wider text-text-dim">
        {title}
      </span>
      <p className={`text-[28px] font-bold tracking-tight mt-1.5 leading-none ${valueColor}`}>
        {value}
      </p>
      {subtitle && (
        <p className="text-[12px] text-text-dim mt-1.5">{subtitle}</p>
      )}
    </div>
  );
}
