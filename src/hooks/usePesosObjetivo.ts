import { useState, useEffect, useCallback } from 'react';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
const supabase = supabaseClient as any;
import { useAuth } from '@/contexts/AuthContext';

export interface PesoObjetivo {
  ticker: string;
  peso_pct: number; // 0-100
}

/**
 * Hook para leer los pesos objetivo del usuario desde Supabase.
 * Reemplaza los targetPct hardcodeados en portfolioMetadata.ts.
 */
export function usePesosObjetivo() {
  const { user } = useAuth();
  const [pesos, setPesos] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchPesos = useCallback(async () => {
    if (!user?.id) {
      setPesos({});
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('pesos_objetivo_usuario')
        .select('ticker, peso_pct')
        .eq('user_id', user.id);

      if (error) throw error;

      const map: Record<string, number> = {};
      (data || []).forEach((row: PesoObjetivo) => {
        map[row.ticker] = Number(row.peso_pct);
      });
      setPesos(map);
    } catch (err) {
      console.error('Error cargando pesos objetivo:', err);
      setPesos({});
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchPesos(); }, [fetchPesos]);

  /**
   * Devuelve el peso objetivo de un ticker (0-100).
   * Si no existe en Supabase, devuelve 0.
   */
  const getPeso = (ticker: string): number => pesos[ticker] ?? 0;

  /**
   * Devuelve el peso objetivo como decimal (0-1) para cálculos.
   */
  const getPesoDecimal = (ticker: string): number => (pesos[ticker] ?? 0) / 100;

  /**
   * Suma total de pesos asignados (debería ser ~100).
   */
  const totalAsignado = Object.values(pesos).reduce((a, b) => a + b, 0);

  return { pesos, getPeso, getPesoDecimal, totalAsignado, loading, refetch: fetchPesos };
}
