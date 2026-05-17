export type AssetType =
  | 'Acción'
  | 'ETF'
  | 'Crypto'
  | 'Metal'
  | 'REIT'
  | 'Liquidez'
  | 'ETF RV Factor'
  | 'ETF RV Emergentes'
  | 'ETF RV Sectorial'
  | 'ETF RV Temático'
  | 'ETP Crypto'
  | 'ETF RV Infraestructura'
  | 'ETC Commodity'
  | 'ETF REITs';

export type OperationType = 'Compra' | 'Venta' | 'Liquidez';

export interface Purchase {
  id: string;
  ticker: string;
  type: AssetType;
  operation: OperationType;
  quantity: number;
  price: number;
  date: string;
  commission: number;
  currentPrice?: number | null;
}

export interface PortfolioAssetRow {
  id: string;
  ticker: string;
  nombre: string;
  tipo_activo: string;
  cantidad_total: number;
  precio_compra_avg: number;
  precio_actual: number;
  user_id: string | null;
}

export interface PositionRow {
  user_id: string;
  ticker: string;
  nombre: string;
  tipo_activo: string | null;
  cantidad_actual: number;
  precio_compra_avg: number;
  precio_actual: number;
  coste_total_estimado: number;
  valor_actual: number;
  pnl_no_realizado: number;
  rentabilidad_no_realizada: number;
  capital_comprado_bruto: number;
  capital_vendido_bruto: number;
  comisiones_totales: number;
  n_compras: number;
  n_ventas: number;
  ultima_actualizacion: string | null;
}

export interface PortfolioSummaryRow {
  user_id: string;
  coste_total: number;
  valor_invertido: number;
  liquidez: number;
  valor_total: number;
  pnl_no_realizado: number;
  capital_neto_aportado?: number;
  pnl_total_estimado: number;
  rentabilidad_total_estimada: number;
  comisiones_totales: number;
}

export interface PortfolioSnapshotRow {
  id: string;
  user_id: string;
  fecha_snapshot: string;
  valor_total: number;
  liquidez: number;
  coste_total: number;
  pnl_total: number;
  rentabilidad_total: number;
  observaciones?: string | null;
}

export interface UserPortfolio {
  name: string;
  code: string;
  purchases: Purchase[];
  liquidity: number;
  activos?: PortfolioAssetRow[];
  positions?: PositionRow[];
  summary?: PortfolioSummaryRow | null;
  snapshots?: PortfolioSnapshotRow[];
}

export const ASSET_COLORS: Record<AssetType, string> = {
  'Acción': '#10d9a0',
  'ETF': '#3b82f6',
  'Crypto': '#f59e0b',
  'Metal': '#a78bfa',
  'REIT': '#ef4444',
  'Liquidez': '#56d9f5',
  'ETF RV Factor': '#3b82f6',
  'ETF RV Emergentes': '#06b6d4',
  'ETF RV Sectorial': '#8b5cf6',
  'ETF RV Temático': '#ec4899',
  'ETP Crypto': '#f59e0b',
  'ETF RV Infraestructura': '#10b981',
  'ETC Commodity': '#eab308',
  'ETF REITs': '#ef4444',
};

export const DEFAULT_PORTFOLIOS: Record<string, UserPortfolio> = {};
