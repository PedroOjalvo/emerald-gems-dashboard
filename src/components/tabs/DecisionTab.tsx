import type { PortfolioSummaryRow, PositionRow, Purchase } from '@/types/portfolio';
import { useParams } from '@/contexts/ParamsContext';
import { fmt, fmtPct, fmtNum } from '@/lib/calculations';
import { getInstrumentMeta } from '@/lib/portfolioMetadata';
import { getSafeSummary, mapPositionsToHoldings } from '@/lib/positionAdapters';

interface Props { purchases: Purchase[]; liquidity: number; positions: PositionRow[]; summary: PortfolioSummaryRow | null; }

const DecisionTab = ({ purchases, liquidity, positions, summary }: Props) => {
  const { params } = useParams();
  const holdings = mapPositionsToHoldings(positions, purchases).filter(h => h.quantity > 0);
  const safeSummary = getSafeSummary(summary, liquidity);
  const investedValue = safeSummary.valorInvertido;
  const totalPortfolioValue = safeSummary.valorTotal;
  const budget = params.monthlyDCA;

  const now = new Date();
  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const monthName = monthNames[now.getMonth()];
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const monthOps = purchases.filter(p => p.date.startsWith(currentMonthKey));
  const monthLiquidityOps = monthOps.filter(p => p.operation === 'Liquidez');
  const monthBuyOps = monthOps.filter(p => p.operation === 'Compra');
  const hasFundingThisMonth = monthLiquidityOps.length > 0;
  const monthFunding = monthLiquidityOps.reduce((s, p) => s + p.price, 0);
  const monthBought = monthBuyOps.reduce((s, p) => s + p.quantity * p.price, 0);
  const monthCommissions = monthBuyOps.reduce((s, p) => s + p.commission, 0);
  const monthInvested = monthBought + monthCommissions;
  const planningBudget = hasFundingThisMonth ? Math.max(0, monthFunding) : budget;
  const allocatableNow = hasFundingThisMonth
    ? Math.max(0, monthFunding - monthInvested)
    : Math.max(0, budget - monthInvested);
  const recommendationActive = allocatableNow > 0;

  const monthBoughtByTicker = monthBuyOps.reduce<Record<string, number>>((acc, p) => {
    acc[p.ticker] = (acc[p.ticker] || 0) + p.quantity * p.price;
    return acc;
  }, {});

  const rawRows = holdings.map((h) => {
    const meta = getInstrumentMeta(h.ticker);
    const actual = investedValue > 0 ? h.currentValue / investedValue : 0;
    const target = meta.targetPct / 100;
    const descuadre = (target - actual) * investedValue;
    const monthTarget = planningBudget * target;
    const boughtThisMonth = monthBoughtByTicker[h.ticker] || 0;
    const pendingBase = Math.max(0, monthTarget - boughtThisMonth);
    const tagTxt = descuadre > 150 ? 'Muy infraponderado' : descuadre > 50 ? 'Infraponderado' : descuadre < -150 ? 'Muy sobreponderado' : descuadre < -50 ? 'Sobreponderado' : 'En rango';
    const tagClass = descuadre > 50 ? 'bg-ruby/15 text-ruby' : descuadre < -50 ? 'bg-primary/15 text-primary' : 'bg-emerald/15 text-emerald';

    return { h, meta, actual, target, descuadre, monthTarget, boughtThisMonth, pendingBase, tagTxt, tagClass };
  });

  const totalPendingBase = rawRows.reduce((s, r) => s + r.pendingBase, 0);

  const rows = rawRows
    .map((r) => {
      const suggested = recommendationActive
        ? totalPendingBase > 0
          ? allocatableNow * (r.pendingBase / totalPendingBase)
          : allocatableNow * r.target
        : 0;
      const participaciones = r.h.avgPrice > 0 ? suggested / r.h.avgPrice : 0;
      return { ...r, suggested, participaciones };
    })
    .sort((a, b) => (b.suggested - a.suggested) || (b.descuadre - a.descuadre));

  const totalSuggested = rows.reduce((s, r) => s + r.suggested, 0);
  const isMonthFullyAllocated = hasFundingThisMonth ? monthFunding > 0 && allocatableNow === 0 : monthInvested >= budget;
  const investedBaseLabel = investedValue > 0 ? fmt(investedValue) : '0,00 €';

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-card to-card border border-primary/20 p-6 flex flex-wrap items-center justify-between gap-5">
        <div>
          <h2 className="text-xl font-extrabold mb-1">Decisión de {monthName} {now.getFullYear()}</h2>
          <p className="text-xs text-muted-foreground max-w-lg leading-relaxed">
            {hasFundingThisMonth
              ? `Aportado en ${monthName}: ${fmt(monthFunding)} · invertido: ${fmt(monthInvested)}. ${recommendationActive ? `Quedan ${fmt(allocatableNow)} por asignar.` : 'La aportación del mes ya está reflejada en la propuesta.'}`
              : `Sin movimiento de liquidez registrado en ${monthName}. La tabla usa tu DCA configurado (${fmt(budget)}) y descuenta lo ya comprado este mes.`}
          </p>
        </div>
        <div className="flex gap-4 flex-wrap">
          <div className="bg-card border border-border rounded-xl p-4 text-center min-w-[120px]">
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Presupuesto DCA</div>
            <div className="text-lg font-extrabold font-mono text-emerald">{fmt(budget)}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center min-w-[120px]">
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Aportado en {monthName}</div>
            <div className={`text-lg font-extrabold font-mono ${monthFunding > 0 ? 'text-primary' : 'text-muted-foreground'}`}>{fmt(monthFunding)}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center min-w-[120px]">
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Invertido en {monthName}</div>
            <div className={`text-lg font-extrabold font-mono ${monthInvested > 0 ? 'text-emerald' : 'text-muted-foreground'}`}>{fmt(monthInvested)}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center min-w-[120px]">
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Disponible ahora</div>
            <div className={`text-lg font-extrabold font-mono ${recommendationActive ? 'text-amber' : 'text-emerald'}`}>{recommendationActive ? fmt(allocatableNow) : '✓ Asignado'}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center min-w-[120px]">
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Liquidez total</div>
            <div className="text-lg font-extrabold font-mono text-muted-foreground">{fmt(safeSummary.liquidez)}</div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Asignación sugerida, {monthName} {now.getFullYear()}</h3>
          <p className="mt-1 text-[11px] text-muted-foreground">Base de pesos actual: capital invertido {investedBaseLabel}, liquidez aparte {fmt(safeSummary.liquidez)}.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead><tr className="border-b border-border">
              {['#','Instrumento','Estado','% Obj.','% Actual','Comprado mes','Objetivo mes','Descuadre €','Sugerido ahora','Coste medio','Particip. aprox.'].map(h => (
                <th key={h} className={`px-3 py-2.5 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap ${!['#','Instrumento','Estado'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {rows.map((r, index) => {
                const urgClr = r.descuadre > 50 ? 'text-ruby' : r.descuadre < -50 ? 'text-primary' : 'text-emerald';
                return (
                  <tr key={r.h.ticker} className={`border-b border-border/50 hover:bg-muted/30 ${index === 0 && r.suggested > 0 ? 'bg-emerald/[0.03]' : ''}`}>
                    <td className={`px-3 py-2.5 font-mono font-bold ${index < 3 ? 'text-emerald' : ''}`}>{index + 1}</td>
                    <td className="px-3 py-2.5 font-semibold">
                      <div>{r.meta.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{r.h.ticker}</div>
                    </td>
                    <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${r.tagClass}`}>{r.tagTxt}</span></td>
                    <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{fmtPct(r.target)}</td>
                    <td className={`px-3 py-2.5 text-right font-mono ${r.actual > r.target ? 'text-emerald' : 'text-ruby'}`}>{fmtPct(r.actual)}</td>
                    <td className={`px-3 py-2.5 text-right font-mono ${r.boughtThisMonth > 0 ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>{r.boughtThisMonth > 0 ? fmt(r.boughtThisMonth) : '—'}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{fmt(r.monthTarget)}</td>
                    <td className={`px-3 py-2.5 text-right font-mono font-semibold ${urgClr}`}>{r.descuadre >= 0 ? '+' : ''}{fmt(r.descuadre)}</td>
                    <td className={`px-3 py-2.5 text-right font-mono font-extrabold ${r.suggested > 0 ? 'text-emerald text-sm' : 'text-muted-foreground'}`}>{r.suggested > 0 ? fmt(r.suggested) : '—'}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{fmtNum(r.h.avgPrice)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{fmtNum(r.participaciones)}</td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-border bg-muted/30">
                <td colSpan={5} className="px-3 py-3 font-bold text-xs">RESUMEN MES</td>
                <td className="px-3 py-3 text-right font-mono font-bold">{fmt(monthBought)}</td>
                <td className="px-3 py-3 text-right font-mono font-bold">{fmt(planningBudget)}</td>
                <td className="px-3 py-3 text-right font-mono text-muted-foreground">—</td>
                <td className="px-3 py-3 text-right font-mono font-extrabold text-emerald text-[15px]">{fmt(totalSuggested)}</td>
                <td colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DecisionTab;
