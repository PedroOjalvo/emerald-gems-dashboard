import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Cell, PolarAngleAxis, PolarGrid, RadarChart, Radar, PolarRadiusAxis } from 'recharts';
import KpiCard from '@/components/KpiCard';
import type { PositionRow } from '@/types/portfolio';
import { useParams } from '@/contexts/ParamsContext';
import { getBeta, capmReturn, portfolioBeta, portfolioVolatility, portfolioCAPM, fmtPct } from '@/lib/calculations';
import { CATEGORY_COLORS, getInstrumentMeta } from '@/lib/portfolioMetadata';
import { mapPositionsToHoldings } from '@/lib/positionAdapters';
import { Activity, Shield, Target, AlertTriangle, BarChart3, TrendingUp } from 'lucide-react';

const TOOLTIP_STYLE = { background: 'hsl(220 30% 7%)', border: '1px solid hsl(215 25% 18%)', borderRadius: '8px', color: 'hsl(210 20% 90%)' } as const;
const TOOLTIP_LABEL = { color: 'hsl(210 20% 90%)' };
const TOOLTIP_ITEM = { color: 'hsl(210 20% 90%)' };
const PAL = ['#10d9a0','#4d8fff','#f5a623','#f0466b','#a78bff','#00d4d8','#4ade80','#38bdf8','#fb923c','#f472b6','#34d399','#60a5fa'];

interface Props { positions: PositionRow[]; }

