interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  valueColor?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}

export default function KPICard({ title, value, subtitle, valueColor = 'text-text-heading', icon: Icon }: KPICardProps) {
  return (
    <div className="bg-bg-surface rounded-xl p-6 border border-border-dim">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={18} className="text-text-dim" />}
        <span className="text-[11px] font-medium uppercase tracking-wider text-text-dim">
          {title}
        </span>
      </div>
      <p className={`text-[28px] font-bold tracking-tight mt-2 leading-none ${valueColor}`}>
        {value}
      </p>
      {subtitle && (
        <p className="text-[12px] text-text-dim mt-2">{subtitle}</p>
      )}
    </div>
  );
}
