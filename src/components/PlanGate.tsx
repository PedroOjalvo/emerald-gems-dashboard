import { useAuth, type PlanActivo } from '@/contexts/AuthContext';
import { Crown, Lock } from 'lucide-react';

const PLAN_LEVELS: Record<PlanActivo, number> = {
  explorer: 0,
  strategic: 1,
  executive: 2,
};

const PLAN_NAMES: Record<PlanActivo, string> = {
  explorer: 'Explorer',
  strategic: 'Strategic',
  executive: 'Executive AI',
};

const PLAN_PRICES: Record<PlanActivo, string> = {
  explorer: 'Gratis',
  strategic: '47€/mes',
  executive: '147€/mes',
};

interface PlanGateProps {
  requiredPlan: PlanActivo;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Muestra el contenido solo si el usuario tiene el plan requerido o superior.
 * Si no, muestra un bloqueo con CTA de upgrade.
 */
const PlanGate = ({ requiredPlan, children, fallback }: PlanGateProps) => {
  const { plan } = useAuth();

  const userLevel = PLAN_LEVELS[plan];
  const requiredLevel = PLAN_LEVELS[requiredPlan];

  if (userLevel >= requiredLevel) {
    return <>{children}</>;
  }

  if (fallback) return <>{fallback}</>;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mx-auto mb-4">
          <Lock className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-lg font-bold mb-2">Función exclusiva</h3>
        <p className="text-muted-foreground text-sm mb-6">
          Esta función requiere el plan{' '}
          <span className="text-primary font-semibold">{PLAN_NAMES[requiredPlan]}</span>
          {' '}({PLAN_PRICES[requiredPlan]}) o superior.
        </p>
        <div className="flex flex-col gap-3">
          <div className="bg-muted/30 rounded-lg p-3 text-left text-sm">
            <p className="font-semibold text-foreground mb-1 flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" />
              Tu plan actual: {PLAN_NAMES[plan]}
            </p>
            <p className="text-muted-foreground">
              {plan === 'explorer'
                ? 'Hasta 3 activos, pestañas básicas.'
                : 'Activos ilimitados, dashboard completo.'}
            </p>
          </div>
          <a
            href="/#pricing"
            className="bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg text-sm hover:brightness-110 transition-all"
          >
            Ver planes y precios
          </a>
        </div>
      </div>
    </div>
  );
};

export default PlanGate;