const RiesgoTab = ({ positions }: Props) => {
  const { params } = useParams();
  const holdings = mapPositionsToHoldings(positions).filter(h => h.quantity > 0);
  const totalVal = holdings.reduce((s, h) => s + h.currentValue, 0);

  const pB = portfolioBeta(holdings, params);
  const pVol = portfolioVolatility(holdings, params);
  const pC = portfolioCAPM(holdings, params);
  const pSh = pVol > 0 ? (pC - params.rfRate) / pVol : 0;
  const pTr = pB > 0 ? (pC - params.rfRate) / pB : 0;
  const pAl = 0 - pC;
  const hhi = holdings.reduce((s, h) => s + Math.pow(totalVal > 0 ? h.currentValue / totalVal : 0, 2), 0);
  const nEf = hhi > 0 ? 1 / hhi : holdings.length;
  const varEst = pVol * 1.645 * Math.sqrt(1 / 12);
  const maxDD = pVol * 2.33;

  const categoryExposure: Record<string, number> = {};
  holdings.forEach(h => {
    const meta = getInstrumentMeta(h.ticker);
    categoryExposure[meta.category] = (categoryExposure[meta.category] || 0) + (totalVal > 0 ? h.currentValue / totalVal : 0);
  });

  const riskRows = holdings.map(h => {
    const b = getBeta(h.ticker, params);
    const v = b * 0.17;
    const cr = capmReturn(h.ticker, params);
    const sh = v > 0 ? (cr - params.rfRate) / v : 0;
    const riskScore = Math.min(100, Math.round(b * 35 + v * 100 + (sh < 0 ? 20 : 0)));
    const w = totalVal > 0 ? h.currentValue / totalVal : 0;
    const contribRisk = pB > 0 ? (w * b) / pB : 0;
    const lvl = b > 1.4 ? 'Alto' : b > 0.95 ? 'Medio' : 'Bajo';
    return { ...h, w, b, v, cr, sh, riskScore, contribRisk, lvl, meta: getInstrumentMeta(h.ticker) };
  });

  const scatterData = riskRows.map((r, i) => ({ x: +(r.v * 100).toFixed(2), y: +(r.cr * 100).toFixed(2), z: +(r.w * 100).toFixed(2), name: r.meta.name, ticker: r.ticker, fill: PAL[i % PAL.length] }));
  const sectorData = Object.entries(categoryExposure).map(([name, val]) => ({ name, value: +(val * 100).toFixed(2) }));
  const volData = [...riskRows].sort((a, b) => b.v - a.v).map(r => ({ name: r.ticker, value: +(r.v * 100).toFixed(2), fill: r.v > 0.30 ? 'rgba(240,70,107,0.75)' : r.v > 0.18 ? 'rgba(245,166,35,0.75)' : 'rgba(16,217,160,0.65)' }));
  const hhiColor = hhi < 0.12 ? 'emerald' : hhi < 0.22 ? 'amber' : 'ruby';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
        <KpiCard title="Volatilidad Cartera" value={fmtPct(pVol)} icon={Activity} color="primary" subtitle="Estimación por beta agregada" />
        <KpiCard title="Beta Cartera" value={pB.toFixed(2)} icon={Shield} color="primary" subtitle="Sensibilidad vs mercado global" />
        <KpiCard title="Sharpe Ratio" value={pSh.toFixed(2)} icon={Target} color="amber" subtitle={`Rf=${fmtPct(params.rfRate)} · σ=${fmtPct(pVol)}`} />
        <KpiCard title="Treynor Ratio" value={pTr.toFixed(2)} icon={BarChart3} color="primary" subtitle="(E[R]−Rf) / β" />
        <KpiCard title="Alpha Jensen" value={`${pAl >= 0 ? '+' : ''}${fmtPct(pAl)}`} icon={TrendingUp} color={pAl >= 0 ? 'emerald' : 'ruby'} subtitle="Modelo teórico" />
        <KpiCard title="HHI Concentración" value={(hhi * 100).toFixed(2)} icon={Shield} color={hhiColor} subtitle={`N° efectivo: ${nEf.toFixed(2)} activos`} />
        <KpiCard title="VaR 95% mensual" value={`−${fmtPct(varEst)}`} icon={AlertTriangle} color="ruby" subtitle="Pérdida estimada / mes" />
        <KpiCard title="Max Drawdown Est." value={`−${fmtPct(maxDD)}`} icon={AlertTriangle} color="ruby" subtitle="Caída máxima estimada" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Dispersión Riesgo–Retorno</h3>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 25% 18%)" />
              <XAxis type="number" dataKey="x" name="Volatilidad" unit="%" stroke="hsl(215 15% 55%)" tick={{ fontSize: 10 }} />
              <YAxis type="number" dataKey="y" name="E[R] CAPM" unit="%" stroke="hsl(215 15% 55%)" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL} itemStyle={TOOLTIP_ITEM} formatter={(v: number) => [`${v}`, undefined]} labelFormatter={(_, payload) => payload?.[0]?.payload?.name ?? ''} />
              <Scatter data={scatterData}>
                {scatterData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Exposición por Categoría</h3>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={sectorData}>
              <PolarGrid stroke="hsl(215 25% 18%)" />
              <PolarAngleAxis dataKey="name" tick={{ fill: 'hsl(215 15% 55%)', fontSize: 10 }} />
              <PolarRadiusAxis tick={{ fontSize: 9 }} />
              <Radar dataKey="value" stroke="#10d9a0" fill="#10d9a0" fillOpacity={0.2} strokeWidth={2} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL} itemStyle={TOOLTIP_ITEM} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Volatilidad por Activo</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={volData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 25% 18%)" />
              <XAxis type="number" stroke="hsl(215 15% 55%)" tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="name" stroke="hsl(215 15% 55%)" tick={{ fontSize: 11 }} width={70} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL} itemStyle={TOOLTIP_ITEM} formatter={(v: number) => `${v}%`} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {volData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Contribución al Riesgo</h3>
          <div className="space-y-2">
            {[...riskRows].sort((a, b) => b.riskScore - a.riskScore).map(r => {
              const rsColor = r.riskScore > 70 ? '#f0466b' : r.riskScore > 40 ? '#f5a623' : '#10d9a0';
              return (
                <div key={r.ticker}>
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1 font-mono">
                    <span>{r.meta.name}</span>
                    <span style={{ color: rsColor }}>{r.riskScore}/100</span>
                  </div>
                  <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${r.riskScore}%`, background: rsColor }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border"><h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tabla de Riesgo Individual</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead><tr className="border-b border-border">
              {['Activo','Categoría','Peso','Beta β','Vol.Est.','E[R] CAPM','Sharpe','Risk Score','Contrib.%','Nivel'].map(h => (
                <th key={h} className={`px-3 py-2.5 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold ${h !== 'Activo' && h !== 'Categoría' ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {riskRows.map(r => {
                const lvlColor = r.lvl === 'Alto' ? 'text-ruby' : r.lvl === 'Medio' ? 'text-amber' : 'text-emerald';
                const rsColor = r.riskScore > 70 ? 'text-ruby' : r.riskScore > 40 ? 'text-amber' : 'text-emerald';
                return (
                  <tr key={r.ticker} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-3 py-2.5 font-semibold">
                      <div>{r.meta.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{r.ticker}</div>
                    </td>
                    <td className="px-3 py-2.5"><span className="px-2 py-0.5 rounded-full text-[9px] font-semibold" style={{ backgroundColor: `${CATEGORY_COLORS[r.meta.category]}22`, color: CATEGORY_COLORS[r.meta.category] }}>{r.meta.category}</span></td>
                    <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{fmtPct(r.w)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-blue-400">{r.b.toFixed(2)}</td>
                    <td className={`px-3 py-2.5 text-right font-mono ${r.v > 0.25 ? 'text-ruby' : 'text-muted-foreground'}`}>{fmtPct(r.v)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-cyan-400">{fmtPct(r.cr)}</td>
                    <td className={`px-3 py-2.5 text-right font-mono ${r.sh >= 0.5 ? 'text-emerald' : r.sh < 0 ? 'text-ruby' : 'text-muted-foreground'}`}>{r.sh.toFixed(2)}</td>
                    <td className={`px-3 py-2.5 text-right font-mono font-bold ${rsColor}`}>{r.riskScore}/100</td>
                    <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{fmtPct(r.contribRisk)}</td>
                    <td className={`px-3 py-2.5 text-right font-semibold ${lvlColor}`}>{r.lvl}</td>
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

export default RiesgoTab;
