import { useEffect, useState } from 'react';
import { ParamsProvider } from '@/contexts/ParamsContext';
import { useSupabasePortfolio } from '@/hooks/useSupabasePortfolio';
import { useAuth } from '@/contexts/AuthContext';
import Dashboard from '@/components/Dashboard';
import OnboardingModal from '@/components/OnboardingModal';
import { Loader2 } from 'lucide-react';

const OWNER_EMAIL = 'finanzas.thimble396@slmail.me';
const MAX_LOADING_MS = 6000; // máximo 6 segundos de carga

const Index = () => {
  const { user, signOut, profile, loading: authLoading } = useAuth();
  const { purchases, liquidity, activos, positions, summary, snapshots, loading, error, refetch } = useSupabasePortfolio();
  const isOwnerView = user?.email?.toLowerCase() === OWNER_EMAIL;
  const [timedOut, setTimedOut] = useState(false);

  // Mostrar onboarding si el usuario tiene perfil pero sin nombre
  const needsOnboarding = profile !== null && !profile?.nombre;

  // Timeout de seguridad: si tarda más de MAX_LOADING_MS, mostrar el dashboard igualmente
  useEffect(() => {
    if (!loading && !authLoading) return;
    const timer = setTimeout(() => setTimedOut(true), MAX_LOADING_MS);
    return () => clearTimeout(timer);
  }, [loading, authLoading]);

  const isLoading = (loading || authLoading) && !timedOut;

  if (isLoading) {
    return (
      <div className="noise-bg min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Cargando tu cartera...</p>
        </div>
      </div>
    );
  }

  if (error && !timedOut) {
    return (
      <div className="noise-bg min-h-screen flex items-center justify-center">
        <div className="bg-card border border-border rounded-xl p-6 text-center max-w-md">
          <p className="text-red-400 font-semibold mb-2">Error al cargar datos</p>
          <p className="text-muted-foreground text-sm mb-4">{error}</p>
          <button onClick={refetch} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <ParamsProvider>
      {needsOnboarding && <OnboardingModal />}
      <Dashboard
        portfolio={{
          name: user?.email || 'Usuario',
          code: '',
          purchases,
          liquidity,
          activos,
          positions,
          summary,
          snapshots
        }}
        onLogout={signOut}
        onAddPurchase={() => refetch()}
        isOwnerView={isOwnerView}
      />
    </ParamsProvider>
  );
};

export default Index;
