import { useState, useEffect, useCallback } from 'react';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
const supabase = supabaseClient as any;
import { useAuth } from '@/contexts/AuthContext';
import type { Purchase, AssetType, OperationType, PositionRow, PortfolioSummaryRow, PortfolioSnapshotRow } from '@/types/portfolio';

export interface SupabaseActivo {
  id: string;
  ticker: string;
  nombre: string;
  tipo_activo: string;
  cantidad_total: number;
  precio_compra_avg: number;
  precio_actual: number;
  user_id: string | null;
}

function formatDbDate(value: unknown): string {
  if (!value) return '';
  const raw = String(value);
  const match = raw.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : raw.slice(0, 10);
}

export function useSupabasePortfolio() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [liquidity, setLiquidity] = useState(0);
  const [activos, setActivos] = useState<SupabaseActivo[]>([]);
  const [positions, setPositions] = useState<PositionRow[]>([]);
  const [summary, setSummary] = useState<PortfolioSummaryRow | null>(null);
  const [snapshots, setSnapshots] = useState<PortfolioSnapshotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const userId = user?.id;

    if (!userId) {
      setPurchases([]);
      setLiquidity(0);
      setActivos([]);
      setPositions([]);
      setSummary(null);
      setSnapshots([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data: movs, error: movErr } = await supabase
        .from('movimientos')
        .select('*')
        .eq('user_id', userId)
        .order('fecha', { ascending: true });
      if (movErr) throw movErr;

      const mapped: Purchase[] = (movs || []).map((m: any) => ({
        id: String(m.id),
        ticker: m.ticker || '',
        type: (m.tipo_operacion === 'Liquidez' ? 'Liquidez' : 'Acción') as AssetType,
        operation: m.tipo_operacion as OperationType,
        quantity: m.cantidad ?? 0,
        price: m.tipo_operacion === 'Liquidez' ? (m.importe_liquidez ?? 0) : (m.precio_unidad ?? 0),
        date: formatDbDate(m.fecha),
        commission: m.comision ?? 0,
        currentPrice: null,
      }));

      const { data: acts, error: actErr } = await supabase
        .from('activos')
        .select('*')
        .eq('user_id', userId);
      if (actErr) throw actErr;

      const activosMap: Record<string, any> = {};
      (acts || []).forEach((a: any) => { activosMap[a.ticker] = a; });

      mapped.forEach(p => {
        if (p.operation !== 'Liquidez' && activosMap[p.ticker]) {
          p.type = activosMap[p.ticker].tipo_activo as AssetType;
          p.currentPrice = activosMap[p.ticker].precio_actual ?? null;
        }
      });

      const { data: posRows, error: posErr } = await supabase
        .from('posiciones_actuales')
        .select('*')
        .eq('user_id', userId);
      if (posErr) throw posErr;

      const { data: summaryRow, error: summaryErr } = await supabase
        .from('resumen_cartera_actual')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (summaryErr) throw summaryErr;

      const { data: snapshotRows, error: snapshotsErr } = await supabase
        .from('snapshots_cartera')
        .select('id, user_id, fecha_snapshot, valor_total, liquidez, coste_total, pnl_total, rentabilidad_total, observaciones')
        .eq('user_id', userId)
        .order('fecha_snapshot', { ascending: true });
      if (snapshotsErr) throw snapshotsErr;

      mapped.sort((a, b) => a.date.localeCompare(b.date));

      const liqRow = activosMap['LIQUIDEZ'];
      setLiquidity(summaryRow?.liquidez ?? (liqRow ? liqRow.cantidad_total : 0));
      setActivos((acts || []).filter((a: any) => a.ticker !== 'LIQUIDEZ'));
      setPositions((posRows || []) as PositionRow[]);
      setSummary((summaryRow || null) as PortfolioSummaryRow | null);
      setSnapshots((snapshotRows || []) as PortfolioSnapshotRow[]);
      setPurchases(mapped);
    } catch (err: any) {
      console.error('Error fetching portfolio:', err);
      setError(err?.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { purchases, liquidity, activos, positions, summary, snapshots, loading, error, refetch: fetchData };
}
