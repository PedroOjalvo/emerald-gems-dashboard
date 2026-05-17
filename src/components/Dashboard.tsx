import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, LogOut, User, Gem } from 'lucide-react';
import type { Purchase, UserPortfolio } from '@/types/portfolio';
import { useAuth } from '@/contexts/AuthContext';
import AddPurchaseModal from './AddPurchaseModal';
import PlanBadge from './PlanBadge';
import PlanGate from './PlanGate';
import ResumenTab from './tabs/ResumenTab';
import ActivosTab from './tabs/ActivosTab';
import RendimientoTab from './tabs/RendimientoTab';
import RiesgoTab from './tabs/RiesgoTab';
import AnalisisTab from './tabs/AnalisisTab';
import DecisionTab from './tabs/DecisionTab';
import ParametrosTab from './tabs/ParametrosTab';
import EstrategiaTab from './tabs/EstrategiaTab';
import OpenClawPanel from './OpenClawPanel';

interface DashboardProps {
  portfolio: UserPortfolio;
  onLogout: () => void;
  onAddPurchase: (purchase: Purchase) => void;
  isOwnerView?: boolean;
}

// Pestañas disponibles por plan
const TABS_EXPLORER = ['Resumen', 'Activos'] as const;
const TABS_ALL = ['Resumen', 'Activos', 'Rendimiento', 'Riesgo', 'Análisis', 'Decisión del Mes', 'Parámetros', 'Estrategia'] as const;

const Dashboard = ({ portfolio, onLogout, onAddPurchase, isOwnerView = false }: DashboardProps) => {
  const { plan, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('Resumen');
  const [modalOpen, setModalOpen] = useState(false);

  const isExplorer = plan === 'explorer';

  const baseTabs = isExplorer ? [...TABS_EXPLORER] : [...TABS_ALL];
  const tabs = [...baseTabs, ...(isOwnerView ? ['OpenClaw'] : [])];

  const displayName = profile?.nombre
    ? `${profile.nombre}${profile.apellidos ? ' ' + profile.apellidos : ''}`
    : portfolio.name;

  const renderTab = () => {
    switch (activeTab) {
      case 'Resumen':
        return (
          <ResumenTab
            purchases={portfolio.purchases}
            liquidity={portfolio.liquidity}
            positions={portfolio.positions ?? []}
            summary={portfolio.summary ?? null}
          />
        );
      case 'Activos':
        return (
          <ActivosTab
            liquidity={portfolio.liquidity}
            positions={portfolio.positions ?? []}
            summary={portfolio.summary ?? null}
          />
        );
      case 'Rendimiento':
        return (
          <PlanGate requiredPlan="strategic">
            <RendimientoTab
              purchases={portfolio.purchases}
              liquidity={portfolio.liquidity}
              activos={portfolio.activos ?? []}
              summary={portfolio.summary ?? null}
              snapshots={portfolio.snapshots ?? []}
            />
          </PlanGate>
        );
      case 'Riesgo':
        return (
          <PlanGate requiredPlan="strategic">
            <RiesgoTab positions={portfolio.positions ?? []} />
          </PlanGate>
        );
      case 'Análisis':
        return (
          <PlanGate requiredPlan="strategic">
            <AnalisisTab
              purchases={portfolio.purchases}
              liquidity={portfolio.liquidity}
              positions={portfolio.positions ?? []}
              summary={portfolio.summary ?? null}
            />
          </PlanGate>
        );
      case 'Decisión del Mes':
        return (
          <PlanGate requiredPlan="strategic">
            <DecisionTab
              purchases={portfolio.purchases}
              liquidity={portfolio.liquidity}
              positions={portfolio.positions ?? []}
              summary={portfolio.summary ?? null}
            />
          </PlanGate>
        );
      case 'Parámetros':
        return (
          <PlanGate requiredPlan="strategic">
            <ParametrosTab />
          </PlanGate>
        );
      case 'Estrategia':
        return (
          <PlanGate requiredPlan="strategic">
            <EstrategiaTab enabled={isOwnerView} />
          </PlanGate>
        );
      case 'OpenClaw':
        return isOwnerView ? <OpenClawPanel /> : null;
      default:
        return null;
    }
  };

  return (
    <div className="noise-bg min-h-screen">
      <header className="z-50 border-b border-border bg-card backdrop-blur-none sticky top-0">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <Gem className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">
              <span className="text-primary">Emerald</span> Gems
            </h1>
          </Link>
          <div className="flex items-center gap-3">
            {/* Banner upgrade para Explorer */}
            {isExplorer && (
              <a
                href="/#pricing"
                className="hidden sm:flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/30 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-primary/20 transition-all"
              >
                <Zap className="h-3.5 w-3.5" />
                Upgrade a Strategic
              </a>
            )}
            <button
              onClick={() => setModalOpen(true)}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 hover:brightness-110 transition-all"
            >
              <Zap className="h-4 w-4" /> Acción
            </button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{displayName}</span>
              <PlanBadge />
            </div>
            <button onClick={onLogout} className="text-muted-foreground hover:text-foreground transition-colors" title="Cerrar Sesión">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Banner Explorer — límite de activos */}
      {isExplorer && (portfolio.positions?.length ?? 0) >= 3 && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 text-center text-sm">
          <span className="text-primary font-semibold">Plan Explorer:</span>
          <span className="text-muted-foreground ml-1">Has alcanzado el límite de 3 activos.</span>
          <a href="/#pricing" className="text-primary font-semibold ml-2 hover:underline">
            Actualiza tu plan →
          </a>
        </div>
      )}

      <nav className="z-50 border-b border-border bg-card sticky top-[57px]">
        <div className="max-w-7xl mx-auto px-4 overflow-x-auto scrollbar-none">
          <div className="flex gap-1 py-1">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm whitespace-nowrap rounded-lg transition-all ${
                  activeTab === tab
                    ? 'bg-primary/15 text-primary font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-4 py-6">
        {renderTab()}
      </main>

      <AddPurchaseModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={onAddPurchase} />
    </div>
  );
};

export default Dashboard;
