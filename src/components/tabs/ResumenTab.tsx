import { PieChart as RPieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import KpiCard from '@/components/KpiCard';
import type { PortfolioSummaryRow, PositionRow, Purchase } from '@/types/portfolio';
import { useParams } from '@/contexts/ParamsContext';
import { portfolioBeta, portfolioVolatility, portfolioCAPM, projectValue, fmt, fmtPct } from '@/lib/calculations';
import { CATEGORY_COLORS, getInstrumentMeta } from '@/lib/portfolioMetadata';
import { getSafeSummary, mapPositionsToHoldings } from '@/lib/positionAdapters';
import { DollarSign, TrendingUp, Activity, Shield, BarChart3, Target, Wallet } from 'lucide-react';

interface Props { purchases: Purchase[]; liquidity: number; positions: PositionRow[]; summary: PortfolioSummaryRow | null; }

const TOOLTIP_STYLE = { background: 'hsl(220 30% 7%)', border: '1px solid hsl(215 25% 18%)', borderRadius: '8px', color: 'hsl(210 20% 90%)' } as const;
const TOOLTIP_LABEL = { color: 'hsl(210 20% 90%)' };
const TOOLTIP_ITEM = { color: 'hsl(210 20% 90%)' };
const PAL = ['#10d9a0','#4d8fff','#f5a623','#f0466b','#a78bff','#00d4d8','#4ade80','#38bdf8','#fb923c','#f472b6','#34d399','#60a5fa'];

const ResumenTab = ({ purchases, liquidity, positions, summary }: Props) => {
  const { params } = useParams();
  const holdings = mapPositionsToHoldings(positions).filter(h => h.quantity > 0);
  const safeSummary = getSafeSummary(summary, liquidity);
  const currentPortfolioValue = safeSummary.valorInvertido;
  const totalCapital = safeSummary.valorTotal;
  const totalCommissions = safeSummary.comisionesTotales;
  const totalPnl = safeSummary.pnlTotal;
  const unrealizedPnl = safeSummary.pnlNoRealizado;
  const realizedPnl = totalPnl - unrealizedPnl;
  const rendActual = safeSummary.rentabilidadTotal;
  const nOps = purchases.filter(p => p.operation !== 'Liquidez').length;

  const pB = portfolioBeta(holdings, params);
  const pVol = portfolioVolatility(holdings, params);
  const pC = portfolioCAPM(holdings, params);
  const pSh = pVol > 0 ? (pC - params.rfRate) / pVol : 0;
  const rendN = rendActual - params.inflation;
  const vf = projectValue(totalCapital, params.monthlyDCA, params.base, params.horizon);

  const pieData = holdings.map(h => ({
    name: getInstrumentMeta(h.ticker).name,
    value: h.currentValue,
    ticker: h.ticker,
  }));
  if (safeSummary.liquidez > 0) pieData.push({ name: 'Liquidez', value: safeSummary.liquidez, ticker: 'LIQUIDEZ' });

  const byType: Record<string, number> = {};
  holdings.forEach(h => {
    const meta = getInstrumentMeta(h.ticker);
    byType[meta.category] = (byType[meta.category] || 0) + h.currentValue;
  });
  if (safeSummary.liquidez > 0) byType.Liquidez = safeSummary.liquidez;
  const typeData = Object.entries(byType).map(([name, value]) => ({ name, value }));

  const sortedByPnl = [...holdings].sort((a, b) => b.totalPnl - a.totalPnl);
  const top5 = sortedByPnl.slice(0, 5);
  const bot5 = [...sortedByPnl].sort((a, b) => a.totalPnl - b.totalPnl).slice(0, 5);

  const monthly: Record<string, { aportado: number; comisiones: number }> = {};
  purchases.forEach(p => {
    const k = p.date.slice(0, 7);
    if (!monthly[k]) monthly[k] = { aportado: 0, comisiones: 0 };
    if (p.operation === 'Compra') {
      monthly[k].aportado += p.quantity * p.price;
      monthly[k].comisiones += p.commission;
    } else if (p.operation === 'Liquidez') {
      monthly[k].aportado += p.price;
    }
  });
  const evolData = Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b)).map(([month, values]) => ({
    month,
    aportado: values.aportado,
    costeNeto: values.aportado + values.comisiones,
  }));

  const rebalData = holdings.map(h => {
    const actual = totalCapital > 0 ? h.currentValue / totalCapital : 0;
    return {
      ticker: h.ticker,
      name: h.name,
      actual,
      target: h.targetWeight,
      diff: (h.targetWeight - actual) * totalCapital,
    };
  }).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        <KpiCard title="Valor Actual Cartera" value={fmt(totalCapital)} icon={DollarSign} color="emerald" subtitle={`${fmt(currentPortfolioValue)} invertidos + ${fmt(safeSummary.liquidez)} liquidez`} />
        <KpiCard title="Rentabilidad Acumulada" value={`${rendActual >= 0 ? '+' : ''}${fmtPct(rendActual)}`} icon={TrendingUp} color={rendActual >= 0 ? 'emerald' : 'ruby'} subtitle={`Capital neto aportado: ${fmt(safeSummary.capitalNetoAportado || 0)}`} />
        <KpiCard title="Beneficio / Pérdida" value={`${totalPnl >= 0 ? '+' : ''}${fmt(totalPnl)}`} icon={Activity} color={totalPnl >= 0 ? 'emerald' : 'ruby'} subtitle={`Realizado ${fmt(realizedPnl)} · No realizado ${fmt(unrealizedPnl)}`} />
        <KpiCard title="Volatilidad Cartera" value={fmtPct(pVol)} icon={BarChart3} color="primary" subtitle="Estimación por beta agregada" />
        <KpiCard title="Beta Cartera" value={pB.toFixed(2)} icon={Shield} color="primary" subtitle={`E[R] CAPM: ${fmtPct(pC)}`} />
        <KpiCard title="Sharpe Ratio" value={pSh.toFixed(2)} icon={Target} color="amber" subtitle={`σ=${fmtPct(pVol)} · Rf=${fmtPct(params.rfRate)}`} />
        <KpiCard title={`Capital en ${params.horizon}a`} value={fmt(vf)} icon={Wallet} color="primary" subtitle={`DCA ${fmt(params.monthlyDCA)}/mes · ${fmtPct(params.base, 0)}/año`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Peso por Activo</h3>
          <ResponsiveContainer width="100%" height={250}>
            <RPieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" stroke="hsl(220 30% 5%)" strokeWidth={3}>
                {pieData.map((_, i) => <Cell key={i} fill={PAL[i % PAL.length]} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL} itemStyle={TOOLTIP_ITEM} formatter={(v: number) => fmt(v)} />
            </RPieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {pieData.map((d, i) => (
              <span key={d.ticker} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ background: PAL[i % PAL.length] }} />{d.ticker}
              </span>
            ))}
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Composición por Categoría</h3>
          <ResponsiveContainer width="100%" height={250}>
            <RPieChart>
              <Pie data={typeData} cx="50%" cy="50%" innerRadius={55} outerRadius={100} dataKey="value" stroke="hsl(220 30% 5%)" strokeWidth={3}>
                {typeData.map((entry) => <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name as keyof typeof CATEGORY_COLORS] || '#6b7280'} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL} itemStyle={TOOLTIP_ITEM} formatter={(v: number) => fmt(v)} />
            </RPieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Mapa de Posiciones</h3>
        <div className="flex flex-wrap gap-2">
          {holdings.map((h) => {
            const size = Math.max(72, Math.min(170, (h.currentValue / (currentPortfolioValue || 1)) * 1200));
            const positive = h.totalPnl >= 0;
            return (
              <div key={h.ticker} className="rounded-xl flex flex-col items-center justify-center border overflow-hidden" style={{ width: size, height: size * 0.75, background: positive ? 'rgba(16,217,160,0.12)' : 'rgba(240,70,107,0.12)', borderColor: positive ? '#10d9a066' : '#f0466b66', padding: 4 }}>
                <span className="text-[9px] font-semibold text-muted-foreground text-center leading-tight truncate w-full px-1">{h.name}</span>
                <span className={`text-[10px] font-bold font-mono mt-0.5 truncate w-full text-center ${positive ? 'text-emerald' : 'text-ruby'}`}>{h.totalPnl >= 0 ? '+' : ''}{fmt(h.totalPnl)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Top 5 Rendimiento</h3>
          {top5.map((a, i) => (
            <div key={a.ticker} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
              <span className="w-5 h-5 rounded-full bg-card text-[10px] font-bold text-emerald flex items-center justify-center border border-border">{i + 1}</span>
              <span className="flex-1 text-xs text-muted-foreground">{a.name}</span>
              <span className="font-mono text-xs font-bold text-emerald">{a.totalPnl >= 0 ? '+' : ''}{fmt(a.totalPnl)}</span>
              <span className="text-[10px] text-muted-foreground">{fmtPct(a.totalCost > 0 ? a.totalPnl / a.totalCost : 0)}</span>
            </div>
          ))}
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Bottom 5 Rendimiento</h3>
          {bot5.map((a, i) => (
            <div key={a.ticker} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
              <span className="w-5 h-5 rounded-full bg-card text-[10px] font-bold text-ruby flex items-center justify-center border border-border">{i + 1}</span>
              <span className="flex-1 text-xs text-muted-foreground">{a.name}</span>
              <span className="font-mono text-xs font-bold text-ruby">{a.totalPnl >= 0 ? '+' : ''}{fmt(a.totalPnl)}</span>
              <span className="text-[10px] text-muted-foreground">{fmtPct(a.totalCost > 0 ? a.totalPnl / a.totalCost : 0)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Aportaciones Mensuales</h3>
        {(() => {
          const now = new Date();
          const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          const curMonth = monthly[curKey];
          const aportadoMes = curMonth ? curMonth.aportado : 0;
          const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
          const completado = aportadoMes >= params.monthlyDCA;
          return (
            <p className={`text-[11px] mb-4 ${completado ? 'text-emerald' : 'text-amber'}`}>
              {monthNames[now.getMonth()]} {now.getFullYear()}: aportado {fmt(aportadoMes)} de {fmt(params.monthlyDCA)} , {completado ? '✓ DCA completado' : `quedan ${fmt(params.monthlyDCA - aportadoMes)} pendientes`}
            </p>
          );
        })()}
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={evolData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 25% 18%)" />
            <XAxis dataKey="month" stroke="hsl(215 15% 55%)" tick={{ fontSize: 10 }} />
            <YAxis stroke="hsl(215 15% 55%)" tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL} itemStyle={TOOLTIP_ITEM} formatter={(v: number) => v.toFixed(2)} />
            <Bar dataKey="aportado" fill="rgba(77,143,255,0.45)" radius={[3, 3, 0, 0]} name="Aportado (€)" />
            <Line type="monotone" dataKey="costeNeto" stroke="#10d9a0" strokeWidth={2.5} dot={false} name="Coste neto acumulado" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Rebalanceo Recomendado</h3>
        <div className="space-y-2">
          {rebalData.map(r => (
            <div key={r.ticker} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
              <span className="flex-1 text-xs text-muted-foreground">{r.name}</span>
              <span className="text-[10px] font-mono text-muted-foreground">{fmtPct(r.actual)} / {fmtPct(r.target)}</span>
              <span className={`text-xs font-bold font-mono min-w-[90px] text-right ${r.diff > 0 ? 'text-emerald' : r.diff < 0 ? 'text-ruby' : 'text-muted-foreground'}`}>
                {r.diff > 0 ? 'Comprar' : r.diff < 0 ? 'Reducir' : 'OK'} {r.diff !== 0 ? fmt(Math.abs(r.diff)) : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResumenTab;
