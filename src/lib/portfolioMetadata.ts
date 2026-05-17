// ============================================================
// portfolioMetadata.ts
// Catálogo de nombres, colores y pilares por ticker.
// Los pesos objetivo (targetPct) ya NO están aquí — vienen de
// la tabla pesos_objetivo_usuario en Supabase.
// ============================================================

export type PortfolioCategory =
  | 'ETF RV Factor'
  | 'ETF RV Emergentes'
  | 'ETF RV Sectorial'
  | 'ETF RV Temático'
  | 'ETP Crypto'
  | 'ETF RV Infraestructura'
  | 'ETC Commodity'
  | 'ETF REITs'
  | 'Liquidez';

export interface PortfolioInstrumentMeta {
  ticker: string;
  name: string;
  category: PortfolioCategory;
  targetPct: number; // 0 por defecto — se sobreescribe desde Supabase
  pillar: 'Pilar 1 — Core' | 'Pilar 2 — Alto crecimiento' | 'Pilar 3 — Defensivo y real assets';
}

export const PORTFOLIO_INSTRUMENTS: Record<string, PortfolioInstrumentMeta> = {
  IS3Q: { ticker: 'IS3Q', name: 'iShares MSCI World Quality UCITS ETF', category: 'ETF RV Factor', targetPct: 0, pillar: 'Pilar 1 — Core' },
  IUSN: { ticker: 'IUSN', name: 'iShares MSCI World Small Cap UCITS ETF', category: 'ETF RV Factor', targetPct: 0, pillar: 'Pilar 1 — Core' },
  IS3R: { ticker: 'IS3R', name: 'Edge World Momentum ETF', category: 'ETF RV Factor', targetPct: 0, pillar: 'Pilar 1 — Core' },
  IS3N: { ticker: 'IS3N', name: 'iShares Core MSCI EM IMI UCITS ETF', category: 'ETF RV Emergentes', targetPct: 0, pillar: 'Pilar 1 — Core' },
  VVSM: { ticker: 'VVSM', name: 'VanEck Semiconductor UCITS ETF', category: 'ETF RV Sectorial', targetPct: 0, pillar: 'Pilar 2 — Alto crecimiento' },
  GOAI: { ticker: 'GOAI', name: 'Amundi MSCI Robotics & AI UCITS ETF', category: 'ETF RV Temático', targetPct: 0, pillar: 'Pilar 2 — Alto crecimiento' },
  URNU: { ticker: 'URNU', name: 'Uranium ETF', category: 'ETF RV Sectorial', targetPct: 0, pillar: 'Pilar 2 — Alto crecimiento' },
  IB1T: { ticker: 'IB1T', name: 'iShare BitCoin ETP', category: 'ETP Crypto', targetPct: 0, pillar: 'Pilar 2 — Alto crecimiento' },
  XDWH: { ticker: 'XDWH', name: 'MSCI World Health Care ETF', category: 'ETF RV Sectorial', targetPct: 0, pillar: 'Pilar 3 — Defensivo y real assets' },
  XDW0: { ticker: 'XDW0', name: 'MSCI World Energy ETF', category: 'ETF RV Sectorial', targetPct: 0, pillar: 'Pilar 3 — Defensivo y real assets' },
  XDWS: { ticker: 'XDWS', name: 'MSCI World Consumer Staples ETF', category: 'ETF RV Sectorial', targetPct: 0, pillar: 'Pilar 3 — Defensivo y real assets' },
  CBUX: { ticker: 'CBUX', name: 'Global Infrastructure ETF', category: 'ETF RV Infraestructura', targetPct: 0, pillar: 'Pilar 3 — Defensivo y real assets' },
  XDWF: { ticker: 'XDWF', name: 'MSCI World Financials ETF', category: 'ETF RV Sectorial', targetPct: 0, pillar: 'Pilar 3 — Defensivo y real assets' },
  GLDA: { ticker: 'GLDA', name: 'Amundi Physical Gold ETC', category: 'ETC Commodity', targetPct: 0, pillar: 'Pilar 3 — Defensivo y real assets' },
  SXRA: { ticker: 'SXRA', name: 'iShares Developed Markets Property ETF', category: 'ETF REITs', targetPct: 0, pillar: 'Pilar 3 — Defensivo y real assets' },
  LIQUIDEZ: { ticker: 'LIQUIDEZ', name: 'Liquidez', category: 'Liquidez', targetPct: 0, pillar: 'Pilar 3 — Defensivo y real assets' },
};

export const CATEGORY_COLORS: Record<PortfolioCategory, string> = {
  'ETF RV Factor': '#3b82f6',
  'ETF RV Emergentes': '#06b6d4',
  'ETF RV Sectorial': '#8b5cf6',
  'ETF RV Temático': '#ec4899',
  'ETP Crypto': '#f59e0b',
  'ETF RV Infraestructura': '#10b981',
  'ETC Commodity': '#eab308',
  'ETF REITs': '#ef4444',
  'Liquidez': '#56d9f5',
};

export function getInstrumentMeta(ticker: string): PortfolioInstrumentMeta {
  return PORTFOLIO_INSTRUMENTS[ticker] ?? {
    ticker,
    name: ticker,
    category: 'ETF RV Factor' as PortfolioCategory,
    targetPct: 0,
    pillar: 'Pilar 1 — Core' as const,
  };
}
