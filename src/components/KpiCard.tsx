import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'emerald' | 'ruby' | 'amber' | 'primary';
  trend?: { value: string; positive: boolean };
}

const colorMap = {
  emerald: 'bg-emerald',
  ruby: 'bg-ruby',
  amber: 'bg-amber',
  primary: 'bg-primary',
};

const KpiCard = ({ title, value, subtitle, icon: Icon, color = 'primary', trend }: KpiCardProps) => {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className={`h-1 ${colorMap[color]}`} />
      <div className="p-4 md:p-5 overflow-hidden">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground truncate mr-2">{title}</p>
          <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </div>
        <p className="text-xl md:text-2xl font-bold font-mono truncate">{value}</p>
        {trend && (
          <p className={`text-xs mt-1 font-mono truncate ${trend.positive ? 'text-emerald' : 'text-ruby'}`}>
            {trend.positive ? '▲' : '▼'} {trend.value}
          </p>
        )}
        {subtitle && <p className="text-[10px] text-muted-foreground mt-1 leading-tight line-clamp-2">{subtitle}</p>}
      </div>
    </div>
  );
};

export default KpiCard;
