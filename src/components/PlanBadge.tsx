import { useAuth, type PlanActivo } from '@/contexts/AuthContext';
import { Crown, Gem, Zap } from 'lucide-react';

const PLAN_CONFIG: Record<PlanActivo, { label: string; icon: React.ReactNode; className: string }> = {
  explorer: {
    label: 'Explorer',
    icon: <Gem className="h-3 w-3" />,
    className: 'bg-muted/50 text-muted-foreground border-border',
  },
  strategic: {
    label: 'Strategic',
    icon: <Zap className="h-3 w-3" />,
    className: 'bg-primary/10 text-primary border-primary/30',
  },
  executive: {
    label: 'Executive AI',
    icon: <Crown className="h-3 w-3" />,
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  },
};

const PlanBadge = () => {
  const { plan } = useAuth();
  const config = PLAN_CONFIG[plan];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${config.className}`}>
      {config.icon}
      {config.label}
    </span>
  );
};

export default PlanBadge;
