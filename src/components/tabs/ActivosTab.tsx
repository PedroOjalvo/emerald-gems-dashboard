import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import type { PortfolioSummaryRow, PositionRow } from '@/types/portfolio';
import { useParams } from '@/contexts/ParamsContext';
import { getBeta, capmReturn, fmt, fmtPct, fmtNum } from '@/lib/calculations';
import { CATEGORY_COLORS, getInstrumentMeta } from '@/lib/portfolioMetadata';
import { getSafeSummary, mapPositionsToHoldings } from '@/lib/positionAdapters';

const TOOLTIP_STYLE = { background: 'hsl(220 30% 7%)', border: '1px solid hsl(215 25% 18%)', borderRadius: '8px', color: 'hsl(210 20% 90%)' } as const;
const TOOLTIP_LABEL = { color: 'hsl(210 20% 90%)' };
const TOOLTIP_ITEM = { color: 'hsl(210 20% 90%)' };

interface Props { liquidity: number; positions: PositionRow[]; summary: PortfolioSummaryRow | null; }

const ActivosTab = ({ liquidity, positions, summary }: Props) => {
  const { params } = useParams();
  const [filterType, setFilterType] = useState('Todos');
  const holdings = mapPositionsToHoldings(positions).filter(h => h.quantity > 0);
  const safeSummary = getSafeSummary(summary, liquidity);
  const totalVal = safeSummary.valorTotal;
  const types = ['Todos', ...new Set(holdings.map(h => getInstrumentMeta(h.ticker).category))];
  const filtered = filterType === 'Todos' ? holdings : holdings.filter(h => getInstrumentMeta(h.ticker).category === filterType);

  const rows = filtered.map(h => {
    const meta = getInstrumentMeta(h.ticker);
    const val = h.currentValue;
    const weight = totalVal > 0 ? val / totalVal : 0;
    const beta = getBeta(h.ticker, params);
    const cr = capmReturn(h.ticker, params);
    const vol = beta * 0.17;
    const rend = h.totalCost > 0 ? h.totalPnl / h.totalCost : 0;
    const eurMes = params.monthlyDCA * meta.targetPct / 100;
    return { ...h, meta, val, weight, beta, cr, vol, rend, eurMes };
  });

  const catSum: Record<string, { val: number; w: number; pnl: number; vols: number[] }> = {};
  rows.forEach(r => {
    if (!catSum[r.meta.category]) catSum[r.meta.category] = { val: 0, w: 0, pnl: 0, vols: [] };
    catSum[r.meta.category].val += r.val;
    catSum[r.meta.category].w += r.weight;
    catSum[r.meta.category].pnl += r.totalPnl;
    catSum[r.meta.category].vols.push(r.vol);
  });

  const pnlData = [...rows].sort((a, b) => b.totalPnl - a.totalPnl).map(r => ({
    name: r.ticker,
    value: +r.totalPnl.toFixed(2),
    fill: r.totalPnl >= 0 ? 'rgba(16,217,160,0.7)' : 'rgba(240,70,107,0.7)',
  }));
  const capmData = [...rows].sort((a, b) => b.cr - a.cr).map(r => ({ name: r.ticker, value: +(r.cr * 100).toFixed(2) }));

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Liquidez Disponible</p>
          <p className="text-2xl font-bold font-mono text-cyan-400">{fmt(safeSummary.liquidez)}</p>
        </div>
        <div className="text-xs text-muted-foreground">Las comisiones y ventas se reflejan aquí</div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex gap-1.5 flex-wrap px-4 py-3 border-b border-border bg-muted/30">
          {types.map(t => (
            <button key={t} onClick={() => setFilterType(t)} className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${t === filterType ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent text-muted-foreground border-border hover:text-foreground'}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-border">
                {['#','Instrumento','Categoría','Coste medio','% Obj.','% Actual','Coste','Valor','P&L','Rend.','Beta β','E[R] CAPM','Vol.','€/Mes','Ops'].map(h => (
                  <th key={h} className={`px-3 py-2.5 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap ${['Coste medio','% Obj.','% Actual','Coste','Valor','P&L','Rend.','Beta β','E[R] CAPM','Vol.','€/Mes','Ops'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.ticker} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2.5 text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-2.5 font-semibold">
                    <div>{r.meta.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{r.ticker}</div>
                  </td>
                  <td className="px-3 py-2.5"><span className="px-2 py-0.5 rounded-full text-[9px] font-semibold" style={{ backgroundColor: `${CATEGORY_COLORS[r.meta.category]}22`, color: CATEGORY_COLORS[r.meta.category] }}>{r.meta.category}</span></td>
                  <td className="px-3 py-2.5 text-right font-mono">{fmtNum(r.avgPrice)}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{fmtPct(r.meta.targetPct / 100)}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{fmtPct(r.weight)}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{fmt(r.totalCost)}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{fmt(r.val)}</td>
                  <td className={`px-3 py-2.5 text-right font-mono font-semibold ${r.totalPnl >= 0 ? 'text-emerald' : 'text-ruby'}`}>{r.totalPnl >= 0 ? '+' : ''}{fmt(r.totalPnl)}</td>
                  <td className={`px-3 py-2.5 text-right font-mono font-semibold ${r.rend >= 0 ? 'text-emerald' : 'text-ruby'}`}>{r.rend >= 0 ? '+' : ''}{fmtPct(r.rend)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-blue-400">{r.beta.toFixed(2)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-cyan-400">{fmtPct(r.cr)}</td>
                  <td className={`px-3 py-2.5 text-right font-mono ${r.vol > 0.25 ? 'text-ruby' : 'text-muted-foreground'}`}>{fmtPct(r.vol)}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{fmt(r.eurMes)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{r.nOps}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border"><h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resumen por Categoría</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead><tr className="border-b border-border">
              {['Categoría','Valor Total','Peso','P&L Total','Rentabilidad','Vol. Media'].map(h => (
                <th key={h} className={`px-3 py-2.5 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold ${h !== 'Categoría' ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {Object.entries(catSum).map(([cat, c]) => {
                const avgVol = c.vols.length ? c.vols.reduce((s, v) => s + v, 0) / c.vols.length : 0;
                return (
                  <tr key={cat} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-3 py-2.5"><span className="px-2 py-0.5 rounded-full text-[9px] font-semibold" style={{ backgroundColor: `${CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS]}22`, color: CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS] }}>{cat}</span></td>
                    <td className="px-3 py-2.5 text-right font-mono">{fmt(c.val)}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{fmtPct(c.w)}</td>
                    <td className={`px-3 py-2.5 text-right font-mono font-semibold ${c.pnl >= 0 ? 'text-emerald' : 'text-ruby'}`}>{c.pnl >= 0 ? '+' : ''}{fmt(c.pnl)}</td>
                    <td className={`px-3 py-2.5 text-right font-mono ${c.val > 0 && c.pnl / c.val >= 0 ? 'text-emerald' : 'text-ruby'}`}>{fmtPct(c.val > 0 ? c.pnl / c.val : 0)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{fmtPct(avgVol)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">P&amp;L por Activo</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={pnlData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 25% 18%)" />
              <XAxis type="number" stroke="hsl(215 15% 55%)" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" stroke="hsl(215 15% 55%)" tick={{ fontSize: 11 }} width={60} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL} itemStyle={TOOLTIP_ITEM} formatter={(v: number) => fmt(v)} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {pnlData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">E[R] CAPM por Activo</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={capmData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 25% 18%)" />
              <XAxis type="number" stroke="hsl(215 15% 55%)" tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="name" stroke="hsl(215 15% 55%)" tick={{ fontSize: 11 }} width={60} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL} itemStyle={TOOLTIP_ITEM} formatter={(v: number) => `${v}%`} />
              <Bar dataKey="value" fill="rgba(77,143,255,0.6)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ActivosTab;
