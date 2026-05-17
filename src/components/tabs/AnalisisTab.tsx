import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { PortfolioSummaryRow, PositionRow, Purchase } from '@/types/portfolio';
import { useParams } from '@/contexts/ParamsContext';
import { portfolioBeta, portfolioVolatility, portfolioCAPM, getBeta, capmReturn, fmt, fmtPct } from '@/lib/calculations';
import { getInstrumentMeta } from '@/lib/portfolioMetadata';
import { getSafeSummary, mapPositionsToHoldings } from '@/lib/positionAdapters';

const TOOLTIP_STYLE = { background: 'hsl(220 30% 7%)', border: '1px solid hsl(215 25% 18%)', borderRadius: '8px', color: 'hsl(210 20% 90%)' } as const;
const TOOLTIP_LABEL = { color: 'hsl(210 20% 90%)' };
const TOOLTIP_ITEM = { color: 'hsl(210 20% 90%)' };

interface Props { purchases: Purchase[]; liquidity: number; positions: PositionRow[]; summary: PortfolioSummaryRow | null; }

const AnalisisTab = ({ purchases, liquidity, positions, summary }: Props) => {
  const { params } = useParams();
  const holdings = mapPositionsToHoldings(positions).filter(h => h.quantity > 0);
  const safeSummary = getSafeSummary(summary, liquidity);
  const totalVal = safeSummary.valorInvertido;
  const totalCom = purchases.reduce((s, p) => s + p.commission, 0);
  const nAssets = holdings.length;
  const totalPnl = holdings.reduce((s, h) => s + h.totalPnl, 0);
  const rendActual = totalVal > 0 ? totalPnl / totalVal : 0;

  const pB = portfolioBeta(holdings, params);
  const pVol = portfolioVolatility(holdings, params);
  const pC = portfolioCAPM(holdings, params);
  const pSh = pVol > 0 ? (pC - params.rfRate) / pVol : 0;
  const hhi = holdings.reduce((s, h) => {
    const w = totalVal > 0 ? h.currentValue / totalVal : 0;
    return s + w * w;
  }, 0);
  const nEf = hhi > 0 ? 1 / hhi : nAssets;
  const totalPortfolio = safeSummary.valorTotal;
  const liquidityWeight = totalPortfolio > 0 ? safeSummary.liquidez / totalPortfolio : 0;

  const dimDiversificacion = Math.min(100, Math.round((nEf / 12) * 100));
  const dimRendimiento = Math.min(100, Math.max(0, Math.round(((rendActual + 0.2) / 0.4) * 100)));
  const dimLiquidez = Math.min(100, Math.round((1 - liquidityWeight) * 100));
  const dimEstabilidad = Math.min(100, Math.max(0, Math.round((1 - (pVol / 0.4)) * 100)));
  const dimEficiencia = Math.min(100, Math.max(0, Math.round(((pSh + 0.5) / 1.5) * 100)));
  const dimConcentracion = Math.min(100, Math.round((1 - Math.min(hhi * 4, 1)) * 100));
  const qScore = Math.round((dimDiversificacion + dimRendimiento + dimLiquidez + dimEstabilidad + dimEficiencia + dimConcentracion) / 6);
  const qLabel = qScore >= 80 ? 'Excelente' : qScore >= 65 ? 'Buena' : qScore >= 50 ? 'Moderada' : 'Mejorable';
  const qColor = qScore >= 80 ? '#10d9a0' : qScore >= 65 ? '#00d4d8' : qScore >= 50 ? '#f5a623' : '#f0466b';

  const dims = [
    { label: 'Diversificación', val: dimDiversificacion, desc: 'Número efectivo de activos' },
    { label: 'Rendimiento', val: dimRendimiento, desc: 'P&L sobre valor actual' },
    { label: 'Liquidez', val: dimLiquidez, desc: 'Capital invertido vs inmovilizado' },
    { label: 'Estabilidad', val: dimEstabilidad, desc: 'Inverso de volatilidad estimada' },
    { label: 'Eficiencia', val: dimEficiencia, desc: 'Sharpe ratio normalizado' },
    { label: 'Concentración', val: dimConcentracion, desc: 'Inverso del índice HHI' },
  ];
  const dimC = (v: number) => v >= 75 ? '#10d9a0' : v >= 50 ? '#00d4d8' : v >= 35 ? '#f5a623' : '#f0466b';
  const radarData = dims.map(d => ({ metric: d.label, value: d.val, ideal: 90 }));

  const assetMetrics = holdings.map(h => {
    const b = getBeta(h.ticker, params);
    const v = b * 0.17;
    const cr = capmReturn(h.ticker, params);
    const sh = v > 0 ? (cr - params.rfRate) / v : 0;
    const realRend = h.totalCost > 0 ? h.totalPnl / h.totalCost : 0;
    const effScore = (sh * 40) + Math.max(-20, Math.min(realRend * 100, 30)) - (v * 40);
    return { ...h, meta: getInstrumentMeta(h.ticker), b, v, cr, sh, realRend, effScore, w: totalVal > 0 ? h.currentValue / totalVal : 0 };
  });
  const efficient = [...assetMetrics].sort((a, b) => b.effScore - a.effScore).slice(0, 5);
  const inefficient = [...assetMetrics].sort((a, b) => a.effScore - b.effScore).slice(0, 5);

  const startCap = totalVal;
  const yrs = params.horizon;
  const projLabels = Array.from({ length: yrs + 1 }, (_, i) => 2025 + i);
  const proj = (r: number) => { let v = startCap; return projLabels.map((_, i) => { if (i === 0) return Math.round(v); v = v * (1 + r) + params.monthlyDCA * 12; return Math.round(v); }); };
  const projData = projLabels.map((yr, i) => ({ year: yr.toString(), conservador: proj(params.conservative)[i], base: proj(params.base)[i], optimista: proj(params.optimistic)[i] }));

  const projTax = (r: number, tax: number, inf: number) => {
    let v = startCap, contrib = startCap;
    return projLabels.map((_, i) => {
      if (i === 0) return Math.round(v);
      v = v * (1 + r) + params.monthlyDCA * 12;
      contrib += params.monthlyDCA * 12;
      return Math.round((v - (v - contrib) * tax) / Math.pow(1 + inf, i));
    });
  };
  const taxData = projLabels.map((yr, i) => ({ year: yr.toString(), bruto: projTax(params.base, 0, 0)[i], netoImp: projTax(params.base, params.taxRate, 0)[i], netoReal: projTax(params.base, params.taxRate, params.inflation)[i] }));

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border"><h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Salud Q-100 Multidimensional</h3></div>
        <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          <div className="flex flex-col items-center gap-1">
            <div className="text-7xl font-extrabold leading-none tracking-tighter" style={{ color: qColor }}>{qScore}</div>
            <div className="text-sm font-bold" style={{ color: qColor }}>{qLabel}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Q-100 Health Score</div>
            <div className="mt-3 w-24 h-2 bg-muted/30 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${qScore}%`, background: qColor }} />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(215 25% 18%)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: 'hsl(215 15% 75%)', fontSize: 12, fontWeight: 600 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
              <Radar dataKey="value" stroke="#10d9a0" fill="#10d9a0" fillOpacity={0.15} strokeWidth={2.5} dot={{ r: 4, fill: '#10d9a0' }} name="Tu Cartera" />
              <Radar dataKey="ideal" stroke="rgba(77,143,255,0.35)" fill="transparent" strokeDasharray="6 4" strokeWidth={1.5} name="Ideal (90)" />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL} itemStyle={TOOLTIP_ITEM} />
            </RadarChart>
          </ResponsiveContainer>
          <div className="space-y-3">
            {dims.map(d => (
              <div key={d.label} title={d.desc}>
                <div className="flex justify-between mb-1">
                  <span className="text-[11px] text-muted-foreground font-medium">{d.label}</span>
                  <span className="text-xs font-bold font-mono" style={{ color: dimC(d.val) }}>{d.val}<span className="text-[9px] text-muted-foreground">/100</span></span>
                </div>
                <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${d.val}%`, background: dimC(d.val) }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">⚠ Alertas Prioritarias</h3>
          <div className="space-y-2">
            <div className="p-2.5 rounded-lg bg-muted/30 text-xs text-muted-foreground">Comisiones totales: <strong className="text-foreground">{fmt(totalCom)}</strong></div>
            <div className="p-2.5 rounded-lg bg-muted/30 text-xs text-muted-foreground">Concentración HHI: <strong className="text-foreground">{(hhi * 100).toFixed(2)}</strong></div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">✓ Puntos Fuertes</h3>
          <div className="space-y-2">
            <div className="p-2.5 rounded-lg bg-muted/30 text-xs text-muted-foreground">{nAssets} activos en cartera</div>
            <div className="p-2.5 rounded-lg bg-muted/30 text-xs text-muted-foreground">Número efectivo: <strong className="text-foreground">{nEf.toFixed(2)}</strong></div>
            <div className="p-2.5 rounded-lg bg-muted/30 text-xs text-muted-foreground">Sharpe estimado: <strong className="text-foreground">{pSh.toFixed(2)}</strong></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl overflow-hidden" style={{ borderLeftWidth: 3, borderLeftColor: '#10d9a0' }}>
          <div className="p-4 border-b border-border"><h3 className="text-xs font-semibold text-emerald uppercase tracking-wider">✓ Activos Más Eficientes</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead><tr className="border-b border-border">
                {['Activo','Sharpe','Rend.','Volatilidad','Score'].map(h => <th key={h} className={`px-3 py-2 text-[9px] uppercase text-muted-foreground font-semibold ${h !== 'Activo' ? 'text-right' : 'text-left'}`}>{h}</th>)}
              </tr></thead>
              <tbody>
                {efficient.map(a => (
                  <tr key={a.ticker} className="border-b border-border/50">
                    <td className="px-3 py-2">{a.meta.name}</td>
                    <td className="px-3 py-2 text-right font-mono text-emerald">{a.sh.toFixed(2)}</td>
                    <td className={`px-3 py-2 text-right font-mono ${a.realRend >= 0 ? 'text-emerald' : 'text-ruby'}`}>{a.realRend >= 0 ? '+' : ''}{fmtPct(a.realRend)}</td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">{fmtPct(a.v)}</td>
                    <td className="px-3 py-2 text-right font-mono text-emerald font-bold">{a.effScore.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl overflow-hidden" style={{ borderLeftWidth: 3, borderLeftColor: '#f0466b' }}>
          <div className="p-4 border-b border-border"><h3 className="text-xs font-semibold text-ruby uppercase tracking-wider">⚠ Activos Menos Eficientes</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead><tr className="border-b border-border">
                {['Activo','Sharpe','Rend.','Volatilidad','Score'].map(h => <th key={h} className={`px-3 py-2 text-[9px] uppercase text-muted-foreground font-semibold ${h !== 'Activo' ? 'text-right' : 'text-left'}`}>{h}</th>)}
              </tr></thead>
              <tbody>
                {inefficient.map(a => (
                  <tr key={a.ticker} className="border-b border-border/50">
                    <td className="px-3 py-2">{a.meta.name}</td>
                    <td className={`px-3 py-2 text-right font-mono ${a.sh < 0 ? 'text-ruby' : 'text-muted-foreground'}`}>{a.sh.toFixed(2)}</td>
                    <td className={`px-3 py-2 text-right font-mono ${a.realRend >= 0 ? 'text-emerald' : 'text-ruby'}`}>{a.realRend >= 0 ? '+' : ''}{fmtPct(a.realRend)}</td>
                    <td className="px-3 py-2 text-right font-mono text-ruby">{fmtPct(a.v)}</td>
                    <td className="px-3 py-2 text-right font-mono text-ruby font-bold">{a.effScore.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Proyección de Capital</h3>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={projData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 25% 18%)" />
            <XAxis dataKey="year" stroke="hsl(215 15% 55%)" tick={{ fontSize: 10 }} interval={Math.max(1, Math.floor(yrs / 6))} />
            <YAxis stroke="hsl(215 15% 55%)" tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k€`} />
            <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL} itemStyle={TOOLTIP_ITEM} formatter={(v: number) => fmt(v)} />
            <Area type="monotone" dataKey="optimista" stroke="#10d9a0" fill="#10d9a0" fillOpacity={0.06} strokeWidth={2.5} name={`Optimista ${fmtPct(params.optimistic, 0)}`} />
            <Area type="monotone" dataKey="base" stroke="#4d8fff" fill="#4d8fff" fillOpacity={0.07} strokeWidth={2.5} name={`Base ${fmtPct(params.base, 0)}`} />
            <Area type="monotone" dataKey="conservador" stroke="#4a637e" fill="transparent" strokeWidth={2} strokeDasharray="5 5" name={`Conservador ${fmtPct(params.conservative, 0)}`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Simulación post-impuestos y real</h3>
        <ResponsiveContainer width="100%" height={210}>
          <AreaChart data={taxData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 25% 18%)" />
            <XAxis dataKey="year" stroke="hsl(215 15% 55%)" tick={{ fontSize: 10 }} interval={Math.max(1, Math.floor(yrs / 6))} />
            <YAxis stroke="hsl(215 15% 55%)" tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k€`} />
            <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL} itemStyle={TOOLTIP_ITEM} formatter={(v: number) => fmt(v)} />
            <Area type="monotone" dataKey="bruto" stroke="#4a637e" fill="transparent" strokeWidth={2} strokeDasharray="4 4" name="Bruto (base)" />
            <Area type="monotone" dataKey="netoImp" stroke="#f5a623" fill="#f5a623" fillOpacity={0.07} strokeWidth={2.5} name={`Neto imp. ${fmtPct(params.taxRate, 0)}`} />
            <Area type="monotone" dataKey="netoReal" stroke="#f0466b" fill="#f0466b" fillOpacity={0.05} strokeWidth={2} name="Neto real (−inflación)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AnalisisTab;
