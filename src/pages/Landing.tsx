import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Brain,
  Shield,
  Check,
  Gem,
  TrendingUp,
  Calculator,
  Sparkles,
  LineChart,
  Receipt,
  ExternalLink,
  X,
} from 'lucide-react';

const plans = [
  {
    name: 'Explorer',
    price: 'Gratis',
    period: '',
    theme: 'default' as const,
    features: [
      'Visualización de 3 activos',
      'Actualización manual de precios',
      'Dashboard básico',
    ],
    cta: 'Empezar gratis',
  },
  {
    name: 'Strategic',
    badge: 'Pro',
    price: '47€',
    period: '/mes',
    theme: 'silver' as const,
    features: [
      'Activos ilimitados',
      'Informe fiscal básico',
      'Dashboard completo',
      'Soporte Email',
    ],
    cta: 'Solicitar acceso',
  },
  {
    name: 'Executive AI',
    badge: 'Premium',
    price: '147€',
    period: '/mes',
    theme: 'featured' as const,
    popular: true,
    features: [
      'Método Emerald Gems',
      'Actualización diaria',
      'Alertas Telegram',
      'Informe Fiscal IA',
      'Proyecciones Anuales',
      'Soporte Prioritario',
    ],
    cta: 'Solicitar acceso',
  },
];

