import { useMemo, useState } from 'react';
import KpiCard from '@/components/KpiCard';
import type { PortfolioAssetRow, PortfolioSnapshotRow, PortfolioSummaryRow, Purchase } from '@/types/portfolio';
import { fmt, fmtPct, fmtNum } from '@/lib/calculations';
import { getInstrumentMeta } from '@/lib/portfolioMetadata';
import { TrendingUp, Activity, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';

interface Props {
  purchases: Purchase[];
  liquidity: number;
  activos: PortfolioAssetRow[];
  summary: PortfolioSummaryRow | null;
  snapshots: PortfolioSnapshotRow[];
}

interface YearSliceMetrics {
  invested: number;
  realized: number;
  currentValue: number;
}

function buildCurrentPriceMap(activos: PortfolioAssetRow[], purchases: Purchase[]) {
  const map = new Map<string, number>();

  activos.forEach((asset) => {
    if (asset.ticker !== 'LIQUIDEZ') map.set(asset.ticker, asset.precio_actual ?? asset.precio_compra_avg ?? 0);
  });

  purchases.forEach((purchase) => {
    if (!map.has(purchase.ticker) && purchase.currentPrice != null) map.set(purchase.ticker, purchase.currentPrice);
  });

  return map;
}

function calculateYearSliceMetrics(operations: Purchase[], priceMap: Map<string, number>): YearSliceMetrics {
  const sortedOps = [...operations].sort((a, b) => a.date.localeCompare(b.date));
  const positions = new Map<string, { quantity: number; invested: number }>();

  let invested = 0;
  let realized = 0;

  sortedOps.forEach((op) => {
    const gross = op.quantity * op.price;
    const position = positions.get(op.ticker) ?? { quantity: 0, invested: 0 };

    if (op.operation === 'Compra') {
      position.quantity += op.quantity;
      position.invested += gross + op.commission;
      invested += gross + op.commission;
      positions.set(op.ticker, position);
      return;
    }

    if (op.operation !== 'Venta' || position.quantity <= 0) return;

    const matchedQty = Math.min(op.quantity, position.quantity);
    if (matchedQty <= 0) return;

    const ratio = matchedQty / op.quantity;
    const attributedCommission = op.commission * ratio;
    const avgCostPerUnit = position.quantity > 0 ? position.invested / position.quantity : 0;

    position.quantity -= matchedQty;
    position.invested -= avgCostPerUnit * matchedQty;
    realized += (matchedQty * op.price) - attributedCommission;

    if (position.quantity <= 1e-9 || position.invested <= 1e-9) positions.delete(op.ticker);
    else positions.set(op.ticker, position);
  });

  let currentValue = 0;

  positions.forEach((position, ticker) => {
    const currentPrice = priceMap.get(ticker) ?? 0;
    currentValue += position.quantity * currentPrice;
  });

  return { invested, realized, currentValue };
}

function getYear(value: string) {
  return value.slice(0, 4);
}

function buildYearEndSnapshotMap(snapshots: PortfolioSnapshotRow[]) {
  const map = new Map<string, PortfolioSnapshotRow>();

  [...snapshots]
    .sort((a, b) => a.fecha_snapshot.localeCompare(b.fecha_snapshot))
    .forEach((snapshot) => {
      map.set(getYear(snapshot.fecha_snapshot), snapshot);
    });

  return map;
}

function computeAnnualReturn(startValue: number, endValue: number, netExternalFlow: number) {
  const base = startValue + Math.max(netExternalFlow, 0);
  if (base <= 0) return 0;
  return (endValue - startValue - netExternalFlow) / base;
}

const RendimientoTab = ({ purchases, liquidity, activos, summary, snapshots: rawSnapshots }: Props) => {
  const snapshots = rawSnapshots ?? [];
  const safeActivos = activos ?? [];
  const safePurchases = purchases ?? [];
  const ops = safePurchases.filter((p) => p.operation !== 'Liquidez');
  const liquidityOps = safePurchases.filter((p) => p.operation === 'Liquidez');
  const snapshotByYear = useMemo(() => buildYearEndSnapshotMap(snapshots), [snapshots]);

  const years = [
    'Todos',
    ...new Set([
      ...safePurchases.map((p) => getYear(p.date || '')).filter(Boolean),
      ...snapshots.map((snapshot) => getYear(snapshot.fecha_snapshot || '')).filter(Boolean),
    ]),
  ].sort((a, b) => (a === 'Todos' ? -1 : b === 'Todos' ? 1 : b.localeCompare(a)));

  const [yearFilter, setYearFilter] = useState('Todos');

  const filtered = yearFilter === 'Todos' ? ops : ops.filter((p) => p.date.startsWith(yearFilter));
  const filteredLiquidity = yearFilter === 'Todos' ? liquidityOps : liquidityOps.filter((p) => p.date.startsWith(yearFilter));
  const buys = filtered.filter((p) => p.operation === 'Compra');
  const sells = filtered.filter((p) => p.operation === 'Venta');

  const totalBought = buys.reduce((s, p) => s + p.quantity * p.price, 0);
  const totalSold = sells.reduce((s, p) => s + p.quantity * p.price, 0);
  const totalCom = filtered.reduce((s, p) => s + p.commission, 0);
  const realizedFlow = totalSold - totalCom;
  const closedTrades = sells.length;

  const investedValue = safeActivos
    .filter((a) => a.ticker !== 'LIQUIDEZ')
    .reduce((sum, a) => sum + (a.cantidad_total ?? 0) * (a.precio_actual ?? a.precio_compra_avg ?? 0), 0);

  const totalCurrentValue = Number(summary?.valor_total ?? (investedValue + liquidity));
  const netContributedCapital = Number(summary?.capital_neto_aportado ?? liquidityOps.reduce((sum, op) => sum + op.price, 0));
  const portfolioReturn = Number(
    summary?.rentabilidad_total_estimada ??
      (netContributedCapital > 0 ? (totalCurrentValue - netContributedCapital) / netContributedCapital : 0)
  );

  const priceMap = useMemo(() => buildCurrentPriceMap(safeActivos, safePurchases), [safeActivos, safePurchases]);

  const yearSliceMetrics = useMemo(() => {
    if (yearFilter === 'Todos') return null;
    return calculateYearSliceMetrics(filtered, buildCurrentPriceMap(safeActivos, safePurchases));
  }, [safeActivos, filtered, safePurchases, yearFilter]);

  const selectedSnapshot = yearFilter === 'Todos' ? null : snapshotByYear.get(yearFilter) ?? null;
  const previousSnapshot = yearFilter === 'Todos'
    ? null
    : snapshotByYear.get(String(Number(yearFilter) - 1)) ?? null;
  const selectedNetLiquidity = filteredLiquidity.reduce((sum, op) => sum + op.price, 0);
  const selectedInflow = filteredLiquidity.filter((op) => op.price > 0).reduce((sum, op) => sum + op.price, 0);
  const selectedOutflow = filteredLiquidity.filter((op) => op.price < 0).reduce((sum, op) => sum + Math.abs(op.price), 0);

  const snapshotReturn = selectedSnapshot
    ? computeAnnualReturn(previousSnapshot?.valor_total ?? 0, selectedSnapshot.valor_total, selectedNetLiquidity)
    : null;

  const yearlyEstimatedValue = (yearSliceMetrics?.realized ?? 0) + (yearSliceMetrics?.currentValue ?? 0);
  const estimatedReturn =
    yearSliceMetrics && yearSliceMetrics.invested > 0
      ? (yearlyEstimatedValue - yearSliceMetrics.invested) / yearSliceMetrics.invested
      : 0;

  const returnTitle = yearFilter === 'Todos' ? 'Rendimiento Global' : selectedSnapshot ? `Cierre ${yearFilter}` : `Rend. estimado ${yearFilter}`;
  const returnValue = yearFilter === 'Todos' ? portfolioReturn : selectedSnapshot ? (snapshotReturn ?? 0) : estimatedReturn;
  const returnSubtitle =
    yearFilter === 'Todos'
      ? `Valor actual ${fmt(totalCurrentValue)} vs capital neto aportado ${fmt(netContributedCapital)}`
      : selectedSnapshot
        ? `Snapshot ${selectedSnapshot.fecha_snapshot}: cartera ${fmt(selectedSnapshot.valor_total)} · flujo externo ${fmt(selectedNetLiquidity)}`
        : `Sin snapshot de cierre en ${yearFilter}. Esta cifra depende de precios actuales.`;

  const yearSummary = years
    .filter((year) => year !== 'Todos')
    .slice()
    .sort()
    .map((yr) => {
      const yOps = ops.filter((p) => p.date.startsWith(yr));
      const yLiquidity = liquidityOps.filter((p) => p.date.startsWith(yr));
      const yBuys = yOps.filter((p) => p.operation === 'Compra');
      const ySells = yOps.filter((p) => p.operation === 'Venta');
      const yBought = yBuys.reduce((s, p) => s + p.quantity * p.price, 0);
      const ySold = ySells.reduce((s, p) => s + p.quantity * p.price, 0);
      const yCom = yOps.reduce((s, p) => s + p.commission, 0);
      const yInflow = yLiquidity.filter((p) => p.price > 0).reduce((sum, p) => sum + p.price, 0);
      const yOutflow = yLiquidity.filter((p) => p.price < 0).reduce((sum, p) => sum + Math.abs(p.price), 0);
      const yNetFlow = yLiquidity.reduce((sum, p) => sum + p.price, 0);
      const ySnapshot = snapshotByYear.get(yr) ?? null;
      const yPrevSnapshot = snapshotByYear.get(String(Number(yr) - 1)) ?? null;
      const ySlice = calculateYearSliceMetrics(yOps, buildCurrentPriceMap(safeActivos, safePurchases));
      const yEstimatedValue = ySlice.realized + ySlice.currentValue;
      const yEstimatedReturn = ySlice.invested > 0 ? (yEstimatedValue - ySlice.invested) / ySlice.invested : 0;

      return {
        year: yr,
        ops: yOps.length,
        buys: yBuys.length,
        sells: ySells.length,
        capitalComprado: yBought,
        capitalVendido: ySold,
        entradaLiquidez: yInflow,
        salidaLiquidez: yOutflow,
        com: yCom,
        cierre: ySnapshot?.valor_total ?? null,
        rendimiento: ySnapshot
          ? computeAnnualReturn(yPrevSnapshot?.valor_total ?? 0, ySnapshot.valor_total, yNetFlow)
          : yEstimatedReturn,
        source: ySnapshot ? `Snapshot ${ySnapshot.fecha_snapshot}` : 'Estimado con precios actuales',
      };
    });

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex gap-1.5 flex-wrap items-center px-4 py-3 bg-muted/30 border-b border-border">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mr-2">Filtrar año:</span>
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setYearFilter(y)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                y === yearFilter
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-transparent text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <KpiCard
          title={yearFilter === 'Todos' ? 'Capital Comprado' : `Comprado ${yearFilter}`}
          value={fmt(totalBought)}
          icon={TrendingUp}
          color="primary"
          subtitle="Suma bruta de compras del periodo"
        />
        <KpiCard
          title="Capital Vendido"
          value={fmt(totalSold)}
          icon={Activity}
          color="primary"
          subtitle={`Ventas ejecutadas: ${sells.length}`}
        />
        <KpiCard
          title={yearFilter === 'Todos' ? 'Liquidez Neta' : `Liquidez neta ${yearFilter}`}
          value={`${selectedNetLiquidity >= 0 ? '+' : '-'}${fmt(Math.abs(yearFilter === 'Todos' ? liquidityOps.reduce((sum, op) => sum + op.price, 0) : selectedNetLiquidity))}`}
          icon={DollarSign}
          color={(yearFilter === 'Todos' ? liquidityOps.reduce((sum, op) => sum + op.price, 0) : selectedNetLiquidity) >= 0 ? 'emerald' : 'ruby'}
          subtitle="Solo movimientos externos de liquidez"
        />
        <KpiCard
          title="Total Comisiones"
          value={fmt(totalCom)}
          icon={AlertTriangle}
          color="amber"
          subtitle={`${fmtPct(totalBought > 0 ? totalCom / totalBought : 0)} sobre compras`}
        />
        <KpiCard
          title="Operaciones Cerradas"
          value={closedTrades.toString()}
          icon={CheckCircle}
          color="primary"
          subtitle="Número de ventas del periodo"
        />
        <KpiCard
          title={returnTitle}
          value={`${returnValue >= 0 ? '+' : ''}${fmtPct(returnValue)}`}
          icon={TrendingUp}
          color={returnValue >= 0 ? 'emerald' : 'ruby'}
          subtitle={returnSubtitle}
        />
      </div>

      {yearFilter !== 'Todos' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <KpiCard
            title={`Entrada liquidez ${yearFilter}`}
            value={fmt(selectedInflow)}
            icon={DollarSign}
            color="primary"
            subtitle="Ingresos externos registrados como liquidez"
          />
          <KpiCard
            title={`Salida liquidez ${yearFilter}`}
            value={fmt(selectedOutflow)}
            icon={Activity}
            color="ruby"
            subtitle="Retiradas externas registradas como liquidez"
          />
          <KpiCard
            title={`Invertido ${yearFilter}`}
            value={fmt((yearSliceMetrics?.invested ?? 0))}
            icon={TrendingUp}
            color="primary"
            subtitle="Compras del año + comisiones"
          />
          <KpiCard
            title={selectedSnapshot ? `Cartera cierre ${yearFilter}` : `Valor estimado ${yearFilter}`}
            value={fmt(selectedSnapshot?.valor_total ?? yearlyEstimatedValue)}
            icon={TrendingUp}
            color="emerald"
            subtitle={selectedSnapshot ? `Dato real de ${selectedSnapshot.fecha_snapshot}` : 'Sin snapshot: depende de precios actuales'}
          />
        </div>
      )}

      {yearSummary.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actividad por Año</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border">
                  {['Año', 'Operaciones', 'Compras', 'Ventas', 'Entrada liq.', 'Salida liq.', 'Capital comprado', 'Capital vendido', 'Comisiones', 'Cierre anual', 'Rent. año', 'Fuente'].map((h) => (
                    <th
                      key={h}
                      className={`px-3 py-2.5 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold ${h !== 'Año' && h !== 'Fuente' ? 'text-right' : 'text-left'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {yearSummary.map((y) => (
                  <tr key={y.year} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-3 py-2.5 font-bold font-mono">{y.year}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{y.ops}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{y.buys}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{y.sells}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-emerald">{fmt(y.entradaLiquidez)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-ruby">{fmt(y.salidaLiquidez)}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{fmt(y.capitalComprado)}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{fmt(y.capitalVendido)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-ruby">{fmt(y.com)}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{y.cierre != null ? fmt(y.cierre) : '—'}</td>
                    <td className={`px-3 py-2.5 text-right font-mono font-semibold ${y.rendimiento >= 0 ? 'text-emerald' : 'text-ruby'}`}>
                      {y.rendimiento >= 0 ? '+' : ''}{fmtPct(y.rendimiento)}
                    </td>
                    <td className="px-3 py-2.5 text-[10px] text-muted-foreground">{y.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Historial de Operaciones{yearFilter !== 'Todos' ? ` — ${yearFilter}` : ''}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-border">
                {['#', 'Fecha', 'Instrumento', 'Categoría', 'Operación', 'Cantidad', 'Precio', 'Total', 'Comisión', 'Beneficio', 'Estado'].map((h) => (
                  <th
                    key={h}
                    className={`px-3 py-2.5 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap ${
                      ['Cantidad', 'Precio', 'Total', 'Comisión', 'Beneficio'].includes(h) ? 'text-right' : 'text-left'
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                const meta = getInstrumentMeta(p.ticker);
                const curPrice = priceMap.get(p.ticker) ?? 0;
                let benefit: number | null = null;
                if (p.operation === 'Compra' && curPrice > 0) {
                  benefit = (curPrice - p.price) * p.quantity - p.commission;
                } else if (p.operation === 'Venta') {
                  benefit = p.quantity * p.price - p.commission;
                }
                return (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-3 py-2.5 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2.5 font-mono">{p.date}</td>
                    <td className="px-3 py-2.5 font-semibold">
                      <div>{meta.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{p.ticker}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-blue-500/15 text-blue-400">{meta.category}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${p.operation === 'Compra' ? 'bg-emerald/15 text-emerald' : 'bg-ruby/15 text-ruby'}`}>
                        {p.operation}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono">{fmtNum(p.quantity)}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{fmt(p.price)}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-semibold">{fmt(p.quantity * p.price)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{fmt(p.commission)}</td>
                    <td className={`px-3 py-2.5 text-right font-mono font-semibold ${benefit !== null && benefit >= 0 ? 'text-emerald' : 'text-ruby'}`}>
                      {benefit !== null ? `${benefit >= 0 ? '+' : ''}${fmt(benefit)}` : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.operation === 'Venta' ? 'bg-emerald/15 text-emerald' : 'bg-blue-500/12 text-blue-400'}`}>
                        {p.operation === 'Venta' ? 'CERRADA' : 'ABIERTA'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RendimientoTab;
