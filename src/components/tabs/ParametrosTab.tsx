import { useState } from 'react';
import { useParams } from '@/contexts/ParamsContext';
import { DEFAULT_PARAMS } from '@/lib/calculations';
import type { ModelParams } from '@/lib/calculations';
import { fmtPct, fmt } from '@/lib/calculations';

const ParametrosTab = () => {
  const { params, setParams, resetParams } = useParams();
  const [local, setLocal] = useState<ModelParams>({ ...params });
  const [applied, setApplied] = useState(false);

  const update = (key: keyof Omit<ModelParams, 'betas'>, val: number) => {
    setLocal(p => ({ ...p, [key]: val }));
    setApplied(false);
  };

  const apply = () => {
    setParams({ ...local });
    setApplied(true);
    setTimeout(() => setApplied(false), 1500);
  };

  const reset = () => {
    const fresh = { ...DEFAULT_PARAMS };
    setLocal(fresh);
    resetParams();
  };

  const inputCls = `font-mono text-xs font-medium bg-muted/50 border border-border text-amber px-2.5 py-1.5 rounded-lg w-[108px] text-right focus:border-amber focus:outline-none transition-colors ${applied ? 'border-emerald' : ''}`;

  const previewRows = [
    ['Rf', fmtPct(params.rfRate)], ['E[Rm]', fmtPct(params.mktReturn)], ['Inflación', fmtPct(params.inflation)],
    ['Impuesto', fmtPct(params.taxRate, 0)], ['DCA', fmt(params.monthlyDCA)], ['Horizonte', `${params.horizon} años`],
    ['Conservador', fmtPct(params.conservative, 0)], ['Base', fmtPct(params.base, 0)], ['Optimista', fmtPct(params.optimistic, 0)],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-border/50">Parámetros del Modelo</h2>
        <p className="text-xs text-muted-foreground mt-2 max-w-2xl">
          Edita los parámetros y pulsa <strong className="text-amber">Aplicar Cambios</strong> para recalcular todo el cuadro de mandos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* CAPM */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center gap-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">⚙ Modelo CAPM</h3>
          </div>
          <div className="p-4 space-y-3">
            {([
              ['Tasa libre de riesgo (Rf)', 'rfRate', 0.001],
              ['Rentabilidad mercado E[Rm]', 'mktReturn', 0.001],
              ['Inflación objetivo', 'inflation', 0.001],
              ['Tipo impositivo plusvalías', 'taxRate', 0.01],
            ] as const).map(([label, key, step]) => (
              <div key={key} className="flex justify-between items-center gap-3">
                <label className="text-xs text-muted-foreground flex-1">{label}</label>
                <input type="number" step={step} value={local[key]} onChange={e => update(key, parseFloat(e.target.value) || 0)} className={inputCls} />
              </div>
            ))}
          </div>
        </div>

        {/* Plan de Inversión */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-muted/30 border-b border-border">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">📅 Plan de Inversión</h3>
          </div>
          <div className="p-4 space-y-3">
            {([
              ['Aportación mensual DCA (€)', 'monthlyDCA', 5],
              ['Horizonte inversión (años)', 'horizon', 1],
              ['Rentabilidad objetivo', 'targetReturn', 0.005],
            ] as const).map(([label, key, step]) => (
              <div key={key} className="flex justify-between items-center gap-3">
                <label className="text-xs text-muted-foreground flex-1">{label}</label>
                <input type="number" step={step} value={local[key]} onChange={e => update(key, parseFloat(e.target.value) || 0)} className={inputCls} />
              </div>
            ))}
          </div>
        </div>

        {/* Escenarios */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-muted/30 border-b border-border">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">📈 Escenarios Proyección</h3>
          </div>
          <div className="p-4 space-y-3">
            {([
              ['Escenario conservador', 'conservative', 0.005],
              ['Escenario base', 'base', 0.005],
              ['Escenario optimista', 'optimistic', 0.005],
            ] as const).map(([label, key, step]) => (
              <div key={key} className="flex justify-between items-center gap-3">
                <label className="text-xs text-muted-foreground flex-1">{label}</label>
                <input type="number" step={step} value={local[key]} onChange={e => update(key, parseFloat(e.target.value) || 0)} className={inputCls} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-3">
        <button onClick={reset} className="px-4 py-2 rounded-lg text-xs font-semibold border border-border text-muted-foreground hover:bg-muted/30 transition-colors">↺ Restablecer</button>
        <button onClick={apply} className="px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:brightness-110 transition-all">✓ Aplicar Cambios</button>
      </div>

      {/* Preview */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Parámetros activos</h3>
          <p className="text-[10px] text-muted-foreground mt-1">Valores usados en los cálculos</p>
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-0">
          {previewRows.map(([l, v]) => (
            <div key={l} className="flex justify-between items-center py-2 px-1 border-b border-border/50">
              <span className="text-xs text-muted-foreground">{l}</span>
              <span className="text-xs font-bold font-mono text-amber">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ParametrosTab;