const Landing = () => {
  const [labOpen, setLabOpen] = useState(false);

  return (
    <div className="noise-bg min-h-screen text-foreground">
      {/* NAV */}
      <header className="relative z-20 border-b border-border bg-card/60 backdrop-blur-md sticky top-0">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gem className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold tracking-tight">
              <span className="text-primary">Emerald</span> Gems
            </h1>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#metodo" className="hover:text-foreground transition-colors">Método</a>
            <a href="#fiscal" className="hover:text-foreground transition-colors">Fiscal</a>
            <a href="#lab" className="hover:text-foreground transition-colors">Strategy Lab</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Planes</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/auth"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
            >
              Acceder
            </Link>
            <Link
              to="/auth"
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 hover:brightness-110 transition-all"
            >
              <Gem className="h-4 w-4" /> Solicitar acceso
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-30"
          style={{
            background:
              'radial-gradient(60% 50% at 50% 0%, hsl(var(--primary) / 0.3) 0%, transparent 70%)',
          }}
        />
        <div className="max-w-7xl mx-auto px-4 py-24 md:py-36 text-center">
          <div className="inline-flex items-center gap-2 bg-card border border-border rounded-full px-3 py-1 text-xs text-muted-foreground mb-8">
            <Sparkles className="h-3 w-3 text-primary" />
            Inteligencia Matemática · Inteligencia Fiscal
          </div>
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] max-w-5xl mx-auto">
            Optimice su Patrimonio con <span className="text-primary">Inteligencia Matemática</span> y Fiscal.
          </h2>
          <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Maximice su rentabilidad con el método <span className="text-foreground font-semibold">Emerald Gems</span> y
            anticipe su impacto fiscal con IA.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/auth"
              className="group bg-primary text-primary-foreground font-semibold px-7 py-4 rounded-lg flex items-center gap-2 hover:brightness-110 transition-all text-base"
            >
              Solicitar acceso
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href="#lab"
              className="bg-card border border-border text-foreground font-semibold px-7 py-4 rounded-lg hover:bg-muted/40 transition-all text-base"
            >
              Ver simulación
            </a>
          </div>
        </div>
      </section>

      {/* VALOR EMERALD GEMS */}
      <section id="metodo" className="max-w-7xl mx-auto px-4 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-xs uppercase tracking-widest text-primary mb-3 font-semibold">El método</p>
            <h3 className="text-3xl md:text-5xl font-bold tracking-tight mb-5">
              El método <span className="text-primary">Emerald Gems</span> genera hasta un{' '}
              <span className="text-primary">30% más de capital</span> a largo plazo.
            </h3>
            <p className="text-muted-foreground text-base leading-relaxed mb-6">
              Frente al DCA tradicional o la inversión emocional, Emerald Gems aplica un modelo matemático
              anticíclico: aumenta su aportación de forma proporcional en cada caída del mercado, optimizando
              su precio medio de entrada y acelerando la composición del capital.
            </p>
            <ul className="space-y-3">
              {[
                'Aportaciones anticíclicas calibradas por volatilidad',
                'Precio medio optimizado en cada corrección',
                'Composición acelerada a 10, 15 y 20 años',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{f}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: '+30%', sub: 'Capital final adicional', icon: TrendingUp },
              { label: 'x2', sub: 'Multiplicador anticíclico', icon: Calculator },
              { label: '500', sub: 'Simulaciones Monte Carlo', icon: LineChart },
              { label: '20a', sub: 'Horizonte de análisis', icon: Sparkles },
            ].map((item) => (
              <div key={item.sub} className="bg-card border border-border rounded-xl p-6 flex flex-col gap-2">
                <item.icon className="h-5 w-5 text-primary" />
                <p className="text-3xl font-bold font-mono text-primary">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EMERALD STRATEGY LAB */}
      <section id="lab" className="max-w-7xl mx-auto px-4 py-20">
        <div className="relative bg-card border border-primary/30 rounded-2xl p-8 md:p-14 overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 opacity-25"
            style={{
              background:
                'radial-gradient(50% 80% at 50% 0%, hsl(var(--primary) / 0.35) 0%, transparent 70%)',
            }}
          />
          <div className="relative grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-3 py-1 text-xs text-primary mb-5 font-semibold uppercase tracking-widest">
                <Sparkles className="h-3 w-3" />
                Emerald Strategy Lab
              </div>
              <h3 className="text-3xl md:text-5xl font-bold tracking-tight mb-5">
                Visualice su <span className="text-primary">ventaja competitiva</span>.
              </h3>
              <p className="text-muted-foreground text-base leading-relaxed mb-8 max-w-2xl">
                No invierta a ciegas. Utilice nuestro motor de simulación Monte Carlo para comparar el método
                tradicional frente a la estrategia Emerald Gems. Descubra cómo una gestión con nosotros puede
                incrementar su capital final en más de un{' '}
                <span className="text-primary font-semibold">25%</span>.
              </p>
              <button
                type="button"
                onClick={() => setLabOpen(true)}
                className="group bg-primary text-primary-foreground font-semibold px-7 py-4 rounded-lg inline-flex items-center gap-2 hover:brightness-110 transition-all text-base"
              >
                Ejecutar simulación personalizada
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {[
                { k: 'DCA Plano · 20a', v: '180k €', muted: true },
                { k: 'Emerald Gems · 20a', v: '232k €', muted: false },
                { k: 'Ventaja estimada', v: '+28.9%', muted: false },
              ].map((row) => (
                <div
                  key={row.k}
                  className="flex items-center justify-between bg-background/40 border border-border rounded-lg px-5 py-4 font-mono"
                >
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">{row.k}</span>
                  <span className={`text-xl font-bold ${row.muted ? 'text-muted-foreground' : 'text-primary'}`}>
                    {row.v}
                  </span>
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground font-mono mt-1">
                · Mediana de 500 simulaciones · MSCI World · 300€/mes · 8% rent. base · 16% vol.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* INTELIGENCIA FISCAL */}
      <section id="fiscal" className="max-w-7xl mx-auto px-4 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="order-2 lg:order-1 grid grid-cols-2 gap-3">
            {[
              { label: '−26%', sub: 'Ahorro fiscal estimado', icon: Receipt },
              { label: 'IA', sub: 'Compensación inteligente', icon: Brain },
              { label: '2m', sub: 'Regla de los dos meses', icon: Calculator },
              { label: '∞', sub: 'Pérdidas compensables', icon: TrendingUp },
            ].map((item) => (
              <div key={item.sub} className="bg-card border border-border rounded-xl p-6 flex flex-col gap-2">
                <item.icon className="h-5 w-5 text-primary" />
                <p className="text-3xl font-bold font-mono text-primary">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.sub}</p>
              </div>
            ))}
          </div>
          <div className="order-1 lg:order-2">
            <p className="text-xs uppercase tracking-widest text-primary mb-3 font-semibold">Inteligencia Fiscal</p>
            <h3 className="text-3xl md:text-5xl font-bold tracking-tight mb-5">
              Ahorre hasta un <span className="text-primary">26% de impuestos</span>.
            </h3>
            <p className="text-muted-foreground text-base leading-relaxed mb-6">
              Mediante la compensación inteligente de pérdidas y ganancias y el control estricto de la{' '}
              <span className="text-foreground font-semibold">regla de los dos meses</span>, nuestra IA
              identifica oportunidades fiscales que el inversor medio ignora hasta que es demasiado tarde.
            </p>
            <ul className="space-y-3">
              {[
                'Compensación automática de pérdidas y ganancias',
                'Control de la regla de los 2 meses en recompras',
                'Proyección fiscal antes del cierre del ejercicio',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* SEGURIDAD */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="bg-card border border-border rounded-2xl p-8 md:p-12 text-center">
          <div className="inline-flex h-14 w-14 rounded-xl bg-primary/10 border border-primary/20 items-center justify-center mb-5">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
            Su capital, siempre bajo <span className="text-primary">su control</span>.
          </h3>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base">
            Plataforma de análisis externo. Sin acceso a sus brokers, sin claves privadas. Nosotros aportamos
            la inteligencia; usted mantiene la custodia.
          </p>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-14">
          <p className="text-xs uppercase tracking-widest text-primary mb-2 font-semibold">Planes</p>
          <h3 className="text-3xl md:text-5xl font-bold tracking-tight">
            Elija su nivel de inteligencia
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
          {plans.map((plan) => {
            const isFeatured = plan.theme === 'featured';
            const isSilver = plan.theme === 'silver';
            return (
              <div
                key={plan.name}
                className={`relative rounded-xl p-8 flex flex-col transition-all ${
                  isFeatured
                    ? 'bg-card border-2 border-emerald shadow-2xl shadow-emerald/20'
                    : isSilver
                    ? 'bg-card border border-silver/40'
                    : 'bg-card border border-border'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald text-emerald-foreground text-[10px] font-bold uppercase tracking-wider px-4 py-1.5 rounded-full">
                    Más Popular
                  </span>
                )}
                {plan.badge && !plan.popular && (
                  <span className={`absolute -top-3 left-6 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                    isSilver ? 'bg-silver text-silver-foreground' : 'bg-primary text-primary-foreground'
                  }`}>
                    {plan.badge}
                  </span>
                )}
                <h4 className={`text-lg font-bold mb-1 ${isSilver ? 'text-silver' : ''}`}>{plan.name}</h4>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className={`text-3xl font-bold font-mono ${isSilver ? 'text-silver' : ''}`}>{plan.price}</span>
                  {plan.period && <span className="text-sm text-muted-foreground">{plan.period}</span>}
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className={`h-4 w-4 mt-0.5 shrink-0 ${isSilver ? 'text-silver' : 'text-primary'}`} />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/auth"
                  className={`w-full text-center py-3 rounded-lg font-semibold text-sm transition-all ${
                    isFeatured
                      ? 'bg-emerald text-white hover:brightness-110'
                      : isSilver
                      ? 'bg-muted/60 border border-border text-foreground hover:bg-muted/80'
                      : 'bg-muted/40 border border-border text-foreground hover:bg-muted/60'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="max-w-4xl mx-auto px-4 py-24 text-center">
        <h3 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
          No deje su patrimonio al <span className="text-primary">azar</span>.
        </h3>
        <p className="text-muted-foreground max-w-2xl mx-auto mb-8 text-base">
          Únase a la élite de inversores que operan con matemática e inteligencia fiscal.
        </p>
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-7 py-4 rounded-lg hover:brightness-110 transition-all text-base"
        >
          Solicitar acceso <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Gem className="h-4 w-4 text-primary" />
            <span><span className="text-primary font-semibold">Emerald</span> Gems · Inteligencia Estratégica para Inversores</span>
          </div>
          <p className="text-xs">© {new Date().getFullYear()} · Todos los derechos reservados</p>
        </div>
      </footer>

      {/* SIMULATOR MODAL */}
      {labOpen && (
        <div
          className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center p-2 md:p-6"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full h-full max-w-7xl bg-card border border-border rounded-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card/80">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="font-semibold text-sm">
                  Emerald Strategy Lab · <span className="text-muted-foreground">Simulador Monte Carlo</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="/emerald-strategy-lab.html"
                  target="_blank"
                  rel="noopener"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border"
                >
                  Abrir en nueva pestaña <ExternalLink className="h-3 w-3" />
                </a>
                <button
                  type="button"
                  onClick={() => setLabOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-muted/40"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <iframe
              src="/emerald-strategy-lab.html"
              title="Emerald Strategy Lab"
              className="flex-1 w-full bg-background"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Landing;
