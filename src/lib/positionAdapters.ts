import type { Holding } from '@/lib/calculations';
import { getInstrumentMeta } from '@/lib/portfolioMetadata';
import type { PositionRow, PortfolioSummaryRow, Purchase } from '@/types/portfolio';

function computeRealizedPnlByTicker(purchases: Purchase[]): Record<string, number> {
  const positions: Record<string, { qty: number; cost: number }> = {};
  const realized: Record<string, number> = {};

  const sorted = [...purchases]
    .filter(p => p.operation !== 'Liquidez')
    .sort((a, b) => a.date.localeCompare(b.date));

  for (const p of sorted) {
    if (!positions[p.ticker]) positions[p.ticker] = { qty: 0, cost: 0 };
    if (!realized[p.ticker]) realized[p.ticker] = 0;

    const pos = positions[p.ticker];

    if (p.operation === 'Compra') {
      pos.qty += p.quantity;
      pos.cost += p.quantity * p.price;
    } else if (p.operation === 'Venta' && pos.qty > 0) {
      const avgCost = pos.cost / pos.qty;
      const matchedQty = Math.min(p.quantity, pos.qty);
      const costBasis = avgCost * matchedQty;
      const saleProceeds = matchedQty * p.price - p.commission;
      realized[p.ticker] += saleProceeds - costBasis;
      pos.qty -= matchedQty;
      pos.cost -= avgCost * matchedQty;
    }
  }

  return realized;
}

/**
 * Convierte posiciones de Supabase a Holding[].
 * @param positions  Filas de la vista posiciones_actuales
 * @param purchases  Historial de movimientos (para PnL realizado)
 * @param pesosObjetivo  Mapa ticker→peso% desde Supabase (usePesosObjetivo)
 */
export function mapPositionsToHoldings(
  positions: PositionRow[],
  purchases?: Purchase[],
  pesosObjetivo?: Record<string, number>
): Holding[] {
  const realizedByTicker = purchases ? computeRealizedPnlByTicker(purchases) : {};

  return positions.map((p) => {
    const meta = getInstrumentMeta(p.ticker);
    const unrealizedPnl = Number(p.pnl_no_realizado || 0);
    const realizedPnl = realizedByTicker[p.ticker] ?? 0;
    const comisiones = Number(p.comisiones_totales || 0);

    // Peso objetivo: primero desde Supabase, fallback a metadata (0)
    const targetPct = pesosObjetivo
      ? (pesosObjetivo[p.ticker] ?? 0)
      : meta.targetPct;

    return {
      ticker: p.ticker,
      name: p.nombre || meta.name,
      type: p.tipo_activo || meta.category,
      quantity: Number(p.cantidad_actual || 0),
      totalCost: Number(p.coste_total_estimado || 0),
      avgPrice: Number(p.precio_compra_avg || 0),
      totalCommissions: comisiones,
      nOps: Number((p.n_compras || 0) + (p.n_ventas || 0)),
      nBuys: Number(p.n_compras || 0),
      nSells: Number(p.n_ventas || 0),
      totalBought: Number(p.capital_comprado_bruto || 0),
      totalSold: Number(p.capital_vendido_bruto || 0),
      soldQuantity: 0,
      currentPrice: Number(p.precio_actual || 0),
      currentValue: Number(p.valor_actual || 0),
      unrealizedPnl,
      realizedPnl,
      totalPnl: unrealizedPnl + realizedPnl - comisiones,
      currentWeight: 0,
      targetWeight: targetPct / 100,
    };
  });
}

export function getSafeSummary(summary: PortfolioSummaryRow | null, fallbackLiquidity = 0) {
  return {
    costeTotal: Number(summary?.coste_total || 0),
    valorInvertido: Number(summary?.valor_invertido || 0),
    liquidez: Number(summary?.liquidez ?? fallbackLiquidity ?? 0),
    valorTotal: Number(summary?.valor_total || 0),
    pnlNoRealizado: Number(summary?.pnl_no_realizado || 0),
    capitalNetoAportado: Number(summary?.capital_neto_aportado || 0),
    pnlTotal: Number(summary?.pnl_total_estimado || 0),
    rentabilidadTotal: Number(summary?.rentabilidad_total_estimada || 0),
    comisionesTotales: Number(summary?.comisiones_totales || 0),
  };
}
