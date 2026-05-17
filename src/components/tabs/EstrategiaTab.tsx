import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { useParams } from '@/contexts/ParamsContext';
import { PORTFOLIO_INSTRUMENTS, CATEGORY_COLORS } from '@/lib/portfolioMetadata';

const TOOLTIP_STYLE = { background: 'hsl(220 30% 7%)', border: '1px solid hsl(215 25% 18%)', borderRadius: '8px', color: 'hsl(210 20% 90%)' } as const;
const TOOLTIP_LABEL = { color: 'hsl(210 20% 90%)' };
const TOOLTIP_ITEM = { color: 'hsl(210 20% 90%)' };
const SUB_TABS = ['Filosofía', 'La cartera', 'Glide path', 'Simulación', 'Ranking activos', 'Reglas de oro'];

const instrumentList = Object.values(PORTFOLIO_INSTRUMENTS).filter(i => i.ticker !== 'LIQUIDEZ');
const pieData = instrumentList.map(i => ({ name: i.name, value: i.targetPct, category: i.category }));
const pillarData = [
  { name: 'Pilar 1 — Core', value: 47 },
  { name: 'Pilar 2 — Alto crecimiento', value: 34 },
  { name: 'Pilar 3 — Defensivo y real assets', value: 19 },
];

interface EstrategiaTabProps {
  enabled?: boolean;
}

const EstrategiaTab = ({ enabled = false }: EstrategiaTabProps) => {
  const { params } = useParams();
  const [activeSub, setActiveSub] = useState('Filosofía');
  const horizon = params.horizon;

  if (!enabled) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center max-w-3xl mx-auto">
        <div className="text-sm font-semibold text-foreground mb-2">Estrategia pendiente de definir</div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Esta pestaña todavía no tiene una estrategia personalizada para tu usuario. Cuando la definamos por código, aquí aparecerán tus pilares, pesos objetivo y reglas específicas de cartera.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="relative p-8 text-center border-b border-border/50" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(194,245,100,0.06) 0%, transparent 70%)' }}>
        <div className="font-mono text-[10px] text-cyan-400 tracking-widest uppercase mb-3">Tu cartera real · Horizonte {horizon} años</div>
        <h1 className="text-2xl md:text-3xl font-normal leading-tight mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
          Estrategia de largo plazo<br />para <em className="text-lime-400 italic">máxima rentabilidad ajustada al riesgo</em>
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl mx-auto mb-6">
          Estrategia personalizada para esta cartera, organizada en tres pilares: core factorial, alto crecimiento y defensivo/real assets.
        </p>
      </div>

      <div className="flex gap-1 px-4 py-2 overflow-x-auto bg-muted/20 border-b border-border/50">
        {SUB_TABS.map(t => (
          <button key={t} onClick={() => setActiveSub(t)} className={`px-4 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${activeSub === t ? 'bg-muted/50 text-lime-400 border border-lime-400/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="p-6 max-w-5xl mx-auto">
        {activeSub === 'Filosofía' && <FilosofiaPage horizon={horizon} />}
        {activeSub === 'La cartera' && <CarteraPage />}
        {activeSub === 'Glide path' && <GlidePage horizon={horizon} />}
        {activeSub === 'Simulación' && <SimulacionPage horizon={horizon} monthlyDCA={params.monthlyDCA} />}
        {activeSub === 'Ranking activos' && <RankingPage />}
        {activeSub === 'Reglas de oro' && <ReglasPage />}
      </div>
    </div>
  );
};

function FilosofiaPage({ horizon }: { horizon: number }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          ['Pilar 1 — Core (47%)', 'Quality, EM IMI, Small Cap, Momentum — base diversificada por factores con evidencia académica sólida.', 'border-l-lime-400'],
          ['Pilar 2 — Alto crecimiento (34%)', 'Semiconductores, Bitcoin, Uranio, Robótica — motor de rentabilidad superior con mayor volatilidad.', 'border-l-purple-400'],
          ['Pilar 3 — Defensivo y real assets (19%)', 'Oro, Energy, Financials, Infrastructure, Healthcare, Consumer Staples, REITs — amortiguadores anticíclicos y protección ante inflación.', 'border-l-cyan-400'],
        ].map(([t, d, b]) => (
          <div key={t as string} className={`bg-muted/30 rounded-lg p-4 border-l-[3px] ${b}`}>
            <h3 className="text-xs font-semibold text-lime-400 mb-2">{t}</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{d}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg p-4 text-sm text-muted-foreground leading-relaxed bg-lime-400/5 border border-lime-400/20">
        Con {horizon} años por delante, el objetivo es maximizar crecimiento real manteniendo una estructura entendible y rebalanceable. El core manda; el bloque de alto crecimiento acelera; el bloque defensivo amortigua.
      </div>
    </div>
  );
}

function CarteraPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="font-mono text-[10px] text-cyan-400 tracking-widest uppercase mb-3">Distribución objetivo de la cartera</div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={110} dataKey="value" stroke="rgba(0,0,0,0.5)" strokeWidth={1.5}>
                {pieData.map((entry, i) => <Cell key={i} fill={CATEGORY_COLORS[entry.category]} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL} itemStyle={TOOLTIP_ITEM} formatter={(v: number) => `${v}%`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="font-mono text-[10px] text-cyan-400 tracking-widest uppercase mb-3">Peso por pilares</div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pillarData} cx="50%" cy="50%" innerRadius={65} outerRadius={110} dataKey="value">
                {pillarData.map((_, i) => <Cell key={i} fill={['#84cc16', '#a855f7', '#06b6d4'][i]} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL} itemStyle={TOOLTIP_ITEM} formatter={(v: number) => `${v}%`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead><tr className="border-b border-border">
              {['Instrumento','Ticker','Exposición','% Cartera','Pilar'].map(h => (
                <th key={h} className={`px-3 py-2.5 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold ${h === '% Cartera' ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {instrumentList.map((row) => (
                <tr key={row.ticker} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="px-3 py-2.5 font-semibold">{row.name}</td>
                  <td className="px-3 py-2.5 font-mono text-muted-foreground">{row.ticker}</td>
                  <td className="px-3 py-2.5"><span className="px-2 py-0.5 rounded-full text-[9px] font-semibold" style={{ backgroundColor: `${CATEGORY_COLORS[row.category]}22`, color: CATEGORY_COLORS[row.category] }}>{row.category}</span></td>
                  <td className="px-3 py-2.5 text-right font-mono">{row.targetPct.toFixed(2)}%</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{row.pillar}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function GlidePage({ horizon }: { horizon: number }) {
  const glideData = Array.from({ length: horizon + 1 }, (_, i) => {
    const t = i / horizon;
    return {
      year: `Año ${i}`,
      core: Math.max(35, Math.round(47 - t * 12)),
      growth: Math.max(15, Math.round(34 - t * 14)),
      defensive: Math.min(35, Math.round(19 + t * 11)),
      rentaFija: Math.round(Math.max(0, t * 15)),
    };
  });

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Evolución del glide path</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={glideData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="year" stroke="hsl(215 15% 55%)" tick={{ fontSize: 10 }} interval={Math.max(1, Math.floor(horizon / 8))} />
          <YAxis stroke="hsl(215 15% 55%)" tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} domain={[0, 100]} />
          <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL} itemStyle={TOOLTIP_ITEM} />
          <Area type="monotone" dataKey="core" stackId="1" stroke="#84cc16" fill="#84cc16" fillOpacity={0.3} name="Core" />
          <Area type="monotone" dataKey="growth" stackId="1" stroke="#a855f7" fill="#a855f7" fillOpacity={0.2} name="Alto crecimiento" />
          <Area type="monotone" dataKey="defensive" stackId="1" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.15} name="Defensivo" />
          <Area type="monotone" dataKey="rentaFija" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} name="Renta fija" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function SimulacionPage({ horizon, monthlyDCA }: { horizon: number; monthlyDCA: number }) {
  const startCap = 50000;
  const yrs = Array.from({ length: horizon + 1 }, (_, i) => i === 0 ? 'Inicio' : `Año ${i}`);
  const simData = yrs.map((yr, i) => ({
    year: yr,
    optimista: Math.round(startCap * Math.pow(1.12, i) + monthlyDCA * 12 * i),
    base: Math.round(startCap * Math.pow(1.09, i) + monthlyDCA * 12 * i),
    conservador: Math.round(startCap * Math.pow(1.06, i) + monthlyDCA * 12 * i),
  }));

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Simulación de capital</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={simData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="year" stroke="hsl(215 15% 55%)" tick={{ fontSize: 10 }} interval={Math.max(1, Math.floor(horizon / 8))} />
          <YAxis stroke="hsl(215 15% 55%)" tick={{ fontSize: 10 }} tickFormatter={v => `€${Math.round(v / 1000)}k`} />
          <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL} itemStyle={TOOLTIP_ITEM} formatter={(v: number) => `€${v.toLocaleString('es-ES')}`} />
          <Area type="monotone" dataKey="optimista" stroke="#84cc16" fill="#84cc16" fillOpacity={0.15} name="Optimista" />
          <Area type="monotone" dataKey="base" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.12} name="Base" />
          <Area type="monotone" dataKey="conservador" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.08} name="Conservador" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function RankingPage() {
  const ranks = [...instrumentList].sort((a, b) => b.targetPct - a.targetPct);
  return (
    <div className="space-y-4">
      {ranks.map((r, index) => (
        <div key={r.ticker} className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
          <div className="font-mono text-lg font-bold w-8 text-center" style={{ color: CATEGORY_COLORS[r.category] }}>{index + 1}</div>
          <div className="flex-1">
            <div className="font-semibold text-sm">{r.name}</div>
            <div className="text-[11px] text-muted-foreground">{r.category} · {r.pillar}</div>
          </div>
          <div className="font-mono text-xs font-bold text-right" style={{ color: CATEGORY_COLORS[r.category] }}>{r.targetPct.toFixed(2)}%</div>
        </div>
      ))}
    </div>
  );
}

function ReglasPage() {
  const rules = [
    'Mantener la estructura por pilares salvo revisión estratégica explícita.',
    'Rebalancear cuando una posición se desvíe materialmente del objetivo.',
    'No ampliar el bloque de alto crecimiento si ya supera su rango objetivo.',
    'Usar el bloque defensivo para amortiguar ciclos e inflación, no para perseguir momentum.',
    'Revisar costes, TER y solapamientos al menos una vez al año.',
  ];

  return (
    <div className="space-y-2">
      {rules.map((rule, i) => (
        <div key={i} className="flex gap-4 py-3 border-b border-border/50 last:border-0">
          <div className="font-mono text-2xl font-bold opacity-40 shrink-0 text-lime-400">{String(i + 1).padStart(2, '0')}</div>
          <div className="text-xs text-muted-foreground leading-relaxed">{rule}</div>
        </div>
      ))}
    </div>
  );
}

export default EstrategiaTab;
